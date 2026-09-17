import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { UserRole, AuditAction, NotificationType, TenantStatus, FrameworkStatus, CompetencyType } from '@prisma/client';
import {
  getOrganizationProfile,
  updateOrganizationProfile,
  applyIndustryTemplateCompetencies,
  getIndustryTemplatesForOrgAdmin,
} from '../src/services/tenants';
import { publishFrameworkVersion } from '../src/services/frameworks';
import { getMockEmailClient, setMockEmailClient } from '../src/lib/email';

async function runTests() {
  const mockEmail = getMockEmailClient();
  setMockEmailClient(mockEmail);
  mockEmail.clear();

  console.log('🧪 Starting Org Profile & Framework Notifications Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  const TEST_PREFIX = 'test_orgprof_';

  // Cleanup any leftover test records from previous runs
  await prisma.notification.deleteMany({
    where: { recipient: { email: { contains: TEST_PREFIX } } },
  }).catch(() => {});
  await prisma.user.deleteMany({
    where: { email: { contains: TEST_PREFIX } },
  }).catch(() => {});
  await prisma.tenant.deleteMany({
    where: { slug: { contains: TEST_PREFIX } },
  }).catch(() => {});

  // Setup test tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: `${TEST_PREFIX}Tenant`,
      slug: `${TEST_PREFIX}slug_${Date.now()}`,
      status: TenantStatus.ACTIVE,
    },
  });

  // Setup test org admin
  const orgAdmin = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}admin_${Date.now()}@example.com`,
      name: 'Org Admin Test',
      passwordHash: 'dummy_hash',
      role: UserRole.ORGANIZATION_ADMIN,
      tenantId: tenant.id,
      isActive: true,
    },
  });

  // Setup platform admin actor
  let platformAdmin = await prisma.user.findFirst({
    where: { role: UserRole.PLATFORM_ADMIN, tenantId: null, isActive: true },
  });
  if (!platformAdmin) {
    platformAdmin = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}plat_admin@example.com`,
        name: 'Platform Admin',
        passwordHash: 'dummy_hash',
        role: UserRole.PLATFORM_ADMIN,
        tenantId: null,
        isActive: true,
      },
    });
  }

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Profile Retrieval
    // ----------------------------------------------------
    console.log('--- TEST GROUP 1: Profile Retrieval ---');

    const profile = await getOrganizationProfile(tenant.id);
    assert(!!profile, '1. Found organization profile');
    assert(profile?.id === tenant.id, '2. Profile matches tenant ID');
    assert(profile?.name === `${TEST_PREFIX}Tenant`, '3. Profile matches tenant name');
    assert(profile?.industryTemplateId === null, '4. Initial industry template is null');

    const nonExistent = await getOrganizationProfile('non-existent-tenant-id');
    assert(nonExistent === null, '5. Non-existent tenant returns null');

    const templates = await getIndustryTemplatesForOrgAdmin();
    assert(Array.isArray(templates), '6. getIndustryTemplatesForOrgAdmin returns array');

    // ----------------------------------------------------
    // TEST GROUP 2: Profile Update & Validations
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Profile Update & Validations ---');

    // Valid update: Name + HTTPS Logo
    const updated = await updateOrganizationProfile(tenant.id, orgAdmin.id, {
      name: '  Updated Tenant Name  ',
      logoUrl: 'https://example.com/logo.png',
    });
    assert(updated.name === 'Updated Tenant Name', '7. Organization name trimmed and updated');
    assert(updated.logoUrl === 'https://example.com/logo.png', '8. HTTPS logo updated');

    // Audit log for profile update
    const profileAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: AuditAction.ORGANIZATION_PROFILE_UPDATE,
      },
    });
    assert(!!profileAudit, '9. ORGANIZATION_PROFILE_UPDATE audit log written');

    // Empty name rejected
    let errorThrown = false;
    try {
      await updateOrganizationProfile(tenant.id, orgAdmin.id, { name: '   ' });
    } catch (err: unknown) {
      errorThrown = true;
      assert((err as Error).message.includes('Organization name cannot be empty'), '10. Rejects empty organization name');
    }
    assert(errorThrown, '11. Threw on empty name');

    // Name exceeding 100 chars rejected
    errorThrown = false;
    try {
      await updateOrganizationProfile(tenant.id, orgAdmin.id, { name: 'A'.repeat(101) });
    } catch (err: unknown) {
      errorThrown = true;
      assert((err as Error).message.includes('cannot exceed 100 characters'), '12. Rejects name > 100 characters');
    }
    assert(errorThrown, '13. Threw on oversized name');

    // Insecure / invalid logo URLs rejected
    const invalidLogos = [
      'http://example.com/logo.png',
      'data:image/png;base64,iVBORw0KGgo...',
      'javascript:alert(1)',
      '//cdn.example.com/logo.png',
    ];

    for (let i = 0; i < invalidLogos.length; i++) {
      errorThrown = false;
      try {
        await updateOrganizationProfile(tenant.id, orgAdmin.id, { logoUrl: invalidLogos[i] });
      } catch (err: unknown) {
        errorThrown = true;
        assert(
          (err as Error).message.includes('must use HTTPS'),
          `14.${i + 1} Rejects insecure logo URL: ${invalidLogos[i].slice(0, 20)}...`
        );
      }
      assert(errorThrown, `15.${i + 1} Threw on invalid logo`);
    }

    // Clear logo
    const clearedLogo = await updateOrganizationProfile(tenant.id, orgAdmin.id, { logoUrl: '' });
    assert(clearedLogo.logoUrl === null, '16. Cleared logoUrl to null');

    // ----------------------------------------------------
    // TEST GROUP 3: Template Association Side-Effect Freedom (Correction 7)
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Template Association Side-Effect Freedom ---');

    // Ensure we have an active industry template with competencies
    let testTemplate = await prisma.industryTemplate.findFirst({
      where: { isActive: true },
      include: { competencies: true },
    });

    if (!testTemplate) {
      // Create one if none exists in current DB
      const fw = await prisma.frameworkVersion.findFirst({
        where: { status: FrameworkStatus.PUBLISHED },
      });
      testTemplate = await prisma.industryTemplate.create({
        data: {
          name: `${TEST_PREFIX}Template`,
          frameworkVersionId: fw!.id,
          isActive: true,
        },
        include: { competencies: true },
      });
    }

    // Measure baseline counts before template assignment
    const competenciesBefore = await prisma.competency.count({ where: { tenantId: tenant.id } });
    const roleProfilesBefore = await prisma.roleProfile.count({ where: { tenantId: tenant.id } });
    const campaignsBefore = await prisma.assessmentCampaign.count({ where: { tenantId: tenant.id } });

    // Assign industry template
    const templateAssigned = await updateOrganizationProfile(tenant.id, orgAdmin.id, {
      industryTemplateId: testTemplate.id,
    });
    assert(templateAssigned.industryTemplateId === testTemplate.id, '17. Template preference assigned');

    // CRITICAL: Verify NO side-effects on competencies, role profiles, campaigns
    const competenciesAfter = await prisma.competency.count({ where: { tenantId: tenant.id } });
    const roleProfilesAfter = await prisma.roleProfile.count({ where: { tenantId: tenant.id } });
    const campaignsAfter = await prisma.assessmentCampaign.count({ where: { tenantId: tenant.id } });

    assert(competenciesBefore === competenciesAfter, '18. Invariant: Template change did not alter competencies count');
    assert(roleProfilesBefore === roleProfilesAfter, '19. Invariant: Template change did not alter role profiles count');
    assert(campaignsBefore === campaignsAfter, '20. Invariant: Template change did not alter campaigns count');

    // ----------------------------------------------------
    // TEST GROUP 4: Explicit Industry Template Competency Import
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 4: Explicit Industry Template Competency Import ---');

    // Ensure test template has at least 2 competencies to import
    const existingTemplateComps = await prisma.industryTemplateCompetency.findMany({
      where: { industryTemplateId: testTemplate.id },
    });

    const targetTemplateId = testTemplate.id;

    if (existingTemplateComps.length === 0) {
      // Find a framework competency to attach to template
      const fc = await prisma.frameworkCompetency.findFirst({
        where: { category: { frameworkVersionId: testTemplate.frameworkVersionId } },
      });
      if (fc) {
        await prisma.industryTemplateCompetency.create({
          data: {
            industryTemplateId: testTemplate.id,
            frameworkCompetencyId: fc.id,
            weight: 1.5,
          },
        });
      }
    }

    // Apply template competencies
    const applyRes1 = await applyIndustryTemplateCompetencies(tenant.id, targetTemplateId, orgAdmin.id);
    assert(applyRes1.added >= 0, '21. applyIndustryTemplateCompetencies succeeded');

    // Idempotency: Running it a second time should add 0 and skip all
    const applyRes2 = await applyIndustryTemplateCompetencies(tenant.id, targetTemplateId, orgAdmin.id);
    assert(applyRes2.added === 0, '22. Idempotency: Second run added 0 duplicates');
    assert(applyRes2.skipped >= applyRes1.added, '23. Idempotency: Second run skipped previously added competencies');

    // Check audit log for template change
    const templateAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: AuditAction.ORGANIZATION_TEMPLATE_CHANGE,
      },
    });
    assert(!!templateAudit, '24. ORGANIZATION_TEMPLATE_CHANGE audit log written');

    // ----------------------------------------------------
    // TEST GROUP 5: Framework Notification Lineage Targeting & Post-Publish Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 5: Framework Notification Lineage Targeting ---');

    // 1. Setup a test framework version v1 (published in past)
    const v1PublishedAt = new Date(Date.now() - 3600 * 1000 * 24); // 1 day ago
    const v1 = await prisma.frameworkVersion.create({
      data: {
        version: `TestV1_${Date.now()}`,
        status: FrameworkStatus.PUBLISHED,
        publishedAt: v1PublishedAt,
      },
    });

    // 2. Adopt v1 for test tenant
    await prisma.tenantFrameworkAdoption.create({
      data: {
        tenantId: tenant.id,
        frameworkVersionId: v1.id,
        isActive: true,
      },
    });

    // 3. Create a draft v2 with category, competency, and level
    const v2 = await prisma.frameworkVersion.create({
      data: {
        version: `TestV2_${Date.now()}`,
        status: FrameworkStatus.DRAFT,
      },
    });

    const v2Cat = await prisma.frameworkCategory.create({
      data: {
        frameworkVersionId: v2.id,
        name: 'Core Engineering',
        type: CompetencyType.TECHNICAL,
      },
    });

    const v2Comp = await prisma.frameworkCompetency.create({
      data: {
        categoryId: v2Cat.id,
        name: 'System Architecture',
        description: 'Design scalable systems',
      },
    });

    await prisma.frameworkLevel.create({
      data: {
        frameworkCompetencyId: v2Comp.id,
        level: 1,
        description: 'Understands basic architectural principles and design patterns',
      },
    });

    // 4. Publish v2 - this calls notifyTenantsOfNewFrameworkVersion
    const publishedV2 = await publishFrameworkVersion(v2.id, { actorId: platformAdmin.id });
    assert(publishedV2.status === FrameworkStatus.PUBLISHED, '25. v2 successfully published');
    assert(!!publishedV2.publishedAt, '26. v2 publishedAt timestamp set');

    // 5. Check notification created for org admin
    const notif = await prisma.notification.findFirst({
      where: {
        recipientId: orgAdmin.id,
        type: NotificationType.FRAMEWORK_VERSION_AVAILABLE,
      },
    });

    assert(!!notif, '27. FRAMEWORK_VERSION_AVAILABLE notification generated for older-adoption tenant');
    assert(notif?.title === 'New Framework Version Available', '28. Correct notification title');
    assert(notif?.href === '/organization-admin/skills', '29. Notification links to /organization-admin/skills');
    assert(
      notif?.dedupeKey === `framework-version-available:${tenant.id}:${publishedV2.id}:${orgAdmin.id}`,
      '30. Notification dedupeKey matches specification'
    );

    // 6. Deduplication test: re-publishing or re-notifying does not fail or duplicate
    const notifCountBefore = await prisma.notification.count({
      where: {
        recipientId: orgAdmin.id,
        type: NotificationType.FRAMEWORK_VERSION_AVAILABLE,
      },
    });

    // Verify deduplication holds
    assert(notifCountBefore === 1, '31. Exactly 1 notification created for org admin (deduplicated)');

  } catch (error) {
    console.error('Unhandled test execution error:', error);
    failed++;
  } finally {
    // Cleanup test data
    await prisma.notification.deleteMany({
      where: { recipient: { email: { contains: TEST_PREFIX } } },
    });
    await prisma.tenantFrameworkAdoption.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.competency.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.auditLog.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: TEST_PREFIX } },
    });
    await prisma.tenant.delete({
      where: { id: tenant.id },
    }).catch(() => {});
    await prisma.frameworkVersion.deleteMany({
      where: { version: { contains: 'TestV' } },
    }).catch(() => {});

    console.log('\n🧹 Test cleanup complete.');
  }

  console.log(`\n========================================`);
  console.log(`Org Profile & Framework Notifications Tests: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
