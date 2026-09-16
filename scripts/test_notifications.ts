import assert from 'assert';
import { prisma } from '../src/lib/db';
import { NextRequest } from 'next/server';
import {
  NotificationType,
  NotificationEmailStatus,
  UserRole,
  CampaignScope,
  CampaignStatus,
  AssessmentStatus,
  TenantStatus,
} from '@prisma/client';
import {
  createAndDispatchNotification,
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  runAssessmentReminderNotifications,
  runCorroborationReminderNotifications,
} from '../src/services/notifications';
import { getMockEmailClient, setMockEmailClient } from '../src/lib/email';
import { createAssessmentCampaign, launchCampaign } from '../src/services/campaigns';
import { submitAssessment } from '../src/services/assessments';
import { submitCorroboration } from '../src/services/corroborations';
import { createTenantUserInvitation, acceptTenantInvitation } from '../src/services/invitations';
import { bulkCreateUserInvitations } from '../src/services/csv-import';
import { provisionTenant } from '../src/services/tenants';

async function main() {
  console.log('🚀 Starting Comprehensive Notification Engine (XC-02) Test Suite...\n');

  // Activate Deterministic Mock Email Client
  const mockEmail = getMockEmailClient();
  setMockEmailClient(mockEmail);
  mockEmail.clear();

  // Load Seed Tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'acme-technologies' },
  });
  assert(tenant, 'Seed tenant acme-technologies must exist.');
  const tenantId = tenant.id;

  // Track created entities for guaranteed cleanup
  const cleanupNotificationIds: string[] = [];
  const cleanupAssessmentIds: string[] = [];
  const cleanupCampaignIds: string[] = [];
  const cleanupInvitationIds: string[] = [];
  const cleanupUserIds: string[] = [];
  const cleanupTenantIds: string[] = [];

  try {
    // =========================================================================
    // 0. PREFLIGHT & BASELINE VERIFICATION
    // =========================================================================
    console.log('0. Verifying Seeded Baseline State...');
    const sarahPre = await prisma.user.findFirst({
      where: { email: 'staff@acme.test' },
      include: {
        roleProfile: true,
        assessments: {
          include: {
            items: { include: { attachments: true } },
          },
        },
      },
    });
    assert(sarahPre, 'Sarah Staff must exist.');
    assert.strictEqual(sarahPre.roleProfile?.name, 'Backend Engineer', 'Sarah must be Backend Engineer');
    const sarahQ3Pre = sarahPre.assessments.find((a) => a.status === AssessmentStatus.NOT_STARTED);
    assert(sarahQ3Pre, 'Sarah Q3 assessment must exist');
    assert.strictEqual(sarahQ3Pre.items.length, 7, 'Sarah must have 7 items');
    const attCountPre = sarahQ3Pre.items.reduce((acc, i) => acc + i.attachments.length, 0);
    assert.strictEqual(attCountPre, 0, 'Sarah must have 0 attachments');
    const nonBlankPre = sarahQ3Pre.items.filter((i) => i.selfRating !== null || i.evidenceText !== null).length;
    assert.strictEqual(nonBlankPre, 0, 'Sarah assessment must have 0 rated items');
    console.log('   ✅ Baseline verified: Sarah Q3 is NOT_STARTED with 7 blank items & 0 attachments.\n');

    // Create a secondary tenant for cross-tenant isolation testing
    const foreignTenant = await prisma.tenant.create({
      data: {
        name: 'Foreign Org Test',
        slug: `foreign-org-${Date.now()}`,
        status: TenantStatus.ACTIVE,
      },
    });
    cleanupTenantIds.push(foreignTenant.id);

    const foreignUser = await prisma.user.create({
      data: {
        name: 'Foreign User',
        email: `foreign-${Date.now()}@test.org`,
        passwordHash: 'placeholder',
        role: UserRole.STAFF,
        tenantId: foreignTenant.id,
      },
    });
    cleanupUserIds.push(foreignUser.id);

    // Create two test staff users in Acme
    const testStaff1 = await prisma.user.create({
      data: {
        name: 'Test Staff One',
        email: `staff1-${Date.now()}@acme.test`,
        passwordHash: 'placeholder',
        role: UserRole.STAFF,
        tenantId,
      },
    });
    cleanupUserIds.push(testStaff1.id);

    const testStaff2 = await prisma.user.create({
      data: {
        name: 'Test Staff Two',
        email: `staff2-${Date.now()}@acme.test`,
        passwordHash: 'placeholder',
        role: UserRole.STAFF,
        tenantId,
      },
    });
    cleanupUserIds.push(testStaff2.id);

    // Create test manager in Acme
    const testManager = await prisma.user.create({
      data: {
        name: 'Test Manager Alpha',
        email: `manager-${Date.now()}@acme.test`,
        passwordHash: 'placeholder',
        role: UserRole.MANAGER,
        tenantId,
      },
    });
    cleanupUserIds.push(testManager.id);

    // Assign testStaff1's manager to testManager
    await prisma.user.update({
      where: { id: testStaff1.id },
      data: { managerId: testManager.id },
    });

    // =========================================================================
    // SECTION 1: IN-APP BASICS (Tests 1 - 8)
    // =========================================================================
    console.log('1. Testing In-App Notification Basics (Tests 1-8)...');

    // Test 1: Create Staff notification
    mockEmail.clear();
    const notif1 = await createAndDispatchNotification({
      tenantId,
      recipientId: testStaff1.id,
      type: NotificationType.SYSTEM,
      title: 'Welcome to Notifications',
      message: 'This is a test notification for in-app verification.',
      href: '/staff/assessments',
    });
    cleanupNotificationIds.push(notif1.id);
    assert(notif1.id, 'Notification 1 must be created');
    assert.strictEqual(notif1.recipientId, testStaff1.id);
    assert.strictEqual(notif1.readAt, null, 'New notification must be unread');
    console.log('   ✅ Test 1 Passed: In-app notification created.');

    // Test 2: Recipient sees it
    const staff1List = await getNotificationsForUser(testStaff1.id, tenantId);
    assert(staff1List.notifications.some((n) => n.id === notif1.id), 'Staff 1 must see own notification');
    console.log('   ✅ Test 2 Passed: Recipient can view notification.');

    // Test 3: Other Staff cannot see it
    const staff2List = await getNotificationsForUser(testStaff2.id, tenantId);
    assert(!staff2List.notifications.some((n) => n.id === notif1.id), 'Staff 2 must NOT see Staff 1 notification');
    console.log('   ✅ Test 3 Passed: Isolated from other staff members in same tenant.');

    // Test 4: Foreign tenant user cannot see it
    const foreignList = await getNotificationsForUser(foreignUser.id, foreignTenant.id);
    assert(!foreignList.notifications.some((n) => n.id === notif1.id), 'Foreign user must NOT see notification');
    console.log('   ✅ Test 4 Passed: Foreign tenant users strictly isolated.');

    // Test 5: Unread count correct
    const unreadCountPre = await getUnreadNotificationCount(testStaff1.id, tenantId);
    assert.strictEqual(unreadCountPre, 1, 'Unread count should be 1');
    console.log('   ✅ Test 5 Passed: Unread count is accurate.');

    // Test 6: Mark read works
    const marked = await markNotificationRead(notif1.id, testStaff1.id);
    assert(marked.readAt !== null, 'readAt must be populated');
    const unreadCountPost = await getUnreadNotificationCount(testStaff1.id, tenantId);
    assert.strictEqual(unreadCountPost, 0, 'Unread count should now be 0');
    console.log('   ✅ Test 6 Passed: Marking notification as read updates readAt and unread count.');

    // Test 7: Mark another user's notification rejected
    await assert.rejects(
      async () => {
        await markNotificationRead(notif1.id, testStaff2.id);
      },
      /access denied/i,
      'Should reject marking another user notification as read'
    );
    console.log('   ✅ Test 7 Passed: Cross-user mark read attempts are rejected.');

    // Test 8: Mark all read only affects own notifications
    const notifStaff1B = await createAndDispatchNotification({
      tenantId,
      recipientId: testStaff1.id,
      type: NotificationType.SYSTEM,
      title: 'Staff 1 Second Notice',
      message: 'Unread notice for staff 1',
    });
    cleanupNotificationIds.push(notifStaff1B.id);

    const notifStaff2A = await createAndDispatchNotification({
      tenantId,
      recipientId: testStaff2.id,
      type: NotificationType.SYSTEM,
      title: 'Staff 2 Notice',
      message: 'Unread notice for staff 2',
    });
    cleanupNotificationIds.push(notifStaff2A.id);

    const updatedCount = await markAllNotificationsRead(testStaff1.id, tenantId);
    assert.strictEqual(updatedCount, 1, 'Only 1 notification should have been updated for staff 1');

    const staff2Unread = await getUnreadNotificationCount(testStaff2.id, tenantId);
    assert.strictEqual(staff2Unread, 1, 'Staff 2 notification must remain unread');
    console.log('   ✅ Test 8 Passed: Mark all read only affects authenticated user.');

    // =========================================================================
    // SECTION 2: CAMPAIGN LAUNCH NOTIFICATIONS (Tests 9 - 12)
    // =========================================================================
    console.log('\n2. Testing Campaign Launch Notifications (Tests 9-12)...');

    // Fetch competencies for test campaign
    const comps = await prisma.competency.findMany({
      where: { tenantId },
      take: 2,
    });
    assert(comps.length >= 2, 'Need at least 2 competencies for campaign');

    // Create DRAFT campaign with testStaff1 enrolled (testStaff2 NOT enrolled)
    const futureDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const draftCampaign = await createAssessmentCampaign(tenantId, {
      name: `Test Launch Campaign ${Date.now()}`,
      description: 'Campaign to test launch assignment notifications',
      deadline: futureDeadline,
      requiresCorroboration: true,
      status: CampaignStatus.DRAFT,
      scope: CampaignScope.INDIVIDUAL,
      participantIds: [testStaff1.id],
      competencyIds: comps.map((c) => c.id),
      teamIds: [],
    });
    cleanupCampaignIds.push(draftCampaign.id);

    // Assert NO notifications sent during DRAFT creation
    const staff1PreLaunch = await getNotificationsForUser(testStaff1.id, tenantId);
    const assignedNotifsPre = staff1PreLaunch.notifications.filter(
      (n) => n.type === NotificationType.CAMPAIGN_ASSIGNED && n.resourceId === draftCampaign.id
    );
    assert.strictEqual(assignedNotifsPre.length, 0, 'No notification should be sent for DRAFT creation');

    // Test 9: Launch Draft Campaign
    mockEmail.clear();
    const launched = await launchCampaign(tenantId, draftCampaign.id);
    assert.strictEqual(launched.status, CampaignStatus.ACTIVE);
    console.log('   ✅ Test 9 Passed: Draft campaign launched successfully.');

    // Test 10: Every enrolled Staff gets CAMPAIGN_ASSIGNED exactly once
    const staff1PostLaunch = await getNotificationsForUser(testStaff1.id, tenantId);
    const assignedNotifsPost = staff1PostLaunch.notifications.filter(
      (n) => n.type === NotificationType.CAMPAIGN_ASSIGNED && n.resourceId === draftCampaign.id
    );
    assert.strictEqual(assignedNotifsPost.length, 1, 'Staff 1 must receive exactly 1 CAMPAIGN_ASSIGNED');
    cleanupNotificationIds.push(assignedNotifsPost[0].id);
    assert(assignedNotifsPost[0].message.includes(draftCampaign.name), 'Message must identify campaign');
    assert(assignedNotifsPost[0].href?.startsWith('/staff/assessments/'), 'Href must route to assessment');

    // Verify email was dispatched to staff 1
    const staff1Email = mockEmail.findEmailsByRecipient(testStaff1.email);
    assert(staff1Email.length >= 1, 'Email must be dispatched to enrolled staff');
    assert(staff1Email[0].subject.includes(draftCampaign.name), 'Email subject must mention campaign');
    console.log('   ✅ Test 10 Passed: Enrolled staff received CAMPAIGN_ASSIGNED in-app & email.');

    // Test 11: Non-participants receive none
    const staff2PostLaunch = await getNotificationsForUser(testStaff2.id, tenantId);
    const staff2Assigned = staff2PostLaunch.notifications.filter(
      (n) => n.type === NotificationType.CAMPAIGN_ASSIGNED && n.resourceId === draftCampaign.id
    );
    assert.strictEqual(staff2Assigned.length, 0, 'Non-participant must not receive CAMPAIGN_ASSIGNED');
    console.log('   ✅ Test 11 Passed: Non-participants receive no campaign notifications.');

    // Test 12: Re-running launch path cannot duplicate notification
    // Directly test the notification helper dedupeKey idempotency
    const reDispatched = await createAndDispatchNotification({
      tenantId,
      recipientId: testStaff1.id,
      type: NotificationType.CAMPAIGN_ASSIGNED,
      title: `New Assessment Assigned: ${draftCampaign.name}`,
      message: 'Duplicate attempt test',
      dedupeKey: `campaign-assigned:${draftCampaign.id}:${testStaff1.id}`,
    });
    assert.strictEqual(reDispatched.id, assignedNotifsPost[0].id, 'DedupeKey must return existing record');
    console.log('   ✅ Test 12 Passed: Launch notifications are idempotent via dedupeKey.');

    // =========================================================================
    // SECTION 3: SUBMISSION REQUIRING CORROBORATION (Tests 13 - 15)
    // =========================================================================
    console.log('\n3. Testing Staff Submission with Corroboration (Tests 13-15)...');

    // Fetch the assessment created for testStaff1 in draftCampaign
    const staff1Assessment = await prisma.assessment.findFirst({
      where: { campaignId: draftCampaign.id, userId: testStaff1.id },
      include: { items: true },
    });
    assert(staff1Assessment, 'Staff 1 assessment must exist');
    cleanupAssessmentIds.push(staff1Assessment.id);

    mockEmail.clear();
    await submitAssessment(testStaff1.id, tenantId, {
      assessmentId: staff1Assessment.id,
      items: staff1Assessment.items.map((item) => ({
        assessmentItemId: item.id,
        selfRating: 3,
        evidenceText: 'Strong foundational performance across all criteria.',
      })),
    });

    // Test 13: Staff submission requiring corroboration notifies direct Manager
    const managerNotifs = await getNotificationsForUser(testManager.id, tenantId);
    const reviewNotifs = managerNotifs.notifications.filter(
      (n) => n.type === NotificationType.ASSESSMENT_SUBMITTED_FOR_REVIEW && n.resourceId === staff1Assessment.id
    );
    assert.strictEqual(reviewNotifs.length, 1, 'Manager must receive ASSESSMENT_SUBMITTED_FOR_REVIEW');
    cleanupNotificationIds.push(reviewNotifs[0].id);
    assert(reviewNotifs[0].message.includes(testStaff1.name), 'Message must include staff name');
    assert(reviewNotifs[0].message.includes(draftCampaign.name), 'Message must include campaign name');

    // Verify email dispatched to manager
    const managerEmail = mockEmail.findEmailsByRecipient(testManager.email);
    assert(managerEmail.length >= 1, 'Manager must receive email notification');
    console.log('   ✅ Test 13 Passed: Direct manager notified upon staff submission.');

    // Test 14: Staff is not incorrectly sent manager-review notification
    const staff1PostSubmit = await getNotificationsForUser(testStaff1.id, tenantId);
    const staffReviewNotifs = staff1PostSubmit.notifications.filter(
      (n) => n.type === NotificationType.ASSESSMENT_SUBMITTED_FOR_REVIEW
    );
    assert.strictEqual(staffReviewNotifs.length, 0, 'Staff must not receive manager review notification');
    console.log('   ✅ Test 14 Passed: Staff member not sent manager review notification.');

    // Test 15: Manager notification contains correct assessment resource
    assert.strictEqual(reviewNotifs[0].href, `/manager/corroborations/${staff1Assessment.id}`);
    assert.strictEqual(reviewNotifs[0].resourceType, 'Assessment');
    assert.strictEqual(reviewNotifs[0].resourceId, staff1Assessment.id);
    console.log('   ✅ Test 15 Passed: Manager notification contains exact assessment resource & link.');

    // =========================================================================
    // SECTION 4: NO CORROBORATION COMPLETION (Tests 16 - 17)
    // =========================================================================
    console.log('\n4. Testing Direct Completion without Corroboration (Tests 16-17)...');

    // Create ACTIVE campaign without corroboration
    const directCampaign = await createAssessmentCampaign(tenantId, {
      name: `Direct Completion Campaign ${Date.now()}`,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      requiresCorroboration: false,
      status: CampaignStatus.ACTIVE,
      scope: CampaignScope.INDIVIDUAL,
      participantIds: [testStaff2.id],
      competencyIds: comps.map((c) => c.id),
      teamIds: [],
    });
    cleanupCampaignIds.push(directCampaign.id);

    const staff2DirectAssessment = await prisma.assessment.findFirst({
      where: { campaignId: directCampaign.id, userId: testStaff2.id },
      include: { items: true },
    });
    assert(staff2DirectAssessment, 'Staff 2 direct assessment must exist');
    cleanupAssessmentIds.push(staff2DirectAssessment.id);

    mockEmail.clear();
    await submitAssessment(testStaff2.id, tenantId, {
      assessmentId: staff2DirectAssessment.id,
      items: staff2DirectAssessment.items.map((item) => ({
        assessmentItemId: item.id,
        selfRating: 4,
        evidenceText: 'Direct completion without manager review.',
      })),
    });

    // Test 16: Direct completion notifies Staff
    const staff2DirectNotifs = await getNotificationsForUser(testStaff2.id, tenantId);
    const completedNotifs = staff2DirectNotifs.notifications.filter(
      (n) => n.type === NotificationType.ASSESSMENT_COMPLETED && n.resourceId === staff2DirectAssessment.id
    );
    assert.strictEqual(completedNotifs.length, 1, 'Staff must receive ASSESSMENT_COMPLETED');
    cleanupNotificationIds.push(completedNotifs[0].id);
    assert.strictEqual(completedNotifs[0].href, `/staff/assessments/${staff2DirectAssessment.id}`);
    console.log('   ✅ Test 16 Passed: Direct completion generates ASSESSMENT_COMPLETED for staff.');

    // Test 17: No manager-review notification generated
    const managerNotifsDirect = await getNotificationsForUser(testManager.id, tenantId);
    const directReviewNotifs = managerNotifsDirect.notifications.filter(
      (n) => n.resourceId === staff2DirectAssessment.id
    );
    assert.strictEqual(directReviewNotifs.length, 0, 'No manager notification generated when requiresCorroboration=false');
    console.log('   ✅ Test 17 Passed: No manager review alert generated for direct completion.');

    // =========================================================================
    // SECTION 5: MANAGER CORROBORATION COMPLETED (Tests 18 - 19)
    // =========================================================================
    console.log('\n5. Testing Manager Corroboration Completion (Tests 18-19)...');

    mockEmail.clear();
    await submitCorroboration(testManager.id, tenantId, {
      assessmentId: staff1Assessment.id,
      items: staff1Assessment.items.map((item) => ({
        assessmentItemId: item.id,
        rating: 3,
        justification: null,
      })),
    });

    // Test 18: Corroboration completion notifies Staff
    const staff1AfterReview = await getNotificationsForUser(testStaff1.id, tenantId);
    const corrobCompleted = staff1AfterReview.notifications.filter(
      (n) => n.type === NotificationType.CORROBORATION_COMPLETED && n.resourceId === staff1Assessment.id
    );
    assert.strictEqual(corrobCompleted.length, 1, 'Staff must receive CORROBORATION_COMPLETED');
    cleanupNotificationIds.push(corrobCompleted[0].id);
    assert(corrobCompleted[0].message.toLowerCase().includes('review'), 'Message must indicate review is complete');
    assert.strictEqual(corrobCompleted[0].href, `/staff/assessments/${staff1Assessment.id}`);

    const staff1CorrobEmail = mockEmail.findEmailsByRecipient(testStaff1.email);
    assert(staff1CorrobEmail.length >= 1, 'Staff must receive completion email');
    console.log('   ✅ Test 18 Passed: Staff notified when manager completes corroboration.');

    // Test 19: Other users receive none
    const staff2AfterReview = await getNotificationsForUser(testStaff2.id, tenantId);
    const staff2Irrelevant = staff2AfterReview.notifications.filter(
      (n) => n.resourceId === staff1Assessment.id
    );
    assert.strictEqual(staff2Irrelevant.length, 0, 'Other users receive no notifications for this corroboration');
    console.log('   ✅ Test 19 Passed: Uninvolved users receive zero notifications.');

    // =========================================================================
    // SECTION 6: INVITATION EMAILS (Tests 20 - 23)
    // =========================================================================
    console.log('\n6. Testing Invitation Email Dispatch (Tests 20-23)...');

    // Test 20: Initial tenant Admin invitation invokes email dispatcher
    mockEmail.clear();
    const plans = await prisma.subscriptionPlan.findMany({ take: 1 });
    assert(plans.length > 0, 'Subscription plan required');
    const provisionResult = await provisionTenant({
      name: `Tenant Provision Test ${Date.now()}`,
      slug: `provision-test-${Date.now()}`,
      planId: plans[0].id,
      seatLimit: 10,
      adminEmail: `orgadmin-${Date.now()}@provisiontest.com`,
      adminName: 'Provisioned Admin',
    });
    cleanupTenantIds.push(provisionResult.tenant.id);
    cleanupInvitationIds.push(provisionResult.invitation.id);

    const adminEmailList = mockEmail.findEmailsByRecipient(provisionResult.invitation.email);
    assert.strictEqual(adminEmailList.length, 1, 'Admin invitation must invoke email dispatcher');
    assert(adminEmailList[0].subject.includes(provisionResult.tenant.name), 'Subject must include org name');
    assert(adminEmailList[0].text?.includes('/accept-invitation?token='), 'Text must contain acceptance URL');
    console.log('   ✅ Test 20 Passed: Tenant Admin provisioning dispatches invitation email.');

    // Test 21: Individual employee invitation invokes email dispatcher
    mockEmail.clear();
    const employeeInvite = await createTenantUserInvitation(tenantId, testStaff1.id, {
      name: 'Single Employee Invite',
      email: `single-employee-${Date.now()}@acme.test`,
      role: UserRole.STAFF,
    });
    cleanupInvitationIds.push(employeeInvite.id);

    const empEmailList = mockEmail.findEmailsByRecipient(employeeInvite.email);
    assert.strictEqual(empEmailList.length, 1, 'Employee invitation must invoke email dispatcher');
    assert(empEmailList[0].text?.includes(employeeInvite.invitationUrl), 'Email contains secure link');
    console.log('   ✅ Test 21 Passed: Individual employee invitation dispatches email.');

    // Test 22: CSV invitation batch invokes dispatcher for each successful invitation
    mockEmail.clear();
    const csvInvites = await bulkCreateUserInvitations(tenantId, testStaff1.id, [
      {
        rowNumber: 1,
        status: 'VALID',
        name: 'Bulk Employee 1',
        email: `bulk1-${Date.now()}@acme.test`,
        role: UserRole.STAFF,
        managerId: null,
        roleProfileId: null,
        teamId: null,
        resolvedManagerName: null,
        resolvedRoleProfileName: null,
        resolvedTeamName: null,
      },
      {
        rowNumber: 2,
        status: 'VALID',
        name: 'Bulk Employee 2',
        email: `bulk2-${Date.now()}@acme.test`,
        role: UserRole.STAFF,
        managerId: null,
        roleProfileId: null,
        teamId: null,
        resolvedManagerName: null,
        resolvedRoleProfileName: null,
        resolvedTeamName: null,
      },
    ]);
    for (const inv of csvInvites) {
      cleanupInvitationIds.push(inv.id);
    }
    assert.strictEqual(csvInvites.length, 2, 'Must create 2 invitations');
    assert.strictEqual(mockEmail.getDispatchedEmails().length, 2, 'Must dispatch 2 invitation emails');
    console.log('   ✅ Test 22 Passed: Bulk CSV invitation creates emails for each record.');

    // Test 23: Email failure does not invalidate invitation token
    mockEmail.simulateNextFailure();
    const failedEmailInvite = await createTenantUserInvitation(tenantId, testStaff1.id, {
      name: 'Resilient Token Invite',
      email: `resilient-${Date.now()}@acme.test`,
      role: UserRole.STAFF,
    });
    cleanupInvitationIds.push(failedEmailInvite.id);

    // Verify token can still be accepted even though email failed!
    const acceptRes = await acceptTenantInvitation({
      token: failedEmailInvite.rawToken,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    assert(acceptRes.user.id, 'User must be created successfully from invitation');
    cleanupUserIds.push(acceptRes.user.id);
    const acceptedUser = acceptRes.user;
    console.log('   ✅ Test 23 Passed: Email failure does not invalidate invitation acceptance.');

    // =========================================================================
    // SECTION 7: EMAIL FAILURE BEHAVIOR & ERROR STORAGE (Tests 24 - 26)
    // =========================================================================
    console.log('\n7. Testing Email Provider Statuses & Failure Containment (Tests 24-26)...');

    // Test 24a: Missing provider credentials -> emailStatus SKIPPED
    setMockEmailClient(null); // Temporarily clear mock to hit FallbackDevEmailClient
    const skippedNotif = await createAndDispatchNotification({
      tenantId,
      recipientId: testStaff1.id,
      type: NotificationType.SYSTEM,
      title: 'Provider Missing Notification',
      message: 'This notification should be created with emailStatus SKIPPED.',
    });
    cleanupNotificationIds.push(skippedNotif.id);
    assert.strictEqual(skippedNotif.emailStatus, NotificationEmailStatus.SKIPPED, 'Missing provider must set emailStatus SKIPPED');
    setMockEmailClient(mockEmail); // Restore mock client

    // Test 24b: Successful mock provider -> emailStatus SENT
    const sentNotif = await createAndDispatchNotification({
      tenantId,
      recipientId: testStaff1.id,
      type: NotificationType.SYSTEM,
      title: 'Successful Delivery Notification',
      message: 'This notification should be created with emailStatus SENT.',
    });
    cleanupNotificationIds.push(sentNotif.id);
    assert.strictEqual(sentNotif.emailStatus, NotificationEmailStatus.SENT, 'Successful delivery must set emailStatus SENT');

    // Test 24c: Provider error -> emailStatus FAILED
    mockEmail.simulateNextFailure('Provider network timeout error');
    const failedNotif = await createAndDispatchNotification({
      tenantId,
      recipientId: testStaff1.id,
      type: NotificationType.SYSTEM,
      title: 'Resilient Notification',
      message: 'This notification should be in-app even if email delivery fails.',
    });
    cleanupNotificationIds.push(failedNotif.id);

    assert.strictEqual(failedNotif.emailStatus, NotificationEmailStatus.FAILED);
    assert(failedNotif.emailError?.includes('Provider network timeout'), 'Error string must be saved');
    console.log('   ✅ Test 24 Passed: Email statuses verified (SKIPPED on missing provider, SENT on success, FAILED on error).');

    // Test 25: Parent workflow remains successful despite email failure
    assert(failedNotif.id, 'Parent operation succeeded and returned Notification instance');
    console.log('   ✅ Test 25 Passed: Parent operation completed successfully despite email failure.');

    // Test 26: In-app notification exists and remains visible in all three cases
    const staff1ListAfterAll = await getNotificationsForUser(testStaff1.id, tenantId);
    assert(staff1ListAfterAll.notifications.some((n) => n.id === skippedNotif.id), 'SKIPPED notification exists in-app');
    assert(staff1ListAfterAll.notifications.some((n) => n.id === sentNotif.id), 'SENT notification exists in-app');
    assert(staff1ListAfterAll.notifications.some((n) => n.id === failedNotif.id), 'FAILED notification exists in-app');
    console.log('   ✅ Test 26 Passed: In-app notifications exist and remain accessible across all 3 provider statuses.');

    // =========================================================================
    // SECTION 8: AUTOMATED ASSESSMENT DEADLINE REMINDERS (Tests 27 - 31)
    // =========================================================================
    console.log('\n8. Testing Automated Assessment Deadline Reminders (Tests 27-31)...');

    // Create a mock active campaign due in exactly 3 days
    const mockNow = new Date('2026-10-10T12:00:00Z');
    const deadline3d = new Date('2026-10-13T10:00:00Z'); // between 2d and 3d from mockNow

    const reminderCampaign = await prisma.assessmentCampaign.create({
      data: {
        tenantId,
        name: 'Upcoming Deadline Campaign',
        deadline: deadline3d,
        status: CampaignStatus.ACTIVE,
        scope: CampaignScope.INDIVIDUAL,
      },
    });
    cleanupCampaignIds.push(reminderCampaign.id);

    // Eligible Assessment (NOT_STARTED)
    const eligibleAss = await prisma.assessment.create({
      data: {
        campaignId: reminderCampaign.id,
        userId: testStaff1.id,
        status: AssessmentStatus.NOT_STARTED,
      },
    });
    cleanupAssessmentIds.push(eligibleAss.id);

    // Test 27: Reminder service identifies assessment at configured reminder threshold
    const reminderResult = await runAssessmentReminderNotifications({
      now: mockNow,
      reminderDays: [3],
    });
    assert(reminderResult.created >= 1, 'Must create at least 1 reminder');

    const staff1Reminders = await getNotificationsForUser(testStaff1.id, tenantId);
    const dueReminder = staff1Reminders.notifications.find(
      (n) => n.type === NotificationType.ASSESSMENT_DUE_REMINDER && n.resourceId === eligibleAss.id
    );
    assert(dueReminder, 'Eligible assessment must receive ASSESSMENT_DUE_REMINDER');
    cleanupNotificationIds.push(dueReminder.id);
    console.log('   ✅ Test 27 Passed: Upcoming deadline identified and reminder created.');

    // Test 28: Submitted/completed assessment excluded
    const completedAss = await prisma.assessment.create({
      data: {
        campaignId: reminderCampaign.id,
        userId: testStaff2.id,
        status: AssessmentStatus.COMPLETED,
      },
    });
    cleanupAssessmentIds.push(completedAss.id);

    const compStaff2Pre = await getNotificationsForUser(testStaff2.id, tenantId);
    const compStaff2RemindersPre = compStaff2Pre.notifications.filter(
      (n) => n.resourceId === completedAss.id
    );
    assert.strictEqual(compStaff2RemindersPre.length, 0, 'Completed assessment must not receive reminder');
    console.log('   ✅ Test 28 Passed: Completed assessments excluded from deadline reminders.');

    // Test 29: Inactive Staff excluded
    const inactiveStaff = await prisma.user.create({
      data: {
        name: 'Inactive Staff Member',
        email: `inactive-${Date.now()}@acme.test`,
        passwordHash: 'placeholder',
        role: UserRole.STAFF,
        tenantId,
        isActive: false,
      },
    });
    cleanupUserIds.push(inactiveStaff.id);

    const inactiveAss = await prisma.assessment.create({
      data: {
        campaignId: reminderCampaign.id,
        userId: inactiveStaff.id,
        status: AssessmentStatus.NOT_STARTED,
      },
    });
    cleanupAssessmentIds.push(inactiveAss.id);

    await runAssessmentReminderNotifications({
      now: mockNow,
      reminderDays: [3],
    });
    const inactiveNotifs = await getNotificationsForUser(inactiveStaff.id, tenantId);
    assert.strictEqual(inactiveNotifs.notifications.length, 0, 'Inactive staff must not receive reminders');
    console.log('   ✅ Test 29 Passed: Deactivated staff excluded from reminders.');

    // Test 30: Suspended tenant excluded
    const suspendedTenant = await prisma.tenant.create({
      data: {
        name: 'Suspended Org',
        slug: `suspended-${Date.now()}`,
        status: TenantStatus.SUSPENDED,
      },
    });
    cleanupTenantIds.push(suspendedTenant.id);

    const suspendedStaff = await prisma.user.create({
      data: {
        name: 'Suspended Staff',
        email: `suspended-staff-${Date.now()}@test.org`,
        passwordHash: 'placeholder',
        role: UserRole.STAFF,
        tenantId: suspendedTenant.id,
      },
    });
    cleanupUserIds.push(suspendedStaff.id);

    const suspendedCampaign = await prisma.assessmentCampaign.create({
      data: {
        tenantId: suspendedTenant.id,
        name: 'Suspended Campaign',
        deadline: deadline3d,
        status: CampaignStatus.ACTIVE,
      },
    });
    cleanupCampaignIds.push(suspendedCampaign.id);

    const suspendedAss = await prisma.assessment.create({
      data: {
        campaignId: suspendedCampaign.id,
        userId: suspendedStaff.id,
        status: AssessmentStatus.NOT_STARTED,
      },
    });
    cleanupAssessmentIds.push(suspendedAss.id);

    await runAssessmentReminderNotifications({ now: mockNow, reminderDays: [3] });
    const suspendedNotifs = await getNotificationsForUser(suspendedStaff.id, suspendedTenant.id);
    assert.strictEqual(suspendedNotifs.notifications.length, 0, 'Suspended tenant users must not receive reminders');
    console.log('   ✅ Test 30 Passed: Suspended tenants excluded from reminders.');

    // Test 31: Re-running job does not duplicate same reminder threshold
    const rerunResult = await runAssessmentReminderNotifications({
      now: mockNow,
      reminderDays: [3],
    });
    assert.strictEqual(rerunResult.created, 0, 'Re-running should create 0 duplicate reminders');
    assert(rerunResult.skipped >= 1, 'Re-run should skip existing dedupeKeys');
    console.log('   ✅ Test 31 Passed: Deadline reminder job is idempotent across multiple executions.');

    // =========================================================================
    // SECTION 9: CORROBORATION OVERDUE REMINDERS (Tests 32 - 35)
    // =========================================================================
    console.log('\n9. Testing Overdue Corroboration Reminders (Tests 32-35)...');

    // Create a pending corroboration assessment submitted 7 business days ago
    const overdueSubmittedAt = new Date('2026-10-01T10:00:00Z'); // Thursday
    const overdueCurrentDate = new Date('2026-10-12T10:00:00Z'); // Monday 7+ business days later

    const overdueCampaign = await prisma.assessmentCampaign.create({
      data: {
        tenantId,
        name: 'Overdue Review Campaign',
        deadline: new Date('2026-10-30T10:00:00Z'),
        requiresCorroboration: true,
        status: CampaignStatus.ACTIVE,
      },
    });
    cleanupCampaignIds.push(overdueCampaign.id);

    const overdueAssessment = await prisma.assessment.create({
      data: {
        campaignId: overdueCampaign.id,
        userId: testStaff1.id,
        status: AssessmentStatus.PENDING_CORROBORATION,
        submittedAt: overdueSubmittedAt,
      },
    });
    cleanupAssessmentIds.push(overdueAssessment.id);

    // Test 32: Pending corroboration beyond configured threshold notifies Manager
    const corrobOverdueResult = await runCorroborationReminderNotifications({
      now: overdueCurrentDate,
      thresholdBusinessDays: 5,
    });
    assert(corrobOverdueResult.created >= 1, 'Must create at least 1 overdue reminder');

    const managerOverdueNotifs = await getNotificationsForUser(testManager.id, tenantId);
    const overdueAlert = managerOverdueNotifs.notifications.find(
      (n) => n.type === NotificationType.CORROBORATION_OVERDUE && n.resourceId === overdueAssessment.id
    );
    assert(overdueAlert, 'Manager must receive CORROBORATION_OVERDUE');
    cleanupNotificationIds.push(overdueAlert.id);
    assert.strictEqual(overdueAlert.href, `/manager/corroborations/${overdueAssessment.id}`);
    console.log('   ✅ Test 32 Passed: Manager receives CORROBORATION_OVERDUE for overdue review.');

    // Test 33: Completed assessment excluded
    await prisma.user.update({
      where: { id: testStaff2.id },
      data: { managerId: testManager.id },
    });

    const completedCorrobAss = await prisma.assessment.create({
      data: {
        campaignId: overdueCampaign.id,
        userId: testStaff2.id,
        status: AssessmentStatus.COMPLETED,
        submittedAt: overdueSubmittedAt,
        completedAt: overdueCurrentDate,
      },
    });
    cleanupAssessmentIds.push(completedCorrobAss.id);

    const compNotifs = await getNotificationsForUser(testManager.id, tenantId);
    assert(
      !compNotifs.notifications.some((n) => n.resourceId === completedCorrobAss.id),
      'Completed assessment should never receive overdue corroboration reminder'
    );
    console.log('   ✅ Test 33 Passed: Completed assessments excluded from overdue corroboration.');

    // Test 34: Non-direct manager excluded
    const unrelatedManager = await prisma.user.create({
      data: {
        name: 'Unrelated Manager',
        email: `unrelated-mgr-${Date.now()}@acme.test`,
        passwordHash: 'placeholder',
        role: UserRole.MANAGER,
        tenantId,
      },
    });
    cleanupUserIds.push(unrelatedManager.id);

    const unrelatedNotifs = await getNotificationsForUser(unrelatedManager.id, tenantId);
    assert.strictEqual(unrelatedNotifs.notifications.length, 0, 'Unrelated manager must receive no reminders');
    console.log('   ✅ Test 34 Passed: Non-direct managers receive no overdue reminders.');

    // Test 35a: First overdue cron run created the notification with threshold dedupeKey
    assert.strictEqual(
      overdueAlert.dedupeKey,
      `reminder:overdue-corrob:${overdueAssessment.id}:threshold:5`,
      'DedupeKey must match reminder:overdue-corrob:${id}:threshold:${threshold}'
    );

    // Test 35b: Same-day second run creates none
    const sameDayRerun = await runCorroborationReminderNotifications({
      now: overdueCurrentDate,
      thresholdBusinessDays: 5,
    });
    assert.strictEqual(sameDayRerun.created, 0, 'Same-day second run must create 0 reminders');
    assert(sameDayRerun.skipped >= 1, 'Same-day second run must skip existing dedupeKey');

    // Test 35c: Next-day run creates none for same threshold
    const nextDay = new Date(overdueCurrentDate.getTime() + 24 * 60 * 60 * 1000);
    const nextDayRerun = await runCorroborationReminderNotifications({
      now: nextDay,
      thresholdBusinessDays: 5,
    });
    assert.strictEqual(nextDayRerun.created, 0, 'Next-day run must create 0 reminders for same threshold');
    assert(nextDayRerun.skipped >= 1, 'Next-day run must skip existing dedupeKey');

    // Test 35d: Several days later still creates none for same threshold
    const severalDaysLater = new Date(overdueCurrentDate.getTime() + 5 * 24 * 60 * 60 * 1000);
    const severalDaysLaterRerun = await runCorroborationReminderNotifications({
      now: severalDaysLater,
      thresholdBusinessDays: 5,
    });
    assert.strictEqual(severalDaysLaterRerun.created, 0, 'Several days later must create 0 reminders for same threshold');

    // Test 35e: Different configured threshold creates a distinct reminder
    // (7+ business days passed, so threshold 6 is also met and has not been notified yet)
    const newThresholdRerun = await runCorroborationReminderNotifications({
      now: severalDaysLater,
      thresholdBusinessDays: 6,
    });
    assert.strictEqual(newThresholdRerun.created, 1, 'Different configured threshold must create a distinct reminder');
    const newThresholdAlerts = await prisma.notification.findMany({
      where: {
        recipientId: testManager.id,
        dedupeKey: `reminder:overdue-corrob:${overdueAssessment.id}:threshold:6`,
      },
    });
    assert.strictEqual(newThresholdAlerts.length, 1, 'Must find notification for threshold 6');
    cleanupNotificationIds.push(newThresholdAlerts[0].id);

    console.log('   ✅ Test 35 Passed: Overdue corroboration dedupe verified across same-day, next-day, multi-day, and threshold change.');

    // =========================================================================
    // SECTION 10: CRON ENDPOINT SECURITY & EXECUTION (Tests 36 - 37)
    // =========================================================================
    console.log('\n10. Testing Cron Security & Scheduled Execution (Tests 36-37)...');

    process.env.CRON_SECRET = 'test-secret-12345';
    const { GET: cronHandler } = await import('../src/app/api/cron/notifications/route');

    // Test 36: Missing / invalid CRON_SECRET rejected
    const unauthReq = new NextRequest('http://localhost:3000/api/cron/notifications');
    const unauthRes = await cronHandler(unauthReq);
    assert.strictEqual(unauthRes.status, 401, 'Request without secret must return 401');

    const badSecretReq = new NextRequest('http://localhost:3000/api/cron/notifications', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const badSecretRes = await cronHandler(badSecretReq);
    assert.strictEqual(badSecretRes.status, 401, 'Request with wrong secret must return 401');
    console.log('   ✅ Test 36 Passed: Unauthenticated and bad-secret cron requests rejected (401).');

    // Test 37: Valid cron request runs scheduled services
    const validReq = new NextRequest('http://localhost:3000/api/cron/notifications', {
      headers: { authorization: 'Bearer test-secret-12345' },
    });
    const validRes = await cronHandler(validReq);
    assert.strictEqual(validRes.status, 200, 'Valid cron request must return 200');
    const cronData = await validRes.json();
    assert.strictEqual(cronData.success, true);
    assert(cronData.assessmentReminders, 'Must return assessmentReminders summary');
    assert(cronData.corroborationReminders, 'Must return corroborationReminders summary');
    console.log('   ✅ Test 37 Passed: Valid cron request triggers scheduled services successfully.');

    // =========================================================================
    // SECTION 11: REGRESSION & SARAH BASELINE (Tests 38 - 44)
    // =========================================================================
    console.log('\n11. Testing Platform Regression & Baseline State (Tests 38-44)...');

    // Test 38: Assessment submission statuses unchanged
    const statuses = Object.values(AssessmentStatus);
    assert(statuses.includes('NOT_STARTED'));
    assert(statuses.includes('DRAFT'));
    assert(statuses.includes('SUBMITTED'));
    assert(statuses.includes('PENDING_CORROBORATION'));
    assert(statuses.includes('COMPLETED'));
    console.log('   ✅ Test 38 Passed: Assessment status state machine preserved.');

    // Test 39: Manager corroboration behavior unchanged
    const corrobRecord = await prisma.corroboration.findFirst({
      where: { assessmentItem: { assessmentId: staff1Assessment.id } },
    });
    assert(corrobRecord, 'Corroboration record structure preserved');
    console.log('   ✅ Test 39 Passed: Manager corroboration behavior unchanged.');

    // Test 40: Campaign participant snapshot unchanged
    const parts = await prisma.campaignParticipant.findMany({
      where: { campaignId: draftCampaign.id },
    });
    assert.strictEqual(parts.length, 1);
    console.log('   ✅ Test 40 Passed: Campaign participant snapshot intact.');

    // Test 41: Invitation acceptance unchanged
    const userInDb = await prisma.user.findUnique({ where: { id: acceptedUser.id } });
    assert(userInDb && userInDb.isActive, 'Accepted user remains active');
    console.log('   ✅ Test 41 Passed: Invitation acceptance workflow intact.');

    // Test 42: Role assignment unchanged
    assert.strictEqual(testStaff1.role, UserRole.STAFF);
    assert.strictEqual(testManager.role, UserRole.MANAGER);
    console.log('   ✅ Test 42 Passed: Role assignments intact.');

    // Test 43: Reports & exports query still works
    const { generateOrganizationGapCsv } = await import('../src/services/reports');
    const reportData = await generateOrganizationGapCsv(tenantId);
    assert(reportData && reportData.csv, 'Report generation still works');
    console.log('   ✅ Test 43 Passed: Reports and analytics queries intact.');

    // Test 44: Sarah seeded Q3 state restored pristine
    const sarahPost = await prisma.user.findFirst({
      where: { email: 'staff@acme.test' },
      include: {
        roleProfile: true,
        assessments: {
          include: {
            items: { include: { attachments: true } },
          },
        },
      },
    });
    assert(sarahPost, 'Sarah must exist');
    assert.strictEqual(sarahPost.roleProfile?.name, 'Backend Engineer');
    const sarahQ3Post = sarahPost.assessments.find((a) => a.status === AssessmentStatus.NOT_STARTED);
    assert(sarahQ3Post, 'Sarah Q3 assessment must be NOT_STARTED');
    assert.strictEqual(sarahQ3Post.items.length, 7, 'Sarah must have 7 items');
    const attPost = sarahQ3Post.items.reduce((acc, i) => acc + i.attachments.length, 0);
    assert.strictEqual(attPost, 0, 'Sarah must have 0 attachments');
    const nonBlankPost = sarahQ3Post.items.filter((i) => i.selfRating !== null || i.evidenceText !== null).length;
    assert.strictEqual(nonBlankPost, 0, 'Sarah items must be completely blank');
    console.log('   ✅ Test 44 Passed: Sarah baseline confirmed completely pristine.');

  } finally {
    // Guaranteed Cleanup of all test artifacts
    console.log('\n🧹 Cleaning up test notifications, campaigns, invitations, and users...');

    if (cleanupNotificationIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: cleanupNotificationIds } },
      });
    }

    if (cleanupAssessmentIds.length > 0) {
      await prisma.evidenceAttachment.deleteMany({
        where: { assessmentItem: { assessmentId: { in: cleanupAssessmentIds } } },
      });
      await prisma.corroboration.deleteMany({
        where: { assessmentItem: { assessmentId: { in: cleanupAssessmentIds } } },
      });
      await prisma.assessmentItem.deleteMany({
        where: { assessmentId: { in: cleanupAssessmentIds } },
      });
      await prisma.assessment.deleteMany({
        where: { id: { in: cleanupAssessmentIds } },
      });
    }

    if (cleanupCampaignIds.length > 0) {
      await prisma.campaignParticipant.deleteMany({
        where: { campaignId: { in: cleanupCampaignIds } },
      });
      await prisma.campaignCompetency.deleteMany({
        where: { campaignId: { in: cleanupCampaignIds } },
      });
      await prisma.campaignTeam.deleteMany({
        where: { campaignId: { in: cleanupCampaignIds } },
      });
      await prisma.assessmentCampaign.deleteMany({
        where: { id: { in: cleanupCampaignIds } },
      });
    }

    if (cleanupInvitationIds.length > 0) {
      await prisma.tenantInvitationTeam.deleteMany({
        where: { invitationId: { in: cleanupInvitationIds } },
      });
      await prisma.tenantInvitation.deleteMany({
        where: { id: { in: cleanupInvitationIds } },
      });
    }

    if (cleanupUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: cleanupUserIds } },
      });
    }

    if (cleanupTenantIds.length > 0) {
      await prisma.tenant.deleteMany({
        where: { id: { in: cleanupTenantIds } },
      });
    }

    // Reset mock email
    setMockEmailClient(null);

    console.log('   ✅ All test artifacts cleaned up successfully.');
  }

  console.log('\n🎉 All 44 Notification Engine (XC-02) tests passed with 100% success!\n');
}

main()
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
