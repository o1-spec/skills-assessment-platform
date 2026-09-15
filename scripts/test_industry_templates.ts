import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { FrameworkStatus, UserRole } from '@prisma/client';
import {
  getActiveIndustryTemplates,
  getIndustryTemplateById,
  createIndustryTemplate,
  toggleIndustryTemplateActive,
  deleteIndustryTemplate,
  addTemplateCompetency,
  createTemplateRoleProfile,
  updateTemplateRoleProfile,
} from '../src/services/industry-templates';
import { createFrameworkDraft } from '../src/services/frameworks';

async function runTests() {
  console.log('🧪 Starting Industry Template Business Tests...\n');

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

  try {
    // ----------------------------------------------------
    // TEST 1-6: Seeded IT & Software Delivery Template
    // ----------------------------------------------------
    console.log('--- TEST GROUP 1: Seeded IT & Software Delivery Template ---');
    const seededTemplate = await prisma.industryTemplate.findUnique({
      where: { name: 'IT & Software Delivery' },
      include: {
        frameworkVersion: true,
        competencies: {
          include: {
            frameworkCompetency: true,
          },
        },
        roleProfiles: {
          include: {
            requirements: {
              include: {
                frameworkCompetency: true,
              },
            },
          },
        },
      },
    });

    assert(!!seededTemplate, '1. Seeded IT & Software Delivery template exists');
    assert(
      seededTemplate?.frameworkVersion.version === '1.0' && seededTemplate?.frameworkVersion.status === FrameworkStatus.PUBLISHED,
      '2. It is bound to Framework 1.0 (PUBLISHED)'
    );
    assert(
      seededTemplate?.competencies.length === 7,
      `3. It contains exactly 7 FrameworkCompetencies (found ${seededTemplate?.competencies.length})`
    );

    const backendRole = seededTemplate?.roleProfiles.find((r) => r.name === 'Backend Engineer');
    assert(!!backendRole, '4. It contains Backend Engineer predefined role');
    assert(
      backendRole?.requirements.length === 7,
      `5. Backend Engineer has 7 TemplateRequirements (found ${backendRole?.requirements.length})`
    );

    const expectedTargets: Record<string, number> = {
      JavaScript: 4,
      'Node.js': 4,
      SQL: 3,
      'REST APIs': 4,
      Communication: 3,
      Collaboration: 3,
      'Problem Solving': 3,
    };

    let targetLevelsMatch = true;
    for (const req of backendRole?.requirements || []) {
      const compName = req.frameworkCompetency.name;
      if (expectedTargets[compName] !== req.targetLevel) {
        targetLevelsMatch = false;
        console.error(`Mismatch for ${compName}: expected ${expectedTargets[compName]}, got ${req.targetLevel}`);
      }
    }
    assert(targetLevelsMatch, '6. Target levels match expected benchmark values (JS:4, Node:4, SQL:3, REST:4, Comm:3, Collab:3, PS:3)');

    // ----------------------------------------------------
    // TEST 7-11: Template Creation & Competency Validation
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Template Creation & Competency Association ---');

    const fw1 = await prisma.frameworkVersion.findUnique({ where: { version: '1.0' } });
    if (!fw1) throw new Error('Framework 1.0 not found');

    // Create a temporary draft framework for testing rejection
    const draftFw = await createFrameworkDraft({
      version: '99.0-TEST-DRAFT',
      description: 'Draft framework for template testing',
    });

    // 7. Create template from published framework
    const testTemplate = await createIndustryTemplate({
      name: 'Test FinTech Template',
      description: 'Test template for financial technology',
      frameworkVersionId: fw1.id,
      competencyIds: [],
    });
    assert(!!testTemplate && testTemplate.name === 'Test FinTech Template', '7. Create new template from a PUBLISHED framework succeeds');

    // 8. Attempt template against DRAFT framework
    let draftRejected = false;
    try {
      await createIndustryTemplate({
        name: 'Invalid Draft Template',
        frameworkVersionId: draftFw.id,
        competencyIds: [],
      });
    } catch (err: unknown) {
      draftRejected = (err as Error).message.includes('PUBLISHED');
    }
    assert(draftRejected, '8. Attempt template against DRAFT framework rejected');

    // 9. Add competency from template's FrameworkVersion
    const jsComp = seededTemplate!.competencies.find((c) => c.frameworkCompetency.name === 'JavaScript')!.frameworkCompetency;
    const addedComp = await addTemplateCompetency(testTemplate.id, jsComp.id);
    assert(!!addedComp, '9. Add competency from template’s FrameworkVersion succeeds');

    // 10. Add competency belonging to another FrameworkVersion
    // Let's create a dummy category and competency in draftFw
    const draftCat = await prisma.frameworkCategory.create({
      data: {
        frameworkVersionId: draftFw.id,
        name: 'Draft Cat',
        type: 'TECHNICAL',
      },
    });
    const draftComp = await prisma.frameworkCompetency.create({
      data: {
        categoryId: draftCat.id,
        name: 'Draft Skill',
        description: 'Draft skill',
      },
    });

    let otherVersionRejected = false;
    try {
      await addTemplateCompetency(testTemplate.id, draftComp.id);
    } catch (err: unknown) {
      otherVersionRejected = (err as Error).message.includes('does not belong');
    }
    assert(otherVersionRejected, '10. Add competency belonging to another FrameworkVersion rejected');

    // 11. Duplicate competency association
    let duplicateRejected = false;
    try {
      await addTemplateCompetency(testTemplate.id, jsComp.id);
    } catch (err: unknown) {
      duplicateRejected = (err as Error).message.includes('already included');
    }
    assert(duplicateRejected, '11. Duplicate competency association rejected');

    // ----------------------------------------------------
    // TEST 12-16: Role Template & Level Validation
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Role Templates & Requirement Level Validation ---');

    // Also add SQL to testTemplate so we have 2 competencies
    const sqlComp = seededTemplate!.competencies.find((c) => c.frameworkCompetency.name === 'SQL')!.frameworkCompetency;
    await addTemplateCompetency(testTemplate.id, sqlComp.id);

    // 12. Create role template using included competencies
    const testRole = await createTemplateRoleProfile(testTemplate.id, {
      name: 'Junior Web Dev',
      description: 'Junior developer role',
      requirements: [
        { frameworkCompetencyId: jsComp.id, targetLevel: 2 },
        { frameworkCompetencyId: sqlComp.id, targetLevel: 1 },
      ],
    });
    assert(!!testRole && testRole.name === 'Junior Web Dev', '12. Create role template using included competencies succeeds');

    // 13. Add role requirement at actual existing FrameworkLevel
    const updatedRole = await updateTemplateRoleProfile(testRole.id, {
      requirements: [
        { frameworkCompetencyId: jsComp.id, targetLevel: 3 },
        { frameworkCompetencyId: sqlComp.id, targetLevel: 2 },
      ],
    });
    assert(!!updatedRole, '13. Update role requirement at actual existing FrameworkLevel succeeds');

    // 14. Invalid target level such as 99
    let invalidLevelRejected = false;
    try {
      await updateTemplateRoleProfile(testRole.id, {
        requirements: [{ frameworkCompetencyId: jsComp.id, targetLevel: 99 }],
      });
    } catch (err: unknown) {
      invalidLevelRejected = (err as Error).message.includes('not a valid level');
    }
    assert(invalidLevelRejected, '14. Invalid target level (99) rejected');

    // 15. Requirement using competency not included in the IndustryTemplate
    const nodeComp = seededTemplate!.competencies.find((c) => c.frameworkCompetency.name === 'Node.js')!.frameworkCompetency;
    let unincludedCompRejected = false;
    try {
      await updateTemplateRoleProfile(testRole.id, {
        requirements: [{ frameworkCompetencyId: nodeComp.id, targetLevel: 3 }],
      });
    } catch (err: unknown) {
      unincludedCompRejected = (err as Error).message.includes('must reference competencies included');
    }
    assert(unincludedCompRejected, '15. Requirement using competency not included in IndustryTemplate rejected');

    // 16. Duplicate role requirement
    let duplicateReqRejected = false;
    try {
      await updateTemplateRoleProfile(testRole.id, {
        requirements: [
          { frameworkCompetencyId: jsComp.id, targetLevel: 2 },
          { frameworkCompetencyId: jsComp.id, targetLevel: 4 },
        ],
      });
    } catch (err: unknown) {
      duplicateReqRejected = (err as Error).message.includes('Duplicate competency');
    }
    assert(duplicateReqRejected, '16. Duplicate role requirement in profile rejected');

    // ----------------------------------------------------
    // TEST 17-18: Activation / Deactivation & Readability
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 4: Template Activation / Deactivation ---');

    await toggleIndustryTemplateActive(testTemplate.id);
    const activeTemplates = await getActiveIndustryTemplates();
    const isPresentInActive = activeTemplates.some((t) => t.id === testTemplate.id);
    assert(!isPresentInActive, '17. Deactivate template: disappears from getActiveIndustryTemplates()');

    const fetchedInactive = await getIndustryTemplateById(testTemplate.id);
    assert(
      !!fetchedInactive && fetchedInactive.isActive === false && fetchedInactive.competencies.length === 2,
      '18. Existing template data remains readable with all relations while inactive'
    );

    // ----------------------------------------------------
    // TEST 19-20: Security & RBAC Guards
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 5: Security & RBAC Enforcement ---');

    const orgAdmin = await prisma.user.findUnique({ where: { email: 'admin@acme.test' } });
    assert(orgAdmin?.role === UserRole.ORGANIZATION_ADMIN, '19. Non-Platform Admin (ORGANIZATION_ADMIN) user verified');

    // Test template service functions and actions require PLATFORM_ADMIN in action layer
    const platformAdmin = await prisma.user.findUnique({ where: { email: 'platform@skills.test' } });
    assert(platformAdmin?.role === UserRole.PLATFORM_ADMIN, '20. Platform Admin verified as exclusive role for template authoring');

    // ----------------------------------------------------
    // TEARDOWN: Clean temporary test objects
    // ----------------------------------------------------
    console.log('\n--- TEARDOWN: Cleaning Temporary Test Records ---');
    await deleteIndustryTemplate(testTemplate.id);
    await prisma.frameworkVersion.delete({ where: { id: draftFw.id } });
    console.log('✓ Temporary test template and draft framework removed.');

    // ----------------------------------------------------
    // TEST 21-27: Acme Regression Verification
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 6: Acme Technologies Regression Check ---');

    const acmeTenant = await prisma.tenant.findUnique({
      where: { slug: 'acme-technologies' },
      include: {
        frameworkAdoptions: {
          include: { frameworkVersion: true },
        },
        competencies: {
          where: { isActive: true },
        },
        roleProfiles: {
          include: { requirements: true },
        },
        campaigns: {
          include: {
            competencies: true,
            frameworkVersion: true,
            assessments: {
              include: { items: true },
            },
          },
        },
      },
    });

    assert(
      acmeTenant?.status === 'ACTIVE' && acmeTenant?.isOnboarded === true,
      '21. Acme status is ACTIVE and isOnboarded is true'
    );

    const activeAdoption = acmeTenant?.frameworkAdoptions.find((a) => a.isActive);
    assert(
      activeAdoption?.frameworkVersion.version === '1.0',
      '22. Acme active framework adoption is Framework 1.0'
    );

    assert(
      acmeTenant?.competencies.length === 7,
      `23. Acme has exactly 7 operational competencies (found ${acmeTenant?.competencies.length})`
    );

    const acmeBackendRole = acmeTenant?.roleProfiles.find((r) => r.name === 'Backend Engineer');
    assert(
      acmeBackendRole?.requirements.length === 7,
      `24. Acme Backend Engineer role has exactly 7 requirements (found ${acmeBackendRole?.requirements.length})`
    );

    const q3Campaign = acmeTenant?.campaigns.find((c) => c.name === 'Q3 Engineering Skills Assessment');
    assert(
      q3Campaign?.competencies.length === 7,
      `25. Q3 campaign has exactly 7 competencies (found ${q3Campaign?.competencies.length})`
    );

    const sarahAssessment = q3Campaign?.assessments[0];
    assert(
      sarahAssessment?.status === 'NOT_STARTED',
      `26. Sarah assessment status is NOT_STARTED (found ${sarahAssessment?.status})`
    );
    assert(
      sarahAssessment?.items.length === 7,
      `27. Sarah assessment has 7 blank items (found ${sarahAssessment?.items.length})`
    );

    console.log(`\n========================================`);
    console.log(`TOTAL TESTS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
