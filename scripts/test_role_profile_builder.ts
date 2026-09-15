import { prisma } from '../src/lib/db';
import { RoleProfileStatus, UserRole, CampaignScope, CampaignStatus } from '@prisma/client';
import {
  getRoleProfilesForTenant,
  getAvailableTemplateRolesForTenant,
  prefillRoleProfileFromTemplate,
  createRoleProfile,
  updateRoleProfile,
  publishRoleProfile,
  archiveRoleProfile,
  unarchiveRoleProfile,
} from '../src/services/role-profiles';
import { getActiveCompetenciesForTenant } from '../src/services/competencies';
import { getPublishedRoleProfilesForUserAssignment, updateTenantUser } from '../src/services/users';
import { getPublishedRoleProfilesForTenant, createAssessmentCampaign } from '../src/services/campaigns';
import { validateUserImportRows } from '../src/services/csv-import';
import assert from 'assert';

async function main() {
  console.log('🚀 Starting Comprehensive Role Profile Builder (OA-05) Test Suite...\n');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'acme-technologies' },
  });
  assert(tenant, 'Seed tenant acme-technologies must exist.');
  const tenantId = tenant.id;

  const createdTestRoleIds: string[] = [];

  try {
    // ==========================================
    // 1. PREFLIGHT & SEEDED BASELINE CHECK
    // ==========================================
    console.log('1. Checking Seeded Baseline...');

    // Sarah baseline
    const sarah = await prisma.user.findFirst({
      where: { email: 'staff@acme.test' },
      include: {
        assessments: {
          include: {
            items: {
              include: {
                attachments: true,
              },
            },
          },
        },
      },
    });
    assert(sarah, 'Sarah Staff must exist');
    const sarahAss = sarah.assessments.find((a) => a.status === 'NOT_STARTED') || sarah.assessments[0];
    assert(sarahAss, 'Sarah must have an assessment');
    assert.strictEqual(sarahAss.status, 'NOT_STARTED', 'Sarah assessment must be NOT_STARTED');
    assert.strictEqual(sarahAss.items.length, 7, 'Sarah assessment must have 7 items');
    const totalAttachments = sarahAss.items.reduce((acc, i) => acc + i.attachments.length, 0);
    assert.strictEqual(totalAttachments, 0, 'Sarah assessment must have 0 attachments');
    console.log('   ✅ Sarah baseline confirmed: NOT_STARTED, 7 items, 0 attachments');

    // Seeded Backend Engineer role profile check
    const seededRole = await prisma.roleProfile.findFirst({
      where: {
        tenantId,
        name: 'Backend Engineer',
      },
      include: {
        requirements: true,
      },
    });
    assert(seededRole, 'Seeded Backend Engineer role must exist');
    assert.strictEqual(seededRole.status, RoleProfileStatus.PUBLISHED, 'Backend Engineer must be PUBLISHED');
    assert.strictEqual(seededRole.isArchived, false, 'Backend Engineer must not be archived');
    assert.strictEqual(seededRole.requirements.length, 7, 'Backend Engineer must have 7 requirements');
    console.log('   ✅ Seeded Backend Engineer role confirmed intact (PUBLISHED, unarchived, 7 requirements)');

    // ==========================================
    // 2. TEMPLATE DISCOVERY & COMPATIBILITY
    // ==========================================
    console.log('\n2. Testing Industry Template Discovery & Compatibility...');

    const availableTemplates = await getAvailableTemplateRolesForTenant(tenantId);
    console.log(`   Found ${availableTemplates.length} available template role(s) for tenant`);
    assert(availableTemplates.length > 0, 'Should find at least 1 industry template role for software-co');

    const firstTemplate = availableTemplates[0];
    assert(firstTemplate.id, 'Template role must have an id');
    assert(firstTemplate.name, 'Template role must have a name');
    assert(firstTemplate.templateName, 'Template role must indicate parent template name');
    assert(firstTemplate.mappedRequirementsCount > 0, 'Template role must map to tenant competencies');
    assert(firstTemplate.requirements.length > 0, 'Template role must have mapped requirements');

    // Verify each mapped requirement references an active tenant competency and valid targetLevel
    const activeCompetencies = await getActiveCompetenciesForTenant(tenantId);
    const activeCompMap = new Map(activeCompetencies.map((c) => [c.id, c]));

    for (const req of firstTemplate.requirements) {
      assert(activeCompMap.has(req.competencyId), `Requirement competency ${req.competencyId} must exist in tenant`);
      const comp = activeCompMap.get(req.competencyId)!;
      const hasLevel = comp.levels.some((l) => l.level === req.targetLevel);
      assert(hasLevel, `Level ${req.targetLevel} must exist for competency ${comp.name}`);
    }
    console.log(`   ✅ Template "${firstTemplate.name}" strictly maps ${firstTemplate.mappedRequirementsCount} competencies via frameworkCompetencyId`);

    // Test prefillRoleProfileFromTemplate service
    const prefilledData = await prefillRoleProfileFromTemplate(tenantId, firstTemplate.id);
    assert.strictEqual(prefilledData.name, firstTemplate.name);
    assert.strictEqual(prefilledData.requirements.length, firstTemplate.requirements.length);
    console.log('   ✅ prefillRoleProfileFromTemplate returned matching pre-fill data');

    // ==========================================
    // 3. CREATE DRAFT ROLE PROFILE (FROM TEMPLATE & SCRATCH)
    // ==========================================
    console.log('\n3. Testing Draft Role Profile Creation...');

    // Create draft from prefilled template
    const createdDraftFromTemplate = await createRoleProfile(tenantId, {
      name: `Test Template Role ${Date.now()}`,
      description: 'Created from template in test',
      status: RoleProfileStatus.DRAFT,
      requirements: prefilledData.requirements,
    });
    createdTestRoleIds.push(createdDraftFromTemplate.id);

    assert.strictEqual(createdDraftFromTemplate.status, RoleProfileStatus.DRAFT);
    assert.strictEqual(createdDraftFromTemplate.isArchived, false);
    assert.strictEqual(createdDraftFromTemplate.archivedAt, null);
    assert.strictEqual(createdDraftFromTemplate.requirements.length, prefilledData.requirements.length);
    console.log('   ✅ Draft role created from template with requirements & template attribution');

    // Create draft from scratch with 2 competencies
    const sampleComp1 = activeCompetencies[0];
    const sampleComp2 = activeCompetencies[1];
    const createdScratchDraft = await createRoleProfile(tenantId, {
      name: `Test Scratch Draft ${Date.now()}`,
      description: 'Draft created from scratch',
      status: RoleProfileStatus.DRAFT,
      requirements: [
        { competencyId: sampleComp1.id, targetLevel: sampleComp1.levels[0].level },
        { competencyId: sampleComp2.id, targetLevel: sampleComp2.levels[0].level },
      ],
    });
    createdTestRoleIds.push(createdScratchDraft.id);

    assert.strictEqual(createdScratchDraft.status, RoleProfileStatus.DRAFT);
    assert.strictEqual(createdScratchDraft.requirements.length, 2);
    console.log('   ✅ Draft role created from scratch with 2 requirements');

    // ==========================================
    // 4. EDIT EXISTING DRAFT ROLE PROFILE
    // ==========================================
    console.log('\n4. Testing Editing of Draft Role Profile...');

    const updatedDraft = await updateRoleProfile(tenantId, createdScratchDraft.id, {
      name: `${createdScratchDraft.name} - Updated`,
      description: 'Updated draft description',
      requirements: [
        { competencyId: sampleComp1.id, targetLevel: sampleComp1.levels[1]?.level || sampleComp1.levels[0].level },
      ],
    });

    assert.strictEqual(updatedDraft.name, `${createdScratchDraft.name} - Updated`);
    assert.strictEqual(updatedDraft.description, 'Updated draft description');
    assert.strictEqual(updatedDraft.requirements.length, 1);
    assert.strictEqual(updatedDraft.status, RoleProfileStatus.DRAFT);
    console.log('   ✅ Draft role updated successfully with new name, description, and modified requirements');

    // ==========================================
    // 5. PUBLISH DRAFT ROLE PROFILE & VALIDATION
    // ==========================================
    console.log('\n5. Testing Publishing Draft Role Profile...');

    // Create an empty draft with 0 requirements
    const emptyDraft = await createRoleProfile(tenantId, {
      name: `Empty Draft ${Date.now()}`,
      description: 'Empty requirements',
      status: RoleProfileStatus.DRAFT,
      requirements: [],
    });
    createdTestRoleIds.push(emptyDraft.id);

    let publishFailed = false;
    try {
      await publishRoleProfile(tenantId, emptyDraft.id);
    } catch (err: unknown) {
      publishFailed = true;
      assert(err instanceof Error && err.message.includes('requires at least one competency requirement'));
    }
    assert(publishFailed, 'Publishing a role profile with 0 competencies must fail');
    console.log('   ✅ Publishing empty draft rejected with clear validation error');

    // Publish valid updated draft
    const publishedRole = await publishRoleProfile(tenantId, updatedDraft.id);
    assert.strictEqual(publishedRole.status, RoleProfileStatus.PUBLISHED);
    console.log('   ✅ Valid draft successfully published to PUBLISHED status');

    // ==========================================
    // 6. STRUCTURAL IMMUTABILITY OF PUBLISHED ROLES
    // ==========================================
    console.log('\n6. Testing Structural Immutability of Published Role Profiles...');

    let editPublishedFailed = false;
    try {
      await updateRoleProfile(tenantId, publishedRole.id, {
        name: 'Illegal Edit on Published Role',
      });
    } catch (err: unknown) {
      editPublishedFailed = true;
      assert(err instanceof Error && err.message.includes('Published role profiles cannot be modified'));
    }
    assert(editPublishedFailed, 'Editing a published role profile must fail');
    console.log('   ✅ Published role is structurally immutable — editing rejected');

    // Also verify seeded Backend Engineer cannot be edited
    let editSeededFailed = false;
    try {
      await updateRoleProfile(tenantId, seededRole.id, {
        name: 'Hacked Backend Engineer',
      });
    } catch (err: unknown) {
      editSeededFailed = true;
      assert(err instanceof Error && err.message.includes('Published role profiles cannot be modified'));
    }
    assert(editSeededFailed, 'Seeded published Backend Engineer cannot be edited');
    console.log('   ✅ Seeded Backend Engineer profile cannot be edited');

    // ==========================================
    // 7. ARCHIVING & DEPRECATING ROLE PROFILES
    // ==========================================
    console.log('\n7. Testing Archiving / Deprecating Role Profiles...');

    // Create a role, assign a user to it, then archive it
    const roleToArchive = await createRoleProfile(tenantId, {
      name: `Role to Archive ${Date.now()}`,
      status: RoleProfileStatus.PUBLISHED,
      requirements: [
        { competencyId: sampleComp1.id, targetLevel: sampleComp1.levels[0].level },
      ],
    });
    createdTestRoleIds.push(roleToArchive.id);

    // Create a dummy user assigned to this role
    const testUser = await prisma.user.create({
      data: {
        tenantId,
        email: `archive_test_${Date.now()}@example.com`,
        name: 'Archive Test User',
        passwordHash: 'test-hash',
        role: UserRole.STAFF,
        roleProfileId: roleToArchive.id,
      },
    });

    // Archive the role profile
    const archivedRole = await archiveRoleProfile(tenantId, roleToArchive.id);
    assert.strictEqual(archivedRole.isArchived, true);
    assert(archivedRole.archivedAt !== null);
    console.log('   ✅ Role profile successfully archived (isArchived=true, archivedAt set)');

    // Verify non-destructive archiving: assigned user's roleProfileId is preserved!
    const userAfterArchive = await prisma.user.findUnique({
      where: { id: testUser.id },
    });
    assert.strictEqual(userAfterArchive?.roleProfileId, roleToArchive.id);
    console.log('   ✅ Non-destructive: Assigned user roleProfileId is preserved after archiving');

    // ==========================================
    // 8. SELECTOR GUARDS & SEPARATION FOR ARCHIVED ROLES
    // ==========================================
    console.log('\n8. Testing Selector Guards for Archived Role Profiles...');

    // 8a. getPublishedRoleProfilesForUserAssignment excludes archived roles
    const assignableRoles = await getPublishedRoleProfilesForUserAssignment(tenantId);
    assert(!assignableRoles.some((r) => r.id === roleToArchive.id), 'Archived role must not appear in user assignment list');
    assert(assignableRoles.some((r) => r.id === seededRole.id), 'Active published roles must appear');
    console.log('   ✅ getPublishedRoleProfilesForUserAssignment excludes archived roles');

    // 8b. getPublishedRoleProfilesForTenant excludes archived roles
    const campaignRoles = await getPublishedRoleProfilesForTenant(tenantId);
    assert(!campaignRoles.some((r) => r.id === roleToArchive.id), 'Archived role must not appear in campaign role selector');
    assert(campaignRoles.some((r) => r.id === seededRole.id), 'Active published roles must appear in campaign selector');
    console.log('   ✅ getPublishedRoleProfilesForTenant excludes archived roles');

    // 8c. updateTenantUser rejects assigning archived role profile
    let assignArchivedUserFailed = false;
    try {
      await updateTenantUser(tenantId, sarah.id, testUser.id, {
        roleProfileId: roleToArchive.id,
      });
    } catch (err: unknown) {
      assignArchivedUserFailed = true;
      assert(err instanceof Error && (err.message.includes('published role profile') || err.message.includes('archived')));
    }
    assert(assignArchivedUserFailed, 'Assigning archived role profile to user must be rejected');
    console.log('   ✅ updateTenantUser rejects assigning archived role profiles');

    // 8d. createAssessmentCampaign rejects selecting archived role profile
    let createCampaignArchivedFailed = false;
    try {
      await createAssessmentCampaign(tenantId, {
        name: 'Invalid Archived Campaign',
        deadline: new Date(Date.now() + 86400000),
        status: CampaignStatus.DRAFT,
        scope: CampaignScope.ORGANIZATION,
        roleProfileId: roleToArchive.id,
        competencyIds: [sampleComp1.id],
        teamIds: [],
        participantIds: [],
      });
    } catch (err: unknown) {
      createCampaignArchivedFailed = true;
      assert(err instanceof Error && (err.message.includes('invalid') || err.message.includes('archived')));
    }
    assert(createCampaignArchivedFailed, 'createAssessmentCampaign must reject archived role profiles');
    console.log('   ✅ createAssessmentCampaign rejects archived role profiles');

    // 8e. CSV import validation rejects archived role profile
    const csvValidation = await validateUserImportRows(tenantId, [
      {
        name: 'CSV User',
        email: `csv_${Date.now()}@example.com`,
        role: 'STAFF',
        role_profile_name: roleToArchive.name,
        _rowNumber: 2,
      },
    ]);
    assert.strictEqual(csvValidation[0].status, 'ERROR');
    assert(csvValidation[0].errors.some((e) => e.includes('Role profile') && e.includes('not found')));
    console.log('   ✅ CSV import validation rejects assigning archived role profile');

    // ==========================================
    // 9. UNARCHIVING ROLE PROFILES
    // ==========================================
    console.log('\n9. Testing Unarchiving Role Profiles...');

    const unarchivedRole = await unarchiveRoleProfile(tenantId, roleToArchive.id);
    assert.strictEqual(unarchivedRole.isArchived, false);
    assert.strictEqual(unarchivedRole.archivedAt, null);
    console.log('   ✅ Role profile successfully unarchived');

    // Verify it is once again selectable
    const reassignableRoles = await getPublishedRoleProfilesForUserAssignment(tenantId);
    assert(reassignableRoles.some((r) => r.id === roleToArchive.id), 'Unarchived role must reappear in user assignment list');
    console.log('   ✅ Unarchived role is once again selectable for user assignments');

    // ==========================================
    // 10. LISTING & FILTERING
    // ==========================================
    console.log('\n10. Testing Listing & Filtering Queries...');

    // Re-archive for filter testing
    await archiveRoleProfile(tenantId, roleToArchive.id);

    // Active roles (unarchived)
    const activeRoles = await getRoleProfilesForTenant(tenantId, { includeArchived: false });
    assert(!activeRoles.some((r) => r.id === roleToArchive.id), 'Active roles must not include archived role');

    // Only archived roles
    const onlyArchived = await getRoleProfilesForTenant(tenantId, { onlyArchived: true });
    assert(onlyArchived.some((r) => r.id === roleToArchive.id), 'onlyArchived must include archived role');
    assert(!onlyArchived.some((r) => r.id === seededRole.id), 'onlyArchived must not include unarchived role');

    // Include archived roles
    const allRoles = await getRoleProfilesForTenant(tenantId, { includeArchived: true });
    assert(allRoles.some((r) => r.id === roleToArchive.id), 'allRoles must include archived role');
    assert(allRoles.some((r) => r.id === seededRole.id), 'allRoles must include unarchived role');

    // Verify user count and requirement count are returned
    const seededSummary = allRoles.find((r) => r.id === seededRole.id);
    assert(seededSummary, 'Seeded role must be in summary list');
    assert.strictEqual(typeof seededSummary._count.requirements, 'number');
    assert.strictEqual(typeof seededSummary._count.users, 'number');
    console.log('   ✅ Role list filtering and counts (requirements, users) confirmed accurate');

    // Clean up test user
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  } finally {
    // ==========================================
    // CLEANUP TEST ROLES ONLY
    // ==========================================
    console.log('\nCleaning up test role profiles and test users...');
    await prisma.user.deleteMany({ where: { email: { startsWith: 'archive_test_' } } });
    for (const id of createdTestRoleIds) {
      await prisma.roleRequirement.deleteMany({ where: { roleProfileId: id } });
      await prisma.roleProfile.deleteMany({ where: { id } });
    }
    console.log(`   Cleaned up ${createdTestRoleIds.length} test role profile(s) and test users.`);

    // ==========================================
    // FINAL INTEGRITY CHECK
    // ==========================================
    console.log('\nPerforming Final Integrity Check...');

    // Verify Sarah Jenkins assessment is intact
    const finalSarah = await prisma.user.findFirst({
      where: { email: 'staff@acme.test' },
      include: {
        assessments: {
          include: {
            items: {
              include: {
                attachments: true,
              },
            },
          },
        },
      },
    });
    assert(finalSarah, 'Sarah Staff must exist');
    const finalAss = finalSarah.assessments.find((a) => a.status === 'NOT_STARTED') || finalSarah.assessments[0];
    assert(finalAss, 'Sarah must have an assessment');
    assert.strictEqual(finalAss.status, 'NOT_STARTED', 'Sarah assessment must still be NOT_STARTED');
    assert.strictEqual(finalAss.items.length, 7, 'Sarah assessment must have 7 items');
    const finalAttachments = finalAss.items.reduce((acc, i) => acc + i.attachments.length, 0);
    assert.strictEqual(finalAttachments, 0, 'Sarah assessment must have 0 attachments');
    console.log('   ✅ Sarah baseline confirmed: NOT_STARTED, 7 items, 0 attachments');

    // Verify Backend Engineer role profile is still published and not archived
    const finalSeededRole = await prisma.roleProfile.findFirst({
      where: { tenant: { slug: 'acme-technologies' }, name: 'Backend Engineer' },
      include: { requirements: true },
    });
    assert(finalSeededRole, 'Backend Engineer role must exist');
    assert.strictEqual(finalSeededRole.status, RoleProfileStatus.PUBLISHED);
    assert.strictEqual(finalSeededRole.isArchived, false);
    assert.strictEqual(finalSeededRole.requirements.length, 7);
    console.log('   ✅ Seeded Backend Engineer role confirmed intact (PUBLISHED, 7 requirements)');
  }

  console.log('\n🎉 All Role Profile Builder (OA-05) tests passed successfully!\n');
}

main().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
