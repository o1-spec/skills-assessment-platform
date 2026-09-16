import 'dotenv/config';
import { prisma } from '../src/lib/db';
import {
  AssessmentStatus,
  RoleProfileStatus,
  CompetencyType,
  UserRole,
} from '@prisma/client';
import {
  getStaffSkillsProfile,
  getStaffSkillsHistory,
  getStaffAspirationalGapAnalysis,
  getStaffPersonalGapAnalysis,
  getAspirationalTargetRolesForStaff,
} from '../src/services';

async function runStaffHistoryAndAspirationalGapTests() {
  console.log('🧪 Starting Staff History & Aspirational Gap Analysis Test Suite (PART A & B)...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // Baseline verification: Acme tenant & Sarah
  const acmeTenant = await prisma.tenant.findUnique({ where: { slug: 'acme-technologies' } });
  if (!acmeTenant) throw new Error('Acme tenant missing');

  const sarah = await prisma.user.findFirst({
    where: { email: 'staff@acme.test' },
    include: { roleProfile: true },
  });
  if (!sarah) throw new Error('Sarah user missing');

  // Verify Sarah's initial roleProfileId
  const sarahOriginalRoleProfileId = sarah.roleProfileId;

  // Create temporary foreign tenant for tenant boundary safety checks
  const foreignTenant = await prisma.tenant.create({
    data: {
      name: 'Foreign Corp Tests',
      slug: `foreign-corp-test-${Date.now()}`,
    },
  });

  const foreignStaff = await prisma.user.create({
    data: {
      name: 'Foreign Staff',
      email: `foreign.staff.${Date.now()}@foreign.test`,
      passwordHash: 'dummy',
      role: UserRole.STAFF,
      tenantId: foreignTenant.id,
    },
  });

  // Create temporary test user in Acme for isolated history testing
  const historyTestStaff = await prisma.user.create({
    data: {
      name: 'History Test Staff',
      email: `history.test.${Date.now()}@acme.test`,
      passwordHash: 'dummy',
      role: UserRole.STAFF,
      tenantId: acmeTenant.id,
      roleProfileId: sarah.roleProfileId,
    },
  });

  // Retrieve two competencies in Acme: one technical, one behavioral
  const techComp = await prisma.competency.findFirst({
    where: { tenantId: acmeTenant.id, type: CompetencyType.TECHNICAL },
    include: { levels: { orderBy: { level: 'asc' } } },
  });
  const behavComp = await prisma.competency.findFirst({
    where: { tenantId: acmeTenant.id, type: CompetencyType.BEHAVIORAL },
    include: { levels: { orderBy: { level: 'asc' } } },
  });

  if (!techComp || !behavComp) {
    throw new Error('Required competencies missing in Acme');
  }

  // Create a dedicated dummy campaign for completed assessments
  const testCampaign1 = await prisma.assessmentCampaign.create({
    data: {
      name: 'Test Q1 Completed Campaign',
      tenantId: acmeTenant.id,
      startDate: new Date('2026-01-01'),
      deadline: new Date('2026-01-31'),
    },
  });

  const testCampaign2 = await prisma.assessmentCampaign.create({
    data: {
      name: 'Test Q2 Completed Campaign',
      tenantId: acmeTenant.id,
      startDate: new Date('2026-04-01'),
      deadline: new Date('2026-04-30'),
    },
  });

  const testCampaignDraft = await prisma.assessmentCampaign.create({
    data: {
      name: 'Test In-Progress Campaign',
      tenantId: acmeTenant.id,
      startDate: new Date('2026-07-01'),
      deadline: new Date('2026-07-31'),
    },
  });

  const testCampaignSubmitted = await prisma.assessmentCampaign.create({
    data: {
      name: 'Test Submitted Campaign',
      tenantId: acmeTenant.id,
      startDate: new Date('2026-08-01'),
      deadline: new Date('2026-08-31'),
    },
  });

  try {
    console.log('--- SECTION 1: Staff Skills Historical Trends (Tests 1-13) ---');

    // Test 12: No completed history handled
    const initialHistory = await getStaffSkillsHistory(historyTestStaff.id, acmeTenant.id);
    assert(initialHistory.hasHistory === false, '12. No completed history handled (hasHistory is false)');
    assert(initialHistory.technical.length === 0, '12. Technical history is empty when no completed assessments');
    assert(initialHistory.behavioral.length === 0, '12. Behavioral history is empty when no completed assessments');

    // Create 1 Completed assessment in Q1: Tech Level 2, Behav Level 3
    const completedQ1 = await prisma.assessment.create({
      data: {
        userId: historyTestStaff.id,
        campaignId: testCampaign1.id,
        status: AssessmentStatus.COMPLETED,
        completedAt: new Date('2026-02-01T10:00:00Z'),
        items: {
          create: [
            {
              competencyId: techComp.id,
              selfRating: 4, // selfRating must NOT be used
              finalRating: 2, // finalRating MUST be used
            },
            {
              competencyId: behavComp.id,
              selfRating: 2,
              finalRating: 3,
            },
          ],
        },
      },
    });

    // Test 11: Single historical record handled
    const singleHistory = await getStaffSkillsHistory(historyTestStaff.id, acmeTenant.id);
    assert(singleHistory.hasHistory === true, '11. Single completed assessment creates history');
    assert(singleHistory.totalCompletedAssessments === 1, '11. Total completed assessments count is 1');
    const singleTech = singleHistory.technical.find((t) => t.competencyId === techComp.id);
    assert(singleTech !== undefined, '11. Technical competency present in history');
    assert(singleTech?.isSingleAssessment === true, '11. Single assessment flag is true');
    assert(singleTech?.latestRating === 2, '4. Historical rating uses finalRating (2, not draft selfRating 4)');
    assert(singleTech?.previousRating === null, '11. Single assessment previous rating is null');
    assert(singleTech?.change === 0, '11. Single assessment change is 0');

    // Create Draft assessment in Q3: must be EXCLUDED
    const draftAssessment = await prisma.assessment.create({
      data: {
        userId: historyTestStaff.id,
        campaignId: testCampaignDraft.id,
        status: AssessmentStatus.DRAFT,
        items: {
          create: [
            {
              competencyId: techComp.id,
              selfRating: 5,
              finalRating: null,
            },
          ],
        },
      },
    });

    // Create SUBMITTED assessment in separate campaign: must be EXCLUDED
    const submittedAssessment = await prisma.assessment.create({
      data: {
        userId: historyTestStaff.id,
        campaignId: testCampaignSubmitted.id,
        status: AssessmentStatus.SUBMITTED,
        items: {
          create: [
            {
              competencyId: techComp.id,
              selfRating: 4,
              finalRating: null,
            },
          ],
        },
      },
    });

    // Test 1, 2, 3: Verify draft and submitted assessments are completely excluded
    const filteredHistory = await getStaffSkillsHistory(historyTestStaff.id, acmeTenant.id);
    assert(filteredHistory.totalCompletedAssessments === 1, '1. Only COMPLETED assessments appear in history');
    const filteredTech = filteredHistory.technical.find((t) => t.competencyId === techComp.id);
    assert(filteredTech?.history.length === 1, '2. DRAFT assessment excluded from competency history');
    assert(
      !filteredTech?.history.some((h) => h.assessmentId === submittedAssessment.id),
      '3. SUBMITTED/PENDING_CORROBORATION excluded from history'
    );

    // Create 2nd Completed assessment in Q2: Tech Level 3 (+1), Behav Level 3 (0)
    const completedQ2 = await prisma.assessment.create({
      data: {
        userId: historyTestStaff.id,
        campaignId: testCampaign2.id,
        status: AssessmentStatus.COMPLETED,
        completedAt: new Date('2026-05-01T10:00:00Z'),
        items: {
          create: [
            {
              competencyId: techComp.id,
              selfRating: 3,
              finalRating: 3,
            },
            {
              competencyId: behavComp.id,
              selfRating: 3,
              finalRating: 3,
            },
          ],
        },
      },
    });

    // Test 5, 6, 7, 8, 9, 10: Multi-assessment progression
    const multiHistory = await getStaffSkillsHistory(historyTestStaff.id, acmeTenant.id);
    assert(multiHistory.totalCompletedAssessments === 2, '6. Multiple completed assessments recorded');

    const multiTech = multiHistory.technical.find((t) => t.competencyId === techComp.id);
    assert(multiTech !== undefined, '8. Matching uses competencyId');
    assert(multiTech?.competencyType === CompetencyType.TECHNICAL, '9. Technical competency correctly labeled');
    assert(multiTech?.isSingleAssessment === false, '6. Multiple assessments set isSingleAssessment to false');
    assert(multiTech?.latestRating === 3, '6. Most recent verified level is Level 3');
    assert(multiTech?.previousRating === 2, '6. Previous verified level is Level 2');
    assert(multiTech?.change === 1, '6. Positive change calculated correctly (+1)');

    // Test 5: Chronological ordering
    assert(
      multiTech?.history[0].assessmentId === completedQ1.id &&
        multiTech?.history[1].assessmentId === completedQ2.id,
      '5. History ordered chronologically (Q1 before Q2)'
    );

    // Test 10: Behavioral competency progression
    const multiBehav = multiHistory.behavioral.find((b) => b.competencyId === behavComp.id);
    assert(multiBehav !== undefined, '10. Behavioral competency correctly separated and labeled');
    assert(multiBehav?.competencyType === CompetencyType.BEHAVIORAL, '10. Behavioral competency type preserved');
    assert(multiBehav?.latestRating === 3, '10. Behavioral latest rating is 3');
    assert(multiBehav?.previousRating === 3, '10. Behavioral previous rating is 3');
    assert(multiBehav?.change === 0, '6. Zero change calculated correctly (No change)');

    // Test 7: Competencies do not mix
    assert(
      multiHistory.technical.every((t) => t.competencyType === CompetencyType.TECHNICAL) &&
        multiHistory.behavioral.every((b) => b.competencyType === CompetencyType.BEHAVIORAL),
      '7. Different competencies do not get mixed'
    );

    // Test 13: Foreign tenant history never leaks
    const foreignHistory = await getStaffSkillsHistory(foreignStaff.id, foreignTenant.id);
    assert(foreignHistory.hasHistory === false, '13. Foreign tenant staff has no Acme history');
    const leakCheck = await getStaffSkillsHistory(historyTestStaff.id, foreignTenant.id);
    assert(leakCheck.hasHistory === false, '13. Acme staff history never leaks to foreign tenant query');

    console.log('\n--- SECTION 2: Aspirational Role Gap Analysis (Tests 14-25) ---');

    // Create 3 role profiles in Acme:
    // 1. Published Aspirational Target Role
    // 2. Draft Role
    // 3. Archived Role
    const publishedAspirationalRole = await prisma.roleProfile.create({
      data: {
        tenantId: acmeTenant.id,
        name: `Senior Architect Target ${Date.now()}`,
        status: RoleProfileStatus.PUBLISHED,
        isArchived: false,
        requirements: {
          create: [
            {
              competencyId: techComp.id,
              targetLevel: 4, // Staff has latest rating 3 -> BELOW_TARGET (-1)
            },
            {
              competencyId: behavComp.id,
              targetLevel: 3, // Staff has latest rating 3 -> MEETS_TARGET (0)
            },
          ],
        },
      },
    });

    const draftRole = await prisma.roleProfile.create({
      data: {
        tenantId: acmeTenant.id,
        name: `Draft Role ${Date.now()}`,
        status: RoleProfileStatus.DRAFT,
        isArchived: false,
      },
    });

    const archivedRole = await prisma.roleProfile.create({
      data: {
        tenantId: acmeTenant.id,
        name: `Archived Role ${Date.now()}`,
        status: RoleProfileStatus.PUBLISHED,
        isArchived: true,
      },
    });

    // Create a role in foreign tenant
    const foreignRole = await prisma.roleProfile.create({
      data: {
        tenantId: foreignTenant.id,
        name: `Foreign Role ${Date.now()}`,
        status: RoleProfileStatus.PUBLISHED,
        isArchived: false,
      },
    });

    // Test 14: Staff can select same-tenant published role
    const aspirationalTargetRoles = await getAspirationalTargetRolesForStaff(acmeTenant.id);
    assert(
      aspirationalTargetRoles.some((r) => r.id === publishedAspirationalRole.id),
      '14. Staff can select same-tenant published role'
    );
    assert(
      !aspirationalTargetRoles.some((r) => r.id === draftRole.id),
      '15. Draft role rejected from eligible aspirational target roles'
    );
    assert(
      !aspirationalTargetRoles.some((r) => r.id === archivedRole.id),
      '16. Archived role rejected from eligible aspirational target roles'
    );
    assert(
      !aspirationalTargetRoles.some((r) => r.id === foreignRole.id),
      '17. Foreign tenant role excluded from aspirational target roles'
    );

    // Test 15 & 16 & 17 via getStaffAspirationalGapAnalysis direct invocation
    const draftGap = await getStaffAspirationalGapAnalysis(historyTestStaff.id, acmeTenant.id, draftRole.id);
    assert(draftGap === null, '15. Draft role gap analysis returns null');

    const archivedGap = await getStaffAspirationalGapAnalysis(historyTestStaff.id, acmeTenant.id, archivedRole.id);
    assert(archivedGap === null, '16. Archived role gap analysis returns null');

    const foreignGap = await getStaffAspirationalGapAnalysis(historyTestStaff.id, acmeTenant.id, foreignRole.id);
    assert(foreignGap === null, '17. Foreign tenant role gap analysis returns null');

    // Test 14 & 18: Perform aspirational gap analysis and verify User.roleProfileId is untouched
    const aspirationalAnalysis = await getStaffAspirationalGapAnalysis(
      historyTestStaff.id,
      acmeTenant.id,
      publishedAspirationalRole.id
    );
    assert(aspirationalAnalysis !== null, '14. Aspirational analysis generated successfully');

    const userAfterAnalysis = await prisma.user.findUnique({
      where: { id: historyTestStaff.id },
      select: { roleProfileId: true },
    });
    assert(
      userAfterAnalysis?.roleProfileId === sarahOriginalRoleProfileId,
      '18. Selecting aspirational role does not alter User.roleProfileId'
    );

    // Test 19: Existing verified competency rating reused
    const techReq = aspirationalAnalysis?.requirements.find((r) => r.competencyId === techComp.id);
    assert(techReq?.currentLevel === 3, '19. Existing verified competency rating reused (Level 3)');

    // Test 21: Below target calculation correct
    // Target is 4, current is 3 -> gap is 1, status is BELOW_TARGET
    assert(techReq?.targetLevel === 4, '21. Target level is 4');
    assert(techReq?.gap === 1, '21. Below target calculation correct (gap is 1)');
    assert(techReq?.status === 'BELOW_TARGET', '21. Below target status is BELOW_TARGET');

    // Test 22: Meets target calculation correct
    // Target is 3, current is 3 -> gap is 0, status is MEETS_TARGET
    const behavReq = aspirationalAnalysis?.requirements.find((r) => r.competencyId === behavComp.id);
    assert(behavReq?.currentLevel === 3, '22. Verified rating is Level 3');
    assert(behavReq?.targetLevel === 3, '22. Target level is Level 3');
    assert(behavReq?.gap === 0, '22. Meets target gap is 0');
    assert(behavReq?.status === 'MEETS_TARGET', '22. Status is MEETS_TARGET');

    // Test 20: Missing competency rating -> NOT_ASSESSED
    // Add a new competency required by aspirational role that staff has never been assessed on
    const newUnassessedComp = await prisma.competency.create({
      data: {
        name: `Unassessed Skill ${Date.now()}`,
        type: CompetencyType.TECHNICAL,
        tenantId: acmeTenant.id,
      },
    });
    const aspirationalRoleWithUnassessed = await prisma.roleProfile.create({
      data: {
        tenantId: acmeTenant.id,
        name: `Lead Architect Target ${Date.now()}`,
        status: RoleProfileStatus.PUBLISHED,
        isArchived: false,
        requirements: {
          create: [
            {
              competencyId: newUnassessedComp.id,
              targetLevel: 3,
            },
            {
              competencyId: behavComp.id,
              targetLevel: 2, // Staff has Level 3 -> EXCEEDS_TARGET
            },
          ],
        },
      },
    });

    const analysisWithUnassessed = await getStaffAspirationalGapAnalysis(
      historyTestStaff.id,
      acmeTenant.id,
      aspirationalRoleWithUnassessed.id
    );
    const unassessedReq = analysisWithUnassessed?.requirements.find(
      (r) => r.competencyId === newUnassessedComp.id
    );
    assert(unassessedReq !== undefined, '20. Unassessed competency requirement present');
    assert(unassessedReq?.currentLevel === null, '20. Current level is null for unassessed competency');
    assert(unassessedReq?.gap === null, '20. Gap is null for unassessed competency');
    assert(unassessedReq?.status === 'NOT_ASSESSED', '20. Missing competency rating -> NOT_ASSESSED');

    // Test 23: Exceeds target calculation correct
    // Staff has Level 3, target is 2 -> gap is 0, status is EXCEEDS_TARGET
    const exceedsReq = analysisWithUnassessed?.requirements.find(
      (r) => r.competencyId === behavComp.id
    );
    assert(exceedsReq?.currentLevel === 3, '23. Verified level is 3');
    assert(exceedsReq?.targetLevel === 2, '23. Target level is 2');
    assert(exceedsReq?.gap === 0, '23. Exceeds target gap is 0');
    assert(exceedsReq?.status === 'EXCEEDS_TARGET', '23. Exceeds target status is EXCEEDS_TARGET');

    // Test 24: Technical and behavioral types retained
    assert(
      unassessedReq?.competencyType === CompetencyType.TECHNICAL &&
        exceedsReq?.competencyType === CompetencyType.BEHAVIORAL,
      '24. Technical and behavioral types retained in aspirational gap results'
    );

    // Test 25: Current-role comparison still works unchanged
    const currentRoleGap = await getStaffPersonalGapAnalysis(historyTestStaff.id, acmeTenant.id);
    assert(currentRoleGap !== null, '25. Current-role comparison still works unchanged');
    assert(
      currentRoleGap?.roleProfile?.id === historyTestStaff.roleProfileId,
      '25. Current-role comparison targets assigned role profile'
    );

    // Clean up temporary objects created during test
    await prisma.roleRequirement.deleteMany({
      where: {
        roleProfileId: {
          in: [
            publishedAspirationalRole.id,
            draftRole.id,
            archivedRole.id,
            foreignRole.id,
            aspirationalRoleWithUnassessed.id,
          ],
        },
      },
    });
    await prisma.roleProfile.deleteMany({
      where: {
        id: {
          in: [
            publishedAspirationalRole.id,
            draftRole.id,
            archivedRole.id,
            foreignRole.id,
            aspirationalRoleWithUnassessed.id,
          ],
        },
      },
    });
    await prisma.competency.delete({ where: { id: newUnassessedComp.id } });

    await prisma.assessmentItem.deleteMany({
      where: {
        assessmentId: {
          in: [completedQ1.id, completedQ2.id, draftAssessment.id, submittedAssessment.id],
        },
      },
    });
    await prisma.assessment.deleteMany({
      where: {
        id: {
          in: [completedQ1.id, completedQ2.id, draftAssessment.id, submittedAssessment.id],
        },
      },
    });
    await prisma.assessmentCampaign.deleteMany({
      where: {
        id: { in: [testCampaign1.id, testCampaign2.id, testCampaignDraft.id, testCampaignSubmitted.id] },
      },
    });

    await prisma.user.delete({ where: { id: historyTestStaff.id } });
    await prisma.user.delete({ where: { id: foreignStaff.id } });
    await prisma.tenant.delete({ where: { id: foreignTenant.id } });
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n========================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStaffHistoryAndAspirationalGapTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
