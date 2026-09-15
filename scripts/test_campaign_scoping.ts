import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';
import {
  CampaignScope,
  CampaignStatus,
  AssessmentStatus,
  UserRole,
  TenantStatus,
} from '@prisma/client';
import {
  createAssessmentCampaign,
  updateCampaignDraft,
  launchCampaign,
  getCampaignById,
  getCampaignMonitoringStats,
  resolveCampaignParticipants,
} from '../src/services/campaigns';


async function runTests() {
  console.log('🧪 Starting Campaign Scoping + Draft Lifecycle + Monitoring Tests...\n');

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

  // 1. Fetch Acme Tenant & Baseline Data
  const acme = await prisma.tenant.findUnique({
    where: { slug: 'acme-technologies' },
    include: {
      users: true,
      teams: true,
      competencies: true,
      roleProfiles: true,
      frameworkAdoptions: {
        where: { isActive: true },
        include: { frameworkVersion: true },
      },
      campaigns: {
        include: {
          participants: true,
          assessments: {
            include: { items: true },
          },
        },
      },
    },
  });

  if (!acme) throw new Error('Acme tenant not found');

  console.log('--- SECTION 1: Baseline Preservation & Migration Verification ---');

  const q3Campaign = acme.campaigns.find((c) => c.name === 'Q3 Engineering Skills Assessment');
  assert(!!q3Campaign, 'Acme original Q3 Engineering Skills Assessment exists');
  assert(q3Campaign?.scope === CampaignScope.INDIVIDUAL, 'Q3 Campaign backfilled with INDIVIDUAL scope');
  assert(q3Campaign?.status === CampaignStatus.ACTIVE, 'Q3 Campaign remains ACTIVE');

  const sarah = acme.users.find((u) => u.email === 'staff@acme.test')!;
  assert(!!sarah, 'Sarah Jenkins (staff@acme.test) exists');

  const sarahAssessment = q3Campaign?.assessments.find((a) => a.userId === sarah.id);
  assert(!!sarahAssessment, 'Sarah Jenkins has an assessment in Q3 campaign');
  assert(
    sarahAssessment?.status === AssessmentStatus.NOT_STARTED,
    'Sarah Jenkins assessment is NOT_STARTED'
  );
  assert(
    sarahAssessment?.items.length === 7,
    `Sarah Jenkins assessment has 7 items (found: ${sarahAssessment?.items.length})`
  );

  const activeAdoption = acme.frameworkAdoptions[0];
  assert(!!activeAdoption, 'Acme has an active Framework Adoption (v1.0.0)');

  // Competency IDs to use in test campaigns
  const compIds = acme.competencies.slice(0, 3).map((c) => c.id);
  assert(compIds.length >= 2, 'Acme has at least 2 active competencies for testing');

  // Backend Engineering Team
  const backendTeam = acme.teams.find((t) => t.name === 'Backend Engineering');
  assert(!!backendTeam, 'Acme has Backend Engineering team');

  // Create a foreign tenant for cross-tenant boundary verification
  const foreignTenant = await prisma.tenant.create({
    data: {
      name: 'Foreign Org',
      slug: `foreign-org-${Date.now()}`,
      status: TenantStatus.ACTIVE,
      isOnboarded: true,
      seatLimit: 10,
    },
  });

  // Track created campaign IDs for cleanup
  const cleanupCampaignIds: string[] = [];
  const cleanupUserIds: string[] = [];
  const cleanupTeamIds: string[] = [];

  try {
    console.log('\n--- SECTION 2: Draft Lifecycle & Assessment Non-Generation ---');

    // 2.1 Create a DRAFT campaign with INDIVIDUAL scope
    const draftCampaign = await createAssessmentCampaign(acme.id, {
      name: 'Draft Test Campaign',
      description: 'Testing draft state lifecycle',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      requiresCorroboration: true,
      scope: CampaignScope.INDIVIDUAL,
      participantIds: [sarah.id],
      competencyIds: compIds,
      status: CampaignStatus.DRAFT,
    });
    cleanupCampaignIds.push(draftCampaign.id);

    assert(draftCampaign.status === CampaignStatus.DRAFT, 'Created campaign is in DRAFT status');
    assert(draftCampaign.scope === CampaignScope.INDIVIDUAL, 'Draft campaign scope is INDIVIDUAL');

    // Verify 0 assessments exist in database for draft campaign
    const draftAssessments = await prisma.assessment.findMany({
      where: { campaignId: draftCampaign.id },
    });
    assert(
      draftAssessments.length === 0,
      `Draft campaign has exactly 0 assessments generated (found: ${draftAssessments.length})`
    );

    // 2.2 Update the DRAFT campaign
    const updatedDraft = await updateCampaignDraft(acme.id, draftCampaign.id, {
      name: 'Updated Draft Test Campaign',
      description: 'Updated draft description',
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      requiresCorroboration: false,
      scope: CampaignScope.TEAM,
      teamIds: [backendTeam!.id],
      competencyIds: [compIds[0]],
      participantIds: [],
    });

    assert(updatedDraft.name === 'Updated Draft Test Campaign', 'Draft name updated successfully');
    assert(updatedDraft.scope === CampaignScope.TEAM, 'Draft scope updated to TEAM');
    assert(updatedDraft.requiresCorroboration === false, 'Draft requiresCorroboration updated to false');

    // Verify CampaignTeam was linked
    const linkedTeams = await prisma.campaignTeam.findMany({
      where: { campaignId: draftCampaign.id },
    });
    assert(linkedTeams.length === 1 && linkedTeams[0].teamId === backendTeam!.id, 'CampaignTeam record linked');

    // Verify still 0 assessments
    const postUpdateAssessments = await prisma.assessment.findMany({
      where: { campaignId: draftCampaign.id },
    });
    assert(postUpdateAssessments.length === 0, 'Zero assessments exist after draft update');

    // 2.3 Launch the DRAFT campaign
    const launched = await launchCampaign(acme.id, draftCampaign.id);
    assert(launched.status === CampaignStatus.ACTIVE, 'Campaign transitioned from DRAFT to ACTIVE');
    assert(
      launched.frameworkVersionId === activeAdoption.frameworkVersionId,
      'Active framework version bound to campaign upon launch'
    );

    // Verify participants were snapshotted and assessments created
    const postLaunchParticipants = await prisma.campaignParticipant.findMany({
      where: { campaignId: draftCampaign.id },
    });
    const postLaunchAssessments = await prisma.assessment.findMany({
      where: { campaignId: draftCampaign.id },
      include: { items: true },
    });

    assert(postLaunchParticipants.length > 0, `Participants snapshotted on launch (count: ${postLaunchParticipants.length})`);
    assert(
      postLaunchAssessments.length === postLaunchParticipants.length,
      `Assessments generated match participant count (${postLaunchAssessments.length} === ${postLaunchParticipants.length})`
    );
    assert(
      postLaunchAssessments.every((a) => a.items.length === 1),
      'Each assessment contains items for the 1 selected competency'
    );

    // 2.4 Verify Immutability of ACTIVE campaign
    let updateActiveFailed = false;
    try {
      await updateCampaignDraft(acme.id, draftCampaign.id, {
        name: 'Should Not Allow Edit',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        competencyIds: compIds,
        scope: CampaignScope.INDIVIDUAL,
      });
    } catch {
      updateActiveFailed = true;
    }
    assert(updateActiveFailed, 'Editing an ACTIVE campaign is rejected with error');

    let reLaunchFailed = false;
    try {
      await launchCampaign(acme.id, draftCampaign.id);
    } catch {
      reLaunchFailed = true;
    }
    assert(reLaunchFailed, 'Re-launching an already ACTIVE campaign is rejected with error');

    console.log('\n--- SECTION 3: Scope Scenarios & Role Filtering ---');

    // 3.1 Organization-Wide Scope
    // Create an extra staff member and an inactive staff member to test filtering
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);
    const extraStaff = await prisma.user.create({
      data: {
        name: 'Active Extra Staff',
        email: `extra-staff-${Date.now()}@acme.test`,
        passwordHash,
        role: UserRole.STAFF,
        tenantId: acme.id,
        isActive: true,
      },
    });
    cleanupUserIds.push(extraStaff.id);

    const inactiveStaff = await prisma.user.create({
      data: {
        name: 'Inactive Staff Member',
        email: `inactive-staff-${Date.now()}@acme.test`,
        passwordHash,
        role: UserRole.STAFF,
        tenantId: acme.id,
        isActive: false,
      },
    });
    cleanupUserIds.push(inactiveStaff.id);

    // Resolve participants for ORGANIZATION scope
    const resolvedOrgUsers = await resolveCampaignParticipants(acme.id, CampaignScope.ORGANIZATION);
    assert(
      resolvedOrgUsers.includes(sarah.id),
      'ORGANIZATION scope includes active staff Sarah'
    );
    assert(
      resolvedOrgUsers.includes(extraStaff.id),
      'ORGANIZATION scope includes active extra staff'
    );
    assert(
      !resolvedOrgUsers.includes(inactiveStaff.id),
      'ORGANIZATION scope excludes inactive staff member'
    );

    const acmeAdmin = acme.users.find((u) => u.role === UserRole.ORGANIZATION_ADMIN)!;
    const acmeManager = acme.users.find((u) => u.role === UserRole.MANAGER)!;
    assert(
      !resolvedOrgUsers.includes(acmeAdmin.id),
      'ORGANIZATION scope excludes ORGANIZATION_ADMIN'
    );
    assert(
      !resolvedOrgUsers.includes(acmeManager.id),
      'ORGANIZATION scope excludes MANAGER'
    );

    // Launch an ORGANIZATION-scoped campaign directly
    const orgCampaign = await createAssessmentCampaign(acme.id, {
      name: 'Org-Wide Campaign Test',
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      scope: CampaignScope.ORGANIZATION,
      competencyIds: compIds,
      status: CampaignStatus.ACTIVE,
    });
    cleanupCampaignIds.push(orgCampaign.id);

    const orgParticipants = await prisma.campaignParticipant.findMany({
      where: { campaignId: orgCampaign.id },
    });
    assert(
      orgParticipants.length === resolvedOrgUsers.length,
      `Org-wide campaign enrolled all resolved active staff (${orgParticipants.length} === ${resolvedOrgUsers.length})`
    );

    // 3.2 Team-Scoped Resolution and Manager Exclusion
    // Put a manager and staff in a test team
    const testTeam = await prisma.team.create({
      data: {
        name: `Test Team Scoping ${Date.now()}`,
        tenantId: acme.id,
        isActive: true,
      },
    });
    cleanupTeamIds.push(testTeam.id);

    // Add extraStaff (STAFF) and acmeManager (MANAGER) to testTeam
    await prisma.teamMembership.createMany({
      data: [
        { teamId: testTeam.id, userId: extraStaff.id },
        { teamId: testTeam.id, userId: acmeManager.id },
      ],
    });

    const resolvedTeamUsers = await resolveCampaignParticipants(acme.id, CampaignScope.TEAM, {
      teamIds: [testTeam.id],
    });

    assert(
      resolvedTeamUsers.includes(extraStaff.id),
      'TEAM scope includes active STAFF member of the team'
    );
    assert(
      !resolvedTeamUsers.includes(acmeManager.id),
      'TEAM scope strictly EXCLUDES MANAGER member of the team'
    );

    console.log('\n--- SECTION 4: Participant Snapshot Immutability Rule ---');

    // Launch a TEAM-scoped campaign on testTeam
    const teamCampaign = await createAssessmentCampaign(acme.id, {
      name: 'Team Immutability Campaign',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      scope: CampaignScope.TEAM,
      teamIds: [testTeam.id],
      competencyIds: compIds,
      status: CampaignStatus.ACTIVE,
    });
    cleanupCampaignIds.push(teamCampaign.id);

    const snapshotBefore = await prisma.campaignParticipant.findMany({
      where: { campaignId: teamCampaign.id },
    });
    assert(snapshotBefore.length === 1 && snapshotBefore[0].userId === extraStaff.id, 'Campaign snapshotted 1 participant');

    // Now add another staff member to testTeam AFTER launch
    const lateStaff = await prisma.user.create({
      data: {
        name: 'Late Joining Staff',
        email: `late-staff-${Date.now()}@acme.test`,
        passwordHash,
        role: UserRole.STAFF,
        tenantId: acme.id,
        isActive: true,
      },
    });
    cleanupUserIds.push(lateStaff.id);

    await prisma.teamMembership.create({
      data: { teamId: testTeam.id, userId: lateStaff.id },
    });

    // Verify campaign participants have NOT changed!
    const snapshotAfterAdd = await prisma.campaignParticipant.findMany({
      where: { campaignId: teamCampaign.id },
    });
    assert(
      snapshotAfterAdd.length === 1,
      'Adding user to team post-launch does NOT alter campaign participants snapshot (remains 1)'
    );

    // Remove original staff member from testTeam in organization structure
    await prisma.teamMembership.deleteMany({
      where: { teamId: testTeam.id, userId: extraStaff.id },
    });

    // Verify campaign participants still NOT changed!
    const snapshotAfterRemove = await prisma.campaignParticipant.findMany({
      where: { campaignId: teamCampaign.id },
    });
    assert(
      snapshotAfterRemove.length === 1,
      'Removing user from team post-launch does NOT alter campaign participants snapshot (remains 1)'
    );

    console.log('\n--- SECTION 5: Campaign Monitoring Dashboard Metrics (OA-08) ---');

    // Test monitoring stats calculation
    // Create an active campaign and simulate deadline expiring in the past
    const pastCampaign = await createAssessmentCampaign(acme.id, {
      name: 'Overdue Test Campaign',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days in future initially
      scope: CampaignScope.INDIVIDUAL,
      participantIds: [extraStaff.id, lateStaff.id],
      competencyIds: compIds,
      status: CampaignStatus.ACTIVE,
    });
    cleanupCampaignIds.push(pastCampaign.id);

    // Update deadline directly in database to 5 days in the past to test overdue monitoring logic
    await prisma.assessmentCampaign.update({
      where: { id: pastCampaign.id },
      data: { deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    });

    // Both assessments initially NOT_STARTED, deadline is past -> both overdue
    let stats = await getCampaignMonitoringStats(acme.id, pastCampaign.id);
    assert(stats !== null, 'Monitoring stats computed');
    assert(stats?.totalParticipants === 2, `Total participants: 2 (got: ${stats?.totalParticipants})`);
    assert(stats?.notStarted === 2, `Not started: 2 (got: ${stats?.notStarted})`);
    assert(stats?.overdue === 2, `Overdue count: 2 when deadline is past (got: ${stats?.overdue})`);
    assert(stats?.completionPercentage === 0, 'Completion percentage is 0%');

    // Complete one assessment
    const extraStaffAssessment = await prisma.assessment.findFirst({
      where: { campaignId: pastCampaign.id, userId: extraStaff.id },
    });
    await prisma.assessment.update({
      where: { id: extraStaffAssessment!.id },
      data: {
        status: AssessmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    stats = await getCampaignMonitoringStats(acme.id, pastCampaign.id);
    assert(stats?.completed === 1, 'Completed count updated to 1');
    assert(stats?.overdue === 1, 'Completed assessment is NOT counted as overdue (overdue count: 1)');
    assert(stats?.completionPercentage === 50, 'Completion percentage is 50%');

    const completedRecord = stats?.participants.find((p) => p.userId === extraStaff.id);
    assert(completedRecord?.isOverdue === false, 'Completed participant has isOverdue === false');
    assert(!!completedRecord?.completedAt, 'Completed participant has completedAt date');

    const pendingRecord = stats?.participants.find((p) => p.userId === lateStaff.id);
    assert(pendingRecord?.isOverdue === true, 'Incomplete participant has isOverdue === true');

    console.log('\n--- SECTION 6: Cross-Tenant Isolation ---');

    let foreignAccessFailed = false;
    try {
      const foreignCampaign = await getCampaignById(draftCampaign.id, foreignTenant.id);
      if (!foreignCampaign) foreignAccessFailed = true;
    } catch {
      foreignAccessFailed = true;
    }
    assert(foreignAccessFailed, 'Foreign tenant cannot access Acme campaign detail');

    const foreignStats = await getCampaignMonitoringStats(foreignTenant.id, draftCampaign.id);
    assert(foreignStats === null, 'Foreign tenant cannot access Acme monitoring stats');

    let foreignLaunchFailed = false;
    try {
      await launchCampaign(foreignTenant.id, draftCampaign.id);
    } catch {
      foreignLaunchFailed = true;
    }
    assert(foreignLaunchFailed, 'Foreign tenant cannot launch Acme campaign');
  } finally {
    // Clean up created resources
    console.log('\n--- Cleaning up test resources ---');
    for (const campaignId of cleanupCampaignIds) {
      await prisma.assessmentItem.deleteMany({
        where: { assessment: { campaignId } },
      });
      await prisma.assessment.deleteMany({
        where: { campaignId },
      });
      await prisma.campaignCompetency.deleteMany({
        where: { campaignId },
      });
      await prisma.campaignParticipant.deleteMany({
        where: { campaignId },
      });
      await prisma.campaignTeam.deleteMany({
        where: { campaignId },
      });
      await prisma.assessmentCampaign.deleteMany({
        where: { id: campaignId },
      });
    }

    for (const teamId of cleanupTeamIds) {
      await prisma.teamMembership.deleteMany({ where: { teamId } });
      await prisma.team.deleteMany({ where: { id: teamId } });
    }

    for (const userId of cleanupUserIds) {
      await prisma.teamMembership.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }

    await prisma.tenant.delete({ where: { id: foreignTenant.id } });
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
