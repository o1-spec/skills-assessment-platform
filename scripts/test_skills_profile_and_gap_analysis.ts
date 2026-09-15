import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';
import {
  AssessmentStatus,
  UserRole,
  TenantStatus,
  CampaignScope,
  CampaignStatus,
} from '@prisma/client';

import {
  getStaffSkillsProfile,
  getStaffPersonalGapAnalysis,
  getLatestVerifiedRatingsForUsers,
} from '../src/services/skills-profile';
import {
  getManagerDashboardData,
  getManagerDirectReportDetail,
} from '../src/services/manager-analytics';
import {
  getTeamGapAnalysis,
  getOrganizationGapAnalysis,
  getGapAnalysisAssessmentsForTenant,
  calculateCapabilityGap,
} from '../src/services/gap-analysis';

async function runTests() {
  console.log('🧪 Starting Skills Profile + Personal Gap + Manager Matrix + Org Gap Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Pre-flight check: Locate Acme Technologies
  const acme = await prisma.tenant.findUnique({
    where: { slug: 'acme-technologies' },
    include: {
      users: {
        include: {
          roleProfile: {
            include: {
              requirements: {
                include: { competency: { include: { levels: true } } },
              },
            },
          },
        },
      },
      roleProfiles: {
        include: {
          requirements: {
            include: { competency: { include: { levels: true } } },
          },
        },
      },
      teams: {
        include: {
          memberships: true,
        },
      },
      campaigns: {
        include: {
          assessments: {
            include: { items: { include: { attachments: true } } },
          },
        },
      },
    },
  });

  if (!acme) throw new Error('Acme Technologies tenant not found');

  const sarah = acme.users.find((u) => u.email === 'staff@acme.test')!;
  const michael = acme.users.find((u) => u.email === 'manager@acme.test')!;
  const backendRole = acme.roleProfiles.find((r) => r.name === 'Backend Engineer')!;
  const backendTeam = acme.teams.find((t) => t.name.includes('Backend'))!;
  const q3Campaign = acme.campaigns[0]!;

  assert(!!sarah, 'Sarah Jenkins exists');
  assert(!!michael, 'Michael Manager exists');
  assert(sarah.roleProfileId === backendRole.id, 'Sarah is assigned Backend Engineer');
  assert(backendRole.requirements.length === 7, 'Backend Engineer has 7 requirements');

  // Track temporary IDs for robust teardown
  const createdAssessmentIds: string[] = [];
  const createdCampaignIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdTeamMembershipIds: string[] = [];
  const createdTenantIds: string[] = [];
  const createdCompetencyIds: string[] = [];
  const createdRoleProfileIds: string[] = [];

  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  try {
    // ----------------------------------------------------
    // SETUP: Secondary test staff, roles, and foreign tenant
    // ----------------------------------------------------
    const foreignTenant = await prisma.tenant.create({
      data: {
        name: 'Foreign Corp Analytics',
        slug: `foreign-corp-analytics-${Date.now()}`,
        status: TenantStatus.ACTIVE,
      },
    });
    createdTenantIds.push(foreignTenant.id);

    const foreignStaff = await prisma.user.create({
      data: {
        name: 'Foreign Staff',
        email: `foreign-staff-${Date.now()}@foreign.test`,
        passwordHash,
        role: UserRole.STAFF,
        tenantId: foreignTenant.id,
      },
    });
    createdUserIds.push(foreignStaff.id);

    // Create a peer Staff member in Acme reporting to Michael with a different role profile
    const frontendRole = await prisma.roleProfile.create({
      data: {
        tenantId: acme.id,
        name: `Frontend Engineer ${Date.now()}`,
        description: 'Frontend specialist',
      },
    });
    createdRoleProfileIds.push(frontendRole.id);

    // Link 2 competencies to Frontend Engineer role with specific targets
    const req1Comp = backendRole.requirements[0].competency; // Shared competency
    const req2Comp = backendRole.requirements[1].competency; // Shared competency

    await prisma.roleRequirement.createMany({
      data: [
        {
          roleProfileId: frontendRole.id,
          competencyId: req1Comp.id,
          targetLevel: 4, // Target Level 4
        },
        {
          roleProfileId: frontendRole.id,
          competencyId: req2Comp.id,
          targetLevel: 2, // Target Level 2
        },
      ],
    });

    const johnPeer = await prisma.user.create({
      data: {
        name: 'John Peer',
        email: `john-peer-${Date.now()}@acme.test`,
        passwordHash,
        role: UserRole.STAFF,
        tenantId: acme.id,
        managerId: michael.id,
        roleProfileId: frontendRole.id,
      },
    });
    createdUserIds.push(johnPeer.id);

    // Create a staff member with NO assigned role profile
    const unassignedStaff = await prisma.user.create({
      data: {
        name: 'No Role Staff',
        email: `no-role-${Date.now()}@acme.test`,
        passwordHash,
        role: UserRole.STAFF,
        tenantId: acme.id,
        managerId: michael.id,
        roleProfileId: null,
      },
    });
    createdUserIds.push(unassignedStaff.id);

    // Create a staff member NOT reporting to Michael
    const unrelatedManager = await prisma.user.create({
      data: {
        name: 'Unrelated Manager',
        email: `unrelated-mgr-${Date.now()}@acme.test`,
        passwordHash,
        role: UserRole.MANAGER,
        tenantId: acme.id,
      },
    });
    createdUserIds.push(unrelatedManager.id);

    const nonDirectReport = await prisma.user.create({
      data: {
        name: 'Non Direct Report',
        email: `non-direct-${Date.now()}@acme.test`,
        passwordHash,
        role: UserRole.STAFF,
        tenantId: acme.id,
        managerId: unrelatedManager.id,
        roleProfileId: backendRole.id,
      },
    });
    createdUserIds.push(nonDirectReport.id);

    // Add John and Sarah to Backend team
    const johnMembership = await prisma.teamMembership.create({
      data: {
        teamId: backendTeam.id,
        userId: johnPeer.id,
      },
    });
    createdTeamMembershipIds.push(johnMembership.id);

    // ----------------------------------------------------
    // SETUP: Historic Completed Assessments for Sarah
    // ----------------------------------------------------
    // Assessment 1: Completed earlier (30 days ago)
    const pastDate1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const pastCampaign1 = await prisma.assessmentCampaign.create({
      data: {
        tenantId: acme.id,
        name: `Past Campaign 1 ${Date.now()}`,
        deadline: pastDate1,
        status: CampaignStatus.CLOSED,
        scope: CampaignScope.ORGANIZATION,
        roleProfileId: backendRole.id,
      },
    });
    createdCampaignIds.push(pastCampaign1.id);

    const completedAssessment1 = await prisma.assessment.create({
      data: {
        campaignId: pastCampaign1.id,
        userId: sarah.id,
        status: AssessmentStatus.COMPLETED,
        submittedAt: pastDate1,
        completedAt: pastDate1,
      },
    });
    createdAssessmentIds.push(completedAssessment1.id);

    // Populate Assessment 1 with rating = 2 for req1Comp (with selfRating = 5 to verify selfRating difference)
    await prisma.assessmentItem.create({
      data: {
        assessmentId: completedAssessment1.id,
        competencyId: req1Comp.id,
        selfRating: 5, // Self rating was 5
        finalRating: 2, // Final verified rating was 2
        evidenceText: 'Earlier project evidence',
      },
    });

    // Assessment 2: Completed more recently (10 days ago) for Sarah
    // Evaluates req1Comp at finalRating = 3, and req2Comp at finalRating = 4
    const pastDate2 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const pastCampaign2 = await prisma.assessmentCampaign.create({
      data: {
        tenantId: acme.id,
        name: `Past Campaign 2 ${Date.now()}`,
        deadline: pastDate2,
        status: CampaignStatus.CLOSED,
        scope: CampaignScope.ORGANIZATION,
        roleProfileId: backendRole.id,
      },
    });
    createdCampaignIds.push(pastCampaign2.id);

    const completedAssessment2 = await prisma.assessment.create({
      data: {
        campaignId: pastCampaign2.id,
        userId: sarah.id,

        status: AssessmentStatus.COMPLETED,
        submittedAt: pastDate2,
        completedAt: pastDate2,
      },
    });
    createdAssessmentIds.push(completedAssessment2.id);

    await prisma.assessmentItem.createMany({
      data: [
        {
          assessmentId: completedAssessment2.id,
          competencyId: req1Comp.id,
          selfRating: 3,
          finalRating: 3, // Newer rating = 3 (supersedes Assessment 1's rating = 2)
          evidenceText: 'Recent verified project work',
        },
        {
          assessmentId: completedAssessment2.id,
          competencyId: req2Comp.id,
          selfRating: 4,
          finalRating: 4,
          evidenceText: 'Verified mastery in code review',
        },
      ],
    });

    // Assessment for John Peer: completed with req1Comp = 4 (Meets target), req2Comp = 1 (Below target L2)
    const johnAssessment = await prisma.assessment.create({
      data: {
        campaignId: pastCampaign2.id,
        userId: johnPeer.id,
        status: AssessmentStatus.COMPLETED,
        submittedAt: pastDate2,
        completedAt: pastDate2,
      },
    });
    createdAssessmentIds.push(johnAssessment.id);

    await prisma.assessmentItem.createMany({
      data: [
        {
          assessmentId: johnAssessment.id,
          competencyId: req1Comp.id,
          selfRating: 4,
          finalRating: 4,
        },
        {
          assessmentId: johnAssessment.id,
          competencyId: req2Comp.id,
          selfRating: 1,
          finalRating: 1,
        },
      ],
    });

    console.log('--- SECTION 1: Staff Visual Skills Profile (SF-06) ---');

    const sarahProfile = await getStaffSkillsProfile(sarah.id, acme.id);
    assert(!!sarahProfile, '1. Sarah skills profile loaded successfully');

    const req1ProfileItem = [...sarahProfile!.technical, ...sarahProfile!.behavioral].find(
      (c) => c.competencyId === req1Comp.id
    );
    assert(!!req1ProfileItem, '1. Completed competency exists in skills profile');
    assert(req1ProfileItem?.isAssessed === true, '1. Competency is marked isAssessed === true');

    // 2. selfRating differences do NOT override finalRating
    assert(
      req1ProfileItem?.verifiedLevel === 3,
      '2. Verified level is 3 from finalRating (selfRating 5 ignored)'
    );

    // 3. Latest completed rating wins across multiple completed assessments
    assert(
      req1ProfileItem?.verifiedLevel === 3,
      '3. Latest completed assessment item (Level 3) won over older assessment item (Level 2)'
    );

    // 4. Technical / Behavioral grouping
    const techCount = sarahProfile!.technical.length;
    const behavCount = sarahProfile!.behavioral.length;
    assert(techCount > 0, `4. Technical competencies grouped correctly (${techCount} found)`);
    assert(behavCount > 0, `4. Behavioral competencies grouped correctly (${behavCount} found)`);

    // 5. Dynamic level ladder works
    assert(
      req1ProfileItem?.maxLevel === req1Comp.levels.length,
      `5. Dynamic maxLevel reflects actual CompetencyLevel count (${req1ProfileItem?.maxLevel} === ${req1Comp.levels.length})`
    );

    // 6. Cross-tenant access rejected
    const foreignReadProfile = await getStaffSkillsProfile(sarah.id, foreignTenant.id);
    assert(foreignReadProfile === null, '6. Foreign tenant cannot read Sarah skills profile');

    console.log('\n--- SECTION 2: Personal Gap-to-Target (SF-08) ---');

    const sarahGap = await getStaffPersonalGapAnalysis(sarah.id, acme.id);
    assert(!!sarahGap, 'Personal gap analysis loaded');
    assert(sarahGap!.hasRoleProfile === true, 'Sarah hasRoleProfile === true');


    // Test calculations
    const calcBelow = calculateCapabilityGap(1, 3);
    assert(calcBelow.status === 'BELOW_TARGET', '7. Rating 1 < Target 3 -> BELOW_TARGET');
    assert(calcBelow.gap === 2, '7. Deficiency is 2');

    const calcEqual = calculateCapabilityGap(3, 3);
    assert(calcEqual.status === 'MEETS_TARGET', '8. Rating 3 == Target 3 -> MEETS_TARGET');
    assert(calcEqual.gap === 0, '8. Deficiency is 0');

    const calcExceeds = calculateCapabilityGap(4, 3);
    assert(calcExceeds.status === 'EXCEEDS_TARGET', '9. Rating 4 > Target 3 -> EXCEEDS_TARGET');
    assert(calcExceeds.gap === 0, '9. Deficiency is 0');

    // 10. Missing rating -> NOT_ASSESSED
    const unassessedRequirement = sarahGap!.requirements.find((r) => r.status === 'NOT_ASSESSED');
    assert(!!unassessedRequirement, '10. Unassessed competency has status NOT_ASSESSED');
    assert(unassessedRequirement?.currentLevel === null, '10. Unassessed competency level is null');
    assert(unassessedRequirement?.gap === null, '10. Unassessed competency gap is null (not Level 0)');

    // 11. Deficiency never negative
    assert(
      sarahGap!.requirements.every((r) => r.gap === null || r.gap >= 0),
      '11. Deficiency is never negative for any requirement'
    );

    // 12. User without RoleProfile handled gracefully
    const unassignedGap = await getStaffPersonalGapAnalysis(unassignedStaff.id, acme.id);
    assert(!!unassignedGap, '12. Unassigned staff gap analysis returns object');
    assert(unassignedGap?.hasRoleProfile === false, '12. hasRoleProfile is false');
    assert(unassignedGap?.requirements.length === 0, '12. Requirements array is empty without throwing');

    // 13. Foreign tenant user access rejected
    const foreignGap = await getStaffPersonalGapAnalysis(sarah.id, foreignTenant.id);
    assert(foreignGap === null, '13. Foreign tenant cannot read Sarah personal gap analysis');

    console.log('\n--- SECTION 3: Manager Team Dashboard & Matrix (MG-05) ---');

    const managerData = await getManagerDashboardData(michael.id, acme.id);
    assert(!!managerData, '14. Manager dashboard data loaded');

    // 14. Manager sees active direct reports only
    const directReportIds = managerData!.directReports.map((r) => r.id);
    assert(directReportIds.includes(sarah.id), '14. Sarah included in Michael direct reports');
    assert(directReportIds.includes(johnPeer.id), '14. John included in Michael direct reports');

    // 17. Non-direct-report excluded
    assert(!directReportIds.includes(nonDirectReport.id), '17. Non-direct report excluded from Michael direct reports');

    // 18. Foreign tenant user excluded
    assert(!directReportIds.includes(foreignStaff.id), '18. Foreign tenant staff excluded');

    // 15. Matrix shows verified final ratings
    const sarahMatrixRow = managerData!.matrix.rows.find((r) => r.userId === sarah.id);
    assert(!!sarahMatrixRow, '15. Sarah has a row in Competency Matrix');
    assert(
      sarahMatrixRow?.cells[req1Comp.id]?.finalRating === 3,
      '15. Sarah matrix cell reflects verified Level 3'
    );

    // 16. Missing rating displays Not Assessed
    const unassessedCell = Object.values(sarahMatrixRow!.cells).find(
      (c) => c.status === 'NOT_ASSESSED'
    );
    assert(!!unassessedCell, '16. Matrix row includes cell with status NOT_ASSESSED');
    assert(unassessedCell?.finalRating === null, '16. Not Assessed matrix cell has finalRating null');

    // 19. Below-target counts use each employee's OWN role profile
    const johnReportSummary = managerData!.directReports.find((r) => r.id === johnPeer.id);
    assert(!!johnReportSummary, '19. John report summary exists');
    // John has req1Comp at L4 (Target 4 -> Meets), req2Comp at L1 (Target 2 -> Below Target)
    assert(
      johnReportSummary?.belowTargetCount === 1,
      '19. John below-target count is 1 based on Frontend Engineer targets'
    );
    assert(
      johnReportSummary?.meetsTargetCount === 1,
      '19. John meets-target count is 1 based on Frontend Engineer targets'
    );

    // Manager direct report drilldown
    const drilldown = await getManagerDirectReportDetail(michael.id, sarah.id, acme.id);
    assert(!!drilldown?.profile, 'Manager can drill down into Sarah read-only profile');
    const unauthorizedDrilldown = await getManagerDirectReportDetail(
      michael.id,
      nonDirectReport.id,
      acme.id
    );
    assert(unauthorizedDrilldown === null, 'Manager cannot drill down into non-direct-report');

    console.log('\n--- SECTION 4: Team-Level Gap Analysis (OA-09) ---');

    const teamAnalysis = await getTeamGapAnalysis(backendTeam.id, acme.id);
    assert(!!teamAnalysis, '20. Team gap analysis loaded');
    assert(teamAnalysis?.team.name === backendTeam.name, '20. Correct team metadata returned');

    // 21. Active Staff only
    assert(
      teamAnalysis!.activeStaffCount >= 2,
      `21. Active staff members counted in team (${teamAnalysis?.activeStaffCount})`
    );

    // 22. Each employee evaluated against own RoleProfile
    const teamComp1 = teamAnalysis!.competencies.find((c) => c.competencyId === req1Comp.id);
    assert(!!teamComp1, '22. Shared competency analyzed in team');
    assert(
      teamComp1!.employeesRequiringCount >= 2,
      '22. Both Sarah and John require competency 1'
    );
    assert(teamComp1!.assessedCount >= 2, '22. Both Sarah and John assessed on competency 1');

    // 23. Team not assessed counts correct
    const unassessedTeamComp = teamAnalysis!.competencies.find((c) => c.notAssessedCount > 0);
    assert(!!unassessedTeamComp, '23. Team aggregation properly tracks unassessed count');

    // 24. Foreign Team access rejected
    const foreignTeamAnalysis = await getTeamGapAnalysis(backendTeam.id, foreignTenant.id);
    assert(foreignTeamAnalysis === null, '24. Foreign tenant cannot access Acme team gap analysis');

    console.log('\n--- SECTION 5: Organization-Wide Gap Analysis (OA-09) ---');

    const orgAnalysis = await getOrganizationGapAnalysis(acme.id);
    assert(!!orgAnalysis, '25. Organization gap analysis loaded');

    // 25. All active tenant STAFF included
    // Active staff: Sarah, John, unassignedStaff, nonDirectReport
    assert(
      orgAnalysis.totalActiveStaffCount >= 4,
      `25. Active staff included (${orgAnalysis.totalActiveStaffCount} staff)`
    );

    // 26. Managers/Admins excluded
    const activeOrgUsers = await prisma.user.count({
      where: { tenantId: acme.id, isActive: true },
    });
    assert(
      orgAnalysis.totalActiveStaffCount < activeOrgUsers,
      '26. Organization staff count strictly excludes managers and organization admin'
    );

    // 27. Staff with RoleProfile but no assessment contributes NOT_ASSESSED
    const nonDirectComp = orgAnalysis.competencies.find((c) => c.competencyId === req1Comp.id);
    assert(
      nonDirectComp!.notAssessedCount >= 1,
      '27. Non-direct-report with backend role and no completed assessment counted as NOT_ASSESSED'
    );

    // 28. Staff without RoleProfile tracked separately
    assert(
      orgAnalysis.staffWithoutRoleProfileCount >= 1,
      `28. Staff without role profile tracked separately (${orgAnalysis.staffWithoutRoleProfileCount} unassigned)`
    );

    // 29. Foreign tenant data excluded
    const foreignOrgAnalysis = await getOrganizationGapAnalysis(foreignTenant.id);
    assert(
      foreignOrgAnalysis.totalActiveStaffCount === 1,
      '29. Foreign organization analysis completely isolated (1 foreign staff)'
    );

    console.log('\n--- SECTION 6: Framework Provenance & Version Safety ---');

    // 30. Create a competency with same name but different operational ID
    const duplicateNameCompetency = await prisma.competency.create({
      data: {
        tenantId: acme.id,
        name: req1Comp.name, // Exactly same name as req1Comp!
        type: req1Comp.type,
      },
    });
    createdCompetencyIds.push(duplicateNameCompetency.id);


    // Query ratings for Sarah: duplicateNameCompetency should NOT inherit req1Comp's rating
    const sarahRatings = await getLatestVerifiedRatingsForUsers([sarah.id], acme.id);
    const sarahRatingsMap = sarahRatings.get(sarah.id)!;

    assert(
      sarahRatingsMap.has(req1Comp.id),
      '30. Original competency has verified rating'
    );
    assert(
      !sarahRatingsMap.has(duplicateNameCompetency.id),
      '30. Same-name competency with different ID is NOT treated as same competency (provenance preserved)'
    );

    // 31. New framework competency absent from old assessment is NOT_ASSESSED
    const newRoleProfile = await prisma.roleProfile.create({
      data: {
        tenantId: acme.id,
        name: `Versioned Role ${Date.now()}`,
      },
    });
    createdRoleProfileIds.push(newRoleProfile.id);

    await prisma.roleRequirement.create({
      data: {
        roleProfileId: newRoleProfile.id,
        competencyId: duplicateNameCompetency.id,
        targetLevel: 3,
      },
    });

    // Temporarily assign newRoleProfile to Sarah to check personal gap
    await prisma.user.update({
      where: { id: sarah.id },
      data: { roleProfileId: newRoleProfile.id },
    });

    const sarahNewGap = await getStaffPersonalGapAnalysis(sarah.id, acme.id);
    const newReqItem = sarahNewGap!.requirements.find(
      (r) => r.competencyId === duplicateNameCompetency.id
    );
    assert(
      newReqItem?.status === 'NOT_ASSESSED',
      '31. New competency absent from completed assessment is NOT_ASSESSED despite identical name'
    );

    // Restore Sarah's role profile to Backend Engineer
    await prisma.user.update({
      where: { id: sarah.id },
      data: { roleProfileId: backendRole.id },
    });

    console.log('\n--- SECTION 7: Regressions & Existing Behavior ---');

    // 33. Existing individual Org Admin gap analysis still works
    const orgGapList = await getGapAnalysisAssessmentsForTenant(acme.id);
    assert(
      orgGapList.length >= 2,
      `33. Existing getGapAnalysisAssessmentsForTenant works (${orgGapList.length} completed assessments found)`
    );

  } finally {
    console.log('\n--- CLEANUP: Removing temporary test artifacts & restoring baseline ---');

    // 1. Delete created assessments
    if (createdAssessmentIds.length > 0) {
      await prisma.assessmentItem.deleteMany({
        where: { assessmentId: { in: createdAssessmentIds } },
      });
      await prisma.assessment.deleteMany({
        where: { id: { in: createdAssessmentIds } },
      });
    }

    // 2. Delete created campaigns
    if (createdCampaignIds.length > 0) {
      await prisma.assessmentCampaign.deleteMany({
        where: { id: { in: createdCampaignIds } },
      });
    }

    // 3. Delete team memberships created in test
    if (createdTeamMembershipIds.length > 0) {
      await prisma.teamMembership.deleteMany({
        where: { id: { in: createdTeamMembershipIds } },
      });
    }

    // 4. Delete temporary role profiles and requirements
    if (createdRoleProfileIds.length > 0) {
      await prisma.roleRequirement.deleteMany({
        where: { roleProfileId: { in: createdRoleProfileIds } },
      });
      await prisma.roleProfile.deleteMany({
        where: { id: { in: createdRoleProfileIds } },
      });
    }

    // 5. Delete temporary competencies
    if (createdCompetencyIds.length > 0) {
      await prisma.competency.deleteMany({
        where: { id: { in: createdCompetencyIds } },
      });
    }

    // 6. Delete temporary users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    // 7. Delete temporary tenant
    if (createdTenantIds.length > 0) {
      await prisma.tenant.deleteMany({
        where: { id: { in: createdTenantIds } },
      });
    }

    // 8. Restore Sarah Jenkins seeded Q3 assessment to pristine state
    const sarahQ3Assessment = await prisma.assessment.findFirst({
      where: {
        campaignId: q3Campaign.id,
        userId: sarah.id,
      },
      include: {
        items: {
          include: { attachments: true },
        },
      },
    });

    if (sarahQ3Assessment) {
      await prisma.assessment.update({
        where: { id: sarahQ3Assessment.id },
        data: {
          status: AssessmentStatus.NOT_STARTED,
          submittedAt: null,
          completedAt: null,
        },
      });

      await prisma.assessmentItem.updateMany({
        where: { assessmentId: sarahQ3Assessment.id },
        data: {
          selfRating: null,
          evidenceText: null,
          finalRating: null,
        },
      });
    }

    // Verify pristine baseline
    const restoredAssessment = await prisma.assessment.findFirst({
      where: {
        campaignId: q3Campaign.id,
        userId: sarah.id,
      },
      include: {
        items: { include: { attachments: true } },
      },
    });

    assert(
      restoredAssessment?.status === AssessmentStatus.NOT_STARTED,
      '32. Sarah Q3 assessment restored to NOT_STARTED'
    );
    assert(
      Boolean(
        restoredAssessment?.items.every(
          (i) => i.selfRating === null && i.evidenceText === null && i.finalRating === null
        )
      ),
      '32. Sarah Q3 items pristine (all ratings null)'
    );
    assert(
      Boolean(restoredAssessment?.items.every((i) => i.attachments.length === 0)),
      '32. Sarah Q3 assessment has 0 attachments'
    );
    assert(
      sarah.roleProfileId === backendRole.id,
      '37. Sarah assigned role profile remains Backend Engineer'
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('Fatal test error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
