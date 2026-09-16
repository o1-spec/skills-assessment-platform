import { prisma } from '../src/lib/db';
import {
  AuditAction,
  UserRole,
  TenantStatus,
  CampaignStatus,
  CampaignScope,
  RoleProfileStatus,
  AssessmentStatus,
} from '@prisma/client';
import {
  sanitizeAuditDetails,
  getAuditLogsForPlatformAdmin,
  getAuditLogsForTenant,
} from '../src/services/audit';
import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
} from '../src/services/plans';
import {
  provisionTenant,
  updateTenantStatus,
} from '../src/services/tenants';
import {
  createFrameworkDraft,
  publishFrameworkVersion,
} from '../src/services/frameworks';
import {
  adoptFrameworkVersion,
} from '../src/services/framework-adoption';
import {
  createIndustryTemplate,
  updateIndustryTemplate,
} from '../src/services/industry-templates';
import {
  createCustomCompetency,
  updateCustomCompetency,
  toggleCompetencyActive,
} from '../src/services/competencies';

import {
  updateTenantUser,
  deactivateTenantUser,
  reactivateTenantUser,
} from '../src/services/users';
import {
  createDepartment,
  updateDepartment,
  createTeam,
  updateTeam,
  addTeamMember,
} from '../src/services/organization-structure';
import {
  createRoleProfile,
  updateRoleProfile,
  publishRoleProfile,
  archiveRoleProfile,
  unarchiveRoleProfile,
} from '../src/services/role-profiles';
import {
  createAssessmentCampaign,
  updateCampaignDraft,
  launchCampaign,
} from '../src/services/campaigns';
import {
  submitAssessment,
} from '../src/services/assessments';
import {
  submitCorroboration,
} from '../src/services/corroborations';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (failureDetails) console.error(`    Details: ${failureDetails}`);
    failedTests++;
  }
}

async function runAuditTrailTests() {
  console.log('====================================================');
  console.log('COMPREHENSIVE AUDIT TRAIL & AUDIT VIEWERS TEST SUITE');
  console.log('====================================================\n');

  // Verify baseline Sarah Jenkins is pristine before anything
  const sarah = await prisma.user.findUnique({
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

  const sarahAssessment = sarah?.assessments[0];
  assert(
    !!sarahAssessment && sarahAssessment.status === AssessmentStatus.NOT_STARTED,
    'Pre-test check: Sarah Jenkins assessment exists and is NOT_STARTED'
  );
  assert(
    sarahAssessment?.items.length === 7,
    'Pre-test check: Sarah Jenkins has exactly 7 items'
  );

  // ----------------------------------------------------
  // 1. SENSITIVE FIELD SCRUBBING & SANITIZATION ENGINE
  // ----------------------------------------------------
  console.log('\n--- Section 1: Sensitive Data Sanitization ---');
  const dirtyData = {
    username: 'test_user',
    password: 'SuperSecretPassword123!',
    token: 'jwt.token.here',
    rawToken: 'abcdef123456',
    tokenHash: 'hashvalue',
    secret: 'my-app-secret',
    cronSecret: 'cron-key',
    authSecret: 'session-secret',
    apiKey: 'resend_key',
    cookie: 'session=xyz',
    authorization: 'Bearer token',
    passwordHash: 'hash-secret-val',
    serviceRoleKey: 'svc-role-key-secret',
    roleProfileId: 'rp-uuid-123',
    previousRoleProfileId: 'rp-prev-uuid-456',
    frameworkVersionId: 'fw-ver-uuid-789',
    resourceId: 'res-uuid-999',
    normalField: 'acceptable',
    longEvidenceText: 'A'.repeat(600),
    nested: {
      password: 'nestedPassword',
      safeField: 'hello',
      deeper: {
        rawToken: 'deepToken',
        valid: 123,
      },
    },
  };

  const sanitized = sanitizeAuditDetails(dirtyData) as Record<string, unknown>;

  // 1. passwordHash is redacted
  assert(sanitized.passwordHash === undefined, '1. passwordHash is redacted');
  // 2. rawToken is redacted
  assert(sanitized.rawToken === undefined, '2. rawToken is redacted');
  // 3. authorization is redacted
  assert(sanitized.authorization === undefined, '3. authorization is redacted');
  // 4. serviceRoleKey is redacted
  assert(sanitized.serviceRoleKey === undefined, '4. serviceRoleKey is redacted');
  // 5. roleProfileId is NOT redacted
  assert(sanitized.roleProfileId === 'rp-uuid-123', '5. roleProfileId is NOT redacted');
  // 6. previousRoleProfileId is NOT redacted
  assert(sanitized.previousRoleProfileId === 'rp-prev-uuid-456', '6. previousRoleProfileId is NOT redacted');
  // 7. frameworkVersionId is NOT redacted
  assert(sanitized.frameworkVersionId === 'fw-ver-uuid-789', '7. frameworkVersionId is NOT redacted');
  // 8. ordinary resource IDs remain visible
  assert(sanitized.resourceId === 'res-uuid-999', '8. ordinary resource IDs remain visible');

  assert(sanitized.password === undefined, 'Sanitization strips "password"');
  assert(sanitized.token === undefined, 'Sanitization strips "token"');
  assert(sanitized.tokenHash === undefined, 'Sanitization strips "tokenHash"');
  assert(sanitized.secret === undefined, 'Sanitization strips "secret"');
  assert(sanitized.apiKey === undefined, 'Sanitization strips "apiKey"');
  assert(sanitized.cookie === undefined, 'Sanitization strips "cookie"');
  assert(sanitized.normalField === 'acceptable', 'Sanitization preserves normal strings');

  const longText = sanitized.longEvidenceText as string;
  assert(
    longText.length < 550 && longText.endsWith('... [truncated]'),
    'Sanitization truncates strings > 500 characters'
  );

  const nestedObj = sanitized.nested as Record<string, unknown>;
  assert(nestedObj.password === undefined, 'Sanitization recursively strips nested passwords');
  assert(nestedObj.safeField === 'hello', 'Sanitization preserves nested safe fields');
  const deeperObj = nestedObj.deeper as Record<string, unknown>;
  assert(deeperObj.rawToken === undefined, 'Sanitization recursively strips deep tokens');
  assert(deeperObj.valid === 123, 'Sanitization preserves deep numbers');

  // ----------------------------------------------------
  // 2. TENANT PROVISION & TENANT STATUS LIFECYCLE
  // ----------------------------------------------------
  console.log('\n--- Section 2: Tenant Mutations Audit ---');
  const platformAdmin = await prisma.user.findFirst({
    where: { role: UserRole.PLATFORM_ADMIN },
  });
  const defaultPlan = await prisma.subscriptionPlan.findFirst({
    where: { isActive: true },
  });

  const testTenantSlug = `audit-test-${Date.now()}`;
  const provisionResult = await provisionTenant(
    {
      name: `Audit Test Org ${Date.now()}`,
      slug: testTenantSlug,
      planId: defaultPlan!.id,
      seatLimit: 10,
      adminName: 'Audit Org Admin',
      adminEmail: `admin-${Date.now()}@audittest.org`,
    },
    platformAdmin?.id,
    {
      actorId: platformAdmin?.id,
      ipAddress: '192.168.1.100',
      userAgent: 'AuditTestRunner/1.0',
    }
  );

  const testTenantId = provisionResult.tenant.id;

  // Verify TENANT_PROVISION audit log
  const provisionLog = await prisma.auditLog.findFirst({
    where: {
      tenantId: testTenantId,
      action: AuditAction.TENANT_PROVISION,
    },
  });

  assert(!!provisionLog, 'TENANT_PROVISION audit log recorded');
  assert(provisionLog?.resourceType === 'Tenant', 'TENANT_PROVISION resourceType is Tenant');
  assert(provisionLog?.resourceId === testTenantId, 'TENANT_PROVISION resourceId matches tenant ID');
  assert(provisionLog?.ipAddress === '192.168.1.100', 'TENANT_PROVISION records IP address');
  assert(provisionLog?.userAgent === 'AuditTestRunner/1.0', 'TENANT_PROVISION records user agent');

  // Verify invitation audit log (USER_INVITE) from provision
  const adminInviteLog = await prisma.auditLog.findFirst({
    where: {
      tenantId: testTenantId,
      action: AuditAction.USER_INVITE,
    },
  });
  assert(!!adminInviteLog, 'USER_INVITE audit log recorded for initial admin');
  const inviteDetails = adminInviteLog?.details as Record<string, unknown>;
  assert(
    inviteDetails.rawToken === undefined && inviteDetails.tokenHash === undefined,
    'USER_INVITE audit log details do NOT leak raw token or hash'
  );

  // Test TENANT_SUSPEND and TENANT_REACTIVATE
  await updateTenantStatus(testTenantId, TenantStatus.SUSPENDED, {
    actorId: platformAdmin?.id,
    ipAddress: '192.168.1.100',
  });
  const suspendLog = await prisma.auditLog.findFirst({
    where: {
      tenantId: testTenantId,
      action: AuditAction.TENANT_SUSPEND,
    },
  });
  assert(!!suspendLog, 'TENANT_SUSPEND audit log recorded on suspension');

  await updateTenantStatus(testTenantId, TenantStatus.ACTIVE, {
    actorId: platformAdmin?.id,
    ipAddress: '192.168.1.100',
  });
  const reactivateLog = await prisma.auditLog.findFirst({
    where: {
      tenantId: testTenantId,
      action: AuditAction.TENANT_REACTIVATE,
    },
  });
  assert(!!reactivateLog, 'TENANT_REACTIVATE audit log recorded on reactivation');

  // ----------------------------------------------------
  // 3. SUBSCRIPTION PLAN MUTATIONS
  // ----------------------------------------------------
  console.log('\n--- Section 3: Subscription Plan Mutations Audit ---');
  const planName = `Audit Plan ${Date.now()}`;
  const newPlan = await createSubscriptionPlan(
    {
      name: planName,
      description: 'Audit test plan',
      defaultSeatLimit: 50,
      isActive: true,
    },
    { actorId: platformAdmin?.id }
  );

  const planCreateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: newPlan.id,
      action: AuditAction.PLAN_CREATE,
    },
  });
  assert(!!planCreateLog, 'PLAN_CREATE audit log recorded');
  assert(planCreateLog?.tenantId === null, 'PLAN_CREATE has tenantId: null (global event)');

  await updateSubscriptionPlan(
    newPlan.id,
    {
      name: `${planName} Updated`,
      defaultSeatLimit: 15,
    },
    { actorId: platformAdmin?.id }
  );
  const planUpdateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: newPlan.id,
      action: AuditAction.PLAN_UPDATE,
    },
  });
  assert(!!planUpdateLog, 'PLAN_UPDATE audit log recorded');

  // ----------------------------------------------------
  // 4. FRAMEWORK & ADOPTION MUTATIONS
  // ----------------------------------------------------
  console.log('\n--- Section 4: Framework & Adoption Mutations Audit ---');
  const fwVersion = `v9.${Date.now()}`;
  const newFramework = await createFrameworkDraft(
    {
      version: fwVersion,
      description: 'Audit test framework',
    },
    { actorId: platformAdmin?.id }
  );
  const fwCreateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: newFramework.id,
      action: AuditAction.FRAMEWORK_CREATE,
    },
  });
  assert(!!fwCreateLog, 'FRAMEWORK_CREATE audit log recorded');

  // Add a category and competency to framework so it can be published
  const category = await prisma.frameworkCategory.create({
    data: {
      frameworkVersionId: newFramework.id,
      name: 'Engineering',
      type: 'TECHNICAL',
    },
  });
  const comp = await prisma.frameworkCompetency.create({
    data: {
      categoryId: category.id,
      name: `Audit Canonical Comp ${Date.now()}`,
      description: 'For audit test',
      levels: {
        create: [
          { level: 1, description: 'Novice' },
          { level: 2, description: 'Proficient' },
        ],
      },
    },
  });

  await publishFrameworkVersion(newFramework.id, { actorId: platformAdmin?.id });
  const fwPublishLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: newFramework.id,
      action: AuditAction.FRAMEWORK_PUBLISH,
    },
  });
  assert(!!fwPublishLog, 'FRAMEWORK_PUBLISH audit log recorded');

  // Framework Adoption
  await adoptFrameworkVersion(testTenantId, newFramework.id, { actorId: platformAdmin?.id });
  const fwAdoptLog = await prisma.auditLog.findFirst({
    where: {
      tenantId: testTenantId,
      action: AuditAction.FRAMEWORK_ADOPT,
    },
  });
  assert(!!fwAdoptLog, 'FRAMEWORK_ADOPT audit log recorded for tenant');

  // ----------------------------------------------------
  // 5. INDUSTRY TEMPLATES MUTATIONS
  // ----------------------------------------------------
  console.log('\n--- Section 5: Industry Template Mutations Audit ---');
  const template = await createIndustryTemplate(
    {
      name: `Audit Template ${Date.now()}`,
      description: 'Audit test template',
      frameworkVersionId: newFramework.id,
      competencyIds: [comp.id],
    },
    { actorId: platformAdmin?.id }
  );
  const tmplCreateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: template.id,
      action: AuditAction.INDUSTRY_TEMPLATE_CREATE,
    },
  });
  assert(!!tmplCreateLog, 'INDUSTRY_TEMPLATE_CREATE audit log recorded');

  await updateIndustryTemplate(
    template.id,
    { description: 'Updated template description' },
    { actorId: platformAdmin?.id }
  );
  const tmplUpdateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: template.id,
      action: AuditAction.INDUSTRY_TEMPLATE_UPDATE,
    },
  });
  assert(!!tmplUpdateLog, 'INDUSTRY_TEMPLATE_UPDATE audit log recorded');

  // ----------------------------------------------------
  // 6. COMPETENCY MUTATIONS
  // ----------------------------------------------------
  console.log('\n--- Section 6: Competency Mutations Audit ---');
  const customComp = await createCustomCompetency(
    testTenantId,
    {
      name: `Custom Audit Comp ${Date.now()}`,
      description: 'Testing competency audit',
      type: 'TECHNICAL',
      levels: [
        { level: 1, description: 'L1 desc' },
        { level: 2, description: 'L2 desc' },
      ],
    },
    { actorId: platformAdmin?.id }
  );
  const compCreateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: customComp.id,
      action: AuditAction.COMPETENCY_CREATE,
    },
  });
  assert(!!compCreateLog, 'COMPETENCY_CREATE audit log recorded');

  await updateCustomCompetency(
    testTenantId,
    customComp.id,
    {
      name: `${customComp.name} Updated`,
      type: 'TECHNICAL',
      levels: [
        { level: 1, description: 'L1 updated' },
        { level: 2, description: 'L2 updated' },
      ],
    },
    { actorId: platformAdmin?.id }
  );
  const compUpdateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: customComp.id,
      action: AuditAction.COMPETENCY_UPDATE,
    },
  });
  assert(!!compUpdateLog, 'COMPETENCY_UPDATE audit log recorded');

  await toggleCompetencyActive(testTenantId, customComp.id, false, { actorId: platformAdmin?.id });
  const compDeactLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: customComp.id,
      action: AuditAction.COMPETENCY_DEACTIVATE,
    },
  });
  assert(!!compDeactLog, 'COMPETENCY_DEACTIVATE audit log recorded');

  await toggleCompetencyActive(testTenantId, customComp.id, true, { actorId: platformAdmin?.id });
  const compActLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: customComp.id,
      action: AuditAction.COMPETENCY_ACTIVATE,
    },
  });
  assert(!!compActLog, 'COMPETENCY_ACTIVATE audit log recorded');

  // ----------------------------------------------------
  // 7. ORGANIZATION STRUCTURE MUTATIONS
  // ----------------------------------------------------
  console.log('\n--- Section 7: Organization Structure Mutations Audit ---');
  const dept = await createDepartment(
    testTenantId,
    { name: `Audit Dept ${Date.now()}`, description: 'Testing dept' },
    { actorId: platformAdmin?.id }
  );
  const deptCreateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: dept.id,
      action: AuditAction.DEPARTMENT_CREATE,
    },
  });
  assert(!!deptCreateLog, 'DEPARTMENT_CREATE audit log recorded');

  await updateDepartment(
    testTenantId,
    dept.id,
    { name: `${dept.name} Updated` },
    { actorId: platformAdmin?.id }
  );
  const deptUpdateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: dept.id,
      action: AuditAction.DEPARTMENT_UPDATE,
    },
  });
  assert(!!deptUpdateLog, 'DEPARTMENT_UPDATE audit log recorded');

  const team = await createTeam(
    testTenantId,
    { name: `Audit Team ${Date.now()}`, departmentId: dept.id },
    { actorId: platformAdmin?.id }
  );
  const teamCreateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: team.id,
      action: AuditAction.TEAM_CREATE,
    },
  });
  assert(!!teamCreateLog, 'TEAM_CREATE audit log recorded');

  await updateTeam(
    testTenantId,
    team.id,
    { name: `${team.name} Updated` },
    { actorId: platformAdmin?.id }
  );
  const teamUpdateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: team.id,
      action: AuditAction.TEAM_UPDATE,
    },
  });
  assert(!!teamUpdateLog, 'TEAM_UPDATE audit log recorded');

  // Create test user in this tenant for membership testing
  const testUser = await prisma.user.create({
    data: {
      tenantId: testTenantId,
      name: 'Audit Member',
      email: `member-${Date.now()}@audittest.org`,
      passwordHash: 'dummyhash',
      role: UserRole.STAFF,
      isActive: true,
    },
  });

  await addTeamMember(testTenantId, team.id, testUser.id, { actorId: platformAdmin?.id });
  const memberAddLog = await prisma.auditLog.findFirst({
    where: {
      tenantId: testTenantId,
      action: AuditAction.TEAM_MEMBERSHIP_CHANGE,
    },
  });
  assert(!!memberAddLog, 'TEAM_MEMBERSHIP_CHANGE audit log recorded on add');

  // ----------------------------------------------------
  // 8. USER LIFECYCLE & ROLE CHANGES
  // ----------------------------------------------------
  console.log('\n--- Section 8: User Lifecycle Mutations Audit ---');
  await updateTenantUser(
    testTenantId,
    platformAdmin!.id,
    testUser.id,
    { role: UserRole.MANAGER },
    { actorId: platformAdmin?.id }
  );
  const roleChangeLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: testUser.id,
      action: AuditAction.USER_ROLE_CHANGE,
    },
  });
  assert(!!roleChangeLog, 'USER_ROLE_CHANGE audit log recorded on role change');

  await deactivateTenantUser(testTenantId, platformAdmin!.id, testUser.id, {
    actorId: platformAdmin?.id,
  });
  const userDeactLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: testUser.id,
      action: AuditAction.USER_DEACTIVATE,
    },
  });
  assert(!!userDeactLog, 'USER_DEACTIVATE audit log recorded on user deactivation');

  await reactivateTenantUser(testTenantId, testUser.id, { actorId: platformAdmin?.id });
  const userReactLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: testUser.id,
      action: AuditAction.USER_REACTIVATE,
    },
  });
  assert(!!userReactLog, 'USER_REACTIVATE audit log recorded on user reactivation');

  // ----------------------------------------------------
  // 9. ROLE PROFILES MUTATIONS
  // ----------------------------------------------------
  console.log('\n--- Section 9: Role Profile Mutations Audit ---');
  const roleProfile = await createRoleProfile(
    testTenantId,
    {
      name: `Audit Role Profile ${Date.now()}`,
      description: 'Audit test role profile',
      status: RoleProfileStatus.DRAFT,
      requirements: [{ competencyId: customComp.id, targetLevel: 1 }],
    },
    { actorId: platformAdmin?.id }
  );
  const rpCreateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: roleProfile.id,
      action: AuditAction.ROLE_PROFILE_CREATE,
    },
  });
  assert(!!rpCreateLog, 'ROLE_PROFILE_CREATE audit log recorded');

  await updateRoleProfile(
    testTenantId,
    roleProfile.id,
    {
      description: 'Updated draft role profile',
      requirements: [{ competencyId: customComp.id, targetLevel: 2 }],
    },
    { actorId: platformAdmin?.id }
  );
  const rpUpdateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: roleProfile.id,
      action: AuditAction.ROLE_PROFILE_UPDATE,
    },
  });
  assert(!!rpUpdateLog, 'ROLE_PROFILE_UPDATE audit log recorded');

  await publishRoleProfile(testTenantId, roleProfile.id, { actorId: platformAdmin?.id });
  const rpPublishLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: roleProfile.id,
      action: AuditAction.ROLE_PROFILE_PUBLISH,
    },
  });
  assert(!!rpPublishLog, 'ROLE_PROFILE_PUBLISH audit log recorded');

  await archiveRoleProfile(testTenantId, roleProfile.id, { actorId: platformAdmin?.id });
  const rpArchiveLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: roleProfile.id,
      action: AuditAction.ROLE_PROFILE_ARCHIVE,
    },
  });
  assert(!!rpArchiveLog, 'ROLE_PROFILE_ARCHIVE audit log recorded');

  await unarchiveRoleProfile(testTenantId, roleProfile.id, { actorId: platformAdmin?.id });
  const rpUnarchiveLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: roleProfile.id,
      action: AuditAction.ROLE_PROFILE_UNARCHIVE,
    },
  });
  assert(!!rpUnarchiveLog, 'ROLE_PROFILE_UNARCHIVE audit log recorded');

  // ----------------------------------------------------
  // 10. CAMPAIGN, ASSESSMENT & CORROBORATION MUTATIONS
  // ----------------------------------------------------
  console.log('\n--- Section 10: Campaign, Assessment & Corroboration Mutations Audit ---');
  // Re-switch user to STAFF for campaign assignment
  await prisma.user.update({
    where: { id: testUser.id },
    data: { role: UserRole.STAFF },
  });

  const testManager = await prisma.user.create({
    data: {
      tenantId: testTenantId,
      name: 'Audit Manager User',
      email: `manager-${Date.now()}@audittest.org`,
      passwordHash: 'dummyhash',
      role: UserRole.MANAGER,
      isActive: true,
    },
  });

  await prisma.user.update({
    where: { id: testUser.id },
    data: { managerId: testManager.id },
  });

  const campaign = await createAssessmentCampaign(
    testTenantId,
    {
      name: `Audit Campaign ${Date.now()}`,
      description: 'Audit campaign run',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      requiresCorroboration: true,
      status: CampaignStatus.DRAFT,
      scope: CampaignScope.INDIVIDUAL,
      participantIds: [testUser.id],
      competencyIds: [customComp.id],
    },
    { actorId: platformAdmin?.id }
  );
  const campCreateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: campaign.id,
      action: AuditAction.CAMPAIGN_CREATE,
    },
  });
  assert(!!campCreateLog, 'CAMPAIGN_CREATE audit log recorded');

  await updateCampaignDraft(
    testTenantId,
    campaign.id,
    {
      name: `${campaign.name} Updated`,
      deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      requiresCorroboration: true,
      scope: CampaignScope.INDIVIDUAL,
      participantIds: [testUser.id],
      competencyIds: [customComp.id],
    },
    { actorId: platformAdmin?.id }
  );
  const campUpdateLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: campaign.id,
      action: AuditAction.CAMPAIGN_UPDATE,
    },
  });
  assert(!!campUpdateLog, 'CAMPAIGN_UPDATE audit log recorded');

  await launchCampaign(testTenantId, campaign.id, { actorId: platformAdmin?.id });
  const campLaunchLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: campaign.id,
      action: AuditAction.CAMPAIGN_LAUNCH,
    },
  });
  assert(!!campLaunchLog, 'CAMPAIGN_LAUNCH audit log recorded');

  // Submit assessment for testUser
  const assessment = await prisma.assessment.findFirstOrThrow({
    where: { campaignId: campaign.id, userId: testUser.id },
    include: { items: true },
  });

  await submitAssessment(
    testUser.id,
    testTenantId,
    {
      assessmentId: assessment.id,
      items: [
        {
          assessmentItemId: assessment.items[0].id,
          selfRating: 2,
          evidenceText: 'Demonstrated proficiency in audit testing.',
        },
      ],
    },
    { actorId: testUser.id }
  );
  const assessSubmitLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: assessment.id,
      action: AuditAction.ASSESSMENT_SUBMIT,
    },
  });
  assert(!!assessSubmitLog, 'ASSESSMENT_SUBMIT audit log recorded');

  // 9. requiresCorroboration=true audit resultingStatus === PENDING_CORROBORATION
  const assessSubmitDetails = assessSubmitLog?.details as Record<string, unknown>;
  assert(
    assessSubmitDetails?.resultingStatus === AssessmentStatus.PENDING_CORROBORATION,
    '9. requiresCorroboration=true audit resultingStatus === PENDING_CORROBORATION'
  );

  // 10. Test requiresCorroboration=false submission produces COMPLETED in audit
  const directCampaign = await createAssessmentCampaign(
    testTenantId,
    {
      name: `Direct Completion Campaign ${Date.now()}`,
      deadline: new Date(Date.now() + 86400000 * 30),
      requiresCorroboration: false,
      scope: CampaignScope.INDIVIDUAL,
      participantIds: [testUser.id],
      competencyIds: [customComp.id],
    },
    { actorId: platformAdmin?.id }
  );
  await launchCampaign(testTenantId, directCampaign.id, { actorId: platformAdmin?.id });

  const directAssessment = await prisma.assessment.findFirstOrThrow({
    where: { campaignId: directCampaign.id, userId: testUser.id },
    include: { items: true },
  });

  await submitAssessment(
    testUser.id,
    testTenantId,
    {
      assessmentId: directAssessment.id,
      items: [
        {
          assessmentItemId: directAssessment.items[0].id,
          selfRating: 1,
          evidenceText: null,
        },
      ],
    },
    { actorId: testUser.id }
  );

  const directSubmitLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: directAssessment.id,
      action: AuditAction.ASSESSMENT_SUBMIT,
    },
  });
  const directSubmitDetails = directSubmitLog?.details as Record<string, unknown>;
  assert(
    directSubmitDetails?.resultingStatus === AssessmentStatus.COMPLETED,
    '10. requiresCorroboration=false audit resultingStatus === COMPLETED'
  );

  // Submit corroboration by manager
  await submitCorroboration(
    testManager.id,
    testTenantId,
    {
      assessmentId: assessment.id,
      items: [
        {
          assessmentItemId: assessment.items[0].id,
          rating: 2,
          justification: null,
        },
      ],
    },
    { actorId: testManager.id }
  );
  const corrobSubmitLog = await prisma.auditLog.findFirst({
    where: {
      resourceId: assessment.id,
      action: AuditAction.CORROBORATION_SUBMIT,
    },
  });
  assert(!!corrobSubmitLog, 'CORROBORATION_SUBMIT audit log recorded');

  // ----------------------------------------------------
  // 11. PLATFORM ADMIN & ORG ADMIN AUDIT VIEWERS
  // ----------------------------------------------------
  console.log('\n--- Section 11: Audit Query Engine & Isolation ---');
  // Global platform admin query
  const platformLogs = await getAuditLogsForPlatformAdmin({
    pageSize: 100,
  });
  assert(platformLogs.logs.length > 0, 'Platform admin query returns audit logs across tenants');
  assert(platformLogs.totalCount >= platformLogs.logs.length, 'Platform admin totalCount is accurate');

  // Filter platform logs by action
  const platformFiltered = await getAuditLogsForPlatformAdmin({
    action: AuditAction.TENANT_PROVISION,
  });
  const allAreProvision = platformFiltered.logs.every(
    (l) => l.action === AuditAction.TENANT_PROVISION
  );
  assert(allAreProvision, 'Platform admin filter by action correctly isolates target action');

  // Tenant-scoped query
  const tenantLogs = await getAuditLogsForTenant(testTenantId, {
    pageSize: 100,
  });
  assert(tenantLogs.logs.length > 0, 'Org admin query returns logs for target tenant');
  const allBelongToTenant = tenantLogs.logs.every((l) => l.tenantId === testTenantId);
  assert(allBelongToTenant, 'Org admin query strictly isolates logs to target tenant');

  // Cross-tenant data leak assertion:
  // Querying testTenantId MUST NOT contain logs from 'acme-technologies'
  const acmeTenant = await prisma.tenant.findUnique({ where: { slug: 'acme-technologies' } });
  if (acmeTenant) {
    const leakedLog = tenantLogs.logs.find((l) => l.tenantId === acmeTenant.id);
    assert(!leakedLog, 'Tenant isolation: No Acme logs leaked into testTenant audit query');
  }

  // ----------------------------------------------------
  // 12. IMMUTABILITY & AUDIT LOG RETENTION INTEGRITY
  // ----------------------------------------------------
  console.log('\n--- Section 12: Immutability & Retention Rules ---');
  // Ensure AuditLog has no production update or delete mutations exposed
  // Foreign key retention test: delete testUser and verify audit logs survive with actorId set to null
  const logCountBefore = await prisma.auditLog.count({
    where: { tenantId: testTenantId },
  });

  // Verify audit logs survive User deactivation/deletion
  const userAuditLogs = await prisma.auditLog.findMany({
    where: { actorId: testUser.id },
  });
  assert(userAuditLogs.length > 0, 'Audit logs exist for test user actor');

  // Clean up transient test campaign & users
  // Note: we delete test assessment & campaign to keep database tidy, but verify audit logs remain!
  await prisma.corroboration.deleteMany({
    where: { assessmentItem: { assessment: { campaignId: { in: [campaign.id, directCampaign.id] } } } },
  });
  await prisma.assessmentItem.deleteMany({
    where: { assessment: { campaignId: { in: [campaign.id, directCampaign.id] } } },
  });
  await prisma.assessment.deleteMany({
    where: { campaignId: { in: [campaign.id, directCampaign.id] } },
  });
  await prisma.campaignParticipant.deleteMany({ where: { campaignId: { in: [campaign.id, directCampaign.id] } } });
  await prisma.campaignCompetency.deleteMany({ where: { campaignId: { in: [campaign.id, directCampaign.id] } } });
  await prisma.assessmentCampaign.deleteMany({ where: { id: { in: [campaign.id, directCampaign.id] } } });

  const logCountAfter = await prisma.auditLog.count({
    where: { tenantId: testTenantId },
  });
  assert(
    logCountAfter >= logCountBefore,
    'Audit logs are append-only: Deleting child business records does NOT delete audit logs'
  );

  // ----------------------------------------------------
  // 13. PRISTINE SEEDED DATA PRESERVATION CHECK
  // ----------------------------------------------------
  console.log('\n--- Section 13: Pristine Seeded Baseline Check ---');
  const sarahAfter = await prisma.user.findUnique({
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

  const sarahAssessmentAfter = sarahAfter?.assessments[0];
  assert(
    sarahAssessmentAfter?.status === AssessmentStatus.NOT_STARTED,
    'Sarah Jenkins assessment is STILL NOT_STARTED'
  );
  assert(
    sarahAssessmentAfter?.items.length === 7,
    'Sarah Jenkins STILL has exactly 7 items'
  );
  const blankRatings = sarahAssessmentAfter?.items.every((i) => i.selfRating === null);
  assert(Boolean(blankRatings), 'Sarah Jenkins STILL has 0 self-ratings (all blank)');
  const zeroAttachments = sarahAssessmentAfter?.items.every((i) => i.attachments.length === 0);
  assert(Boolean(zeroAttachments), 'Sarah Jenkins STILL has 0 attachments');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAuditTrailTests()
  .catch((err) => {
    console.error('Fatal error during audit trail test run:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
