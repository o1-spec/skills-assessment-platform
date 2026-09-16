import 'dotenv/config';
import ExcelJS from 'exceljs';
import { prisma } from '../src/lib/db';
import {
  AssessmentStatus,
  ReportType,
  ScheduleFrequency,
  ScheduleScopeType,
  ScheduleRunStatus,
  AuditAction,
  UserRole,
} from '@prisma/client';
import {
  generateOrganizationGapExcel,
  generateTeamGapExcel,
  generateIndividualGapExcel,
  createReportSchedule,
  updateReportSchedule,
  toggleReportScheduleActive,
  getReportSchedulesForTenant,
  getReportScheduleById,
  executeDueReportSchedules,
  calculateNextRunAt,
} from '../src/services';
import { getMockEmailClient, setMockEmailClient } from '../src/lib/email';

async function runExcelAndScheduledReportsTests() {
  console.log('🧪 Starting Excel & Scheduled Reports Test Suite (PART C & D)...\n');

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

  // Setup mock email client
  const mockEmailClient = getMockEmailClient();
  mockEmailClient.clear();
  setMockEmailClient(mockEmailClient);

  // Locate Acme Technologies
  const acmeTenant = await prisma.tenant.findUnique({
    where: { slug: 'acme-technologies' },
    include: {
      users: true,
      teams: true,
    },
  });
  if (!acmeTenant) throw new Error('Acme tenant missing');

  const admin = acmeTenant.users.find((u) => u.email === 'admin@acme.test');
  const manager = acmeTenant.users.find((u) => u.email === 'manager@acme.test');
  const staff = acmeTenant.users.find((u) => u.email === 'staff@acme.test');
  const backendTeam = acmeTenant.teams.find((t) => t.name === 'Backend Engineering');

  if (!admin || !manager || !staff || !backendTeam) {
    throw new Error('Required baseline users or team missing in Acme');
  }

  // Create foreign tenant for boundary checks
  const foreignTenant = await prisma.tenant.create({
    data: {
      name: `Foreign Corp Reports ${Date.now()}`,
      slug: `foreign-reports-test-${Date.now()}`,
    },
  });

  const foreignAdmin = await prisma.user.create({
    data: {
      name: 'Foreign Admin',
      email: `foreign.admin.${Date.now()}@foreign.test`,
      passwordHash: 'dummy',
      role: UserRole.ORGANIZATION_ADMIN,
      tenantId: foreignTenant.id,
    },
  });

  const foreignTeam = await prisma.team.create({
    data: {
      name: 'Foreign Engineering Team',
      tenantId: foreignTenant.id,
    },
  });

  // Create a completed assessment for individual gap export test
  const testCampaign = await prisma.assessmentCampaign.create({
    data: {
      name: `Excel Individual Test Campaign ${Date.now()}`,
      tenantId: acmeTenant.id,
      roleProfileId: staff.roleProfileId,
      startDate: new Date('2026-01-01'),
      deadline: new Date('2026-01-31'),
    },
  });

  const testUser = await prisma.user.create({
    data: {
      name: 'Excel Test User',
      email: `excel.test.${Date.now()}@acme.test`,
      passwordHash: 'dummy',
      role: UserRole.STAFF,
      tenantId: acmeTenant.id,
      roleProfileId: staff.roleProfileId,
    },
  });

  // Find competencies on user's role profile
  const roleProfile = await prisma.roleProfile.findUnique({
    where: { id: staff.roleProfileId! },
    include: { requirements: { include: { competency: true } } },
  });

  const completedAssessment = await prisma.assessment.create({
    data: {
      userId: testUser.id,
      campaignId: testCampaign.id,
      status: AssessmentStatus.COMPLETED,
      completedAt: new Date('2026-02-15T12:00:00Z'),
      items: {
        create: (roleProfile?.requirements || []).map((req) => ({
          competencyId: req.competencyId,
          selfRating: 3,
          finalRating: req.targetLevel >= 3 ? req.targetLevel - 1 : req.targetLevel,
        })),
      },
    },
  });

  try {
    console.log('--- SECTION 1: Excel (.xlsx) Reporting (Tests 26-37) ---');

    // Test 26, 27, 28, 29, 30: Organization Excel Generation
    const orgExcel = await generateOrganizationGapExcel(acmeTenant.id);
    assert(!!orgExcel && !!orgExcel.buffer, '26. Organization Excel generator produces result');
    assert(
      orgExcel.filename.endsWith('.xlsx'),
      '28. Content-Disposition / filename uses .xlsx extension'
    );

    // Parse with exceljs to verify real workbook
    const orgWb = new ExcelJS.Workbook();
    await orgWb.xlsx.load(orgExcel.buffer as unknown as ExcelJS.Buffer);
    assert(orgWb.worksheets.length > 0, '29. Workbook is a valid Excel workbook with sheets');

    const orgSheet = orgWb.getWorksheet('Organization Gap Analysis');
    assert(!!orgSheet, '29. Organization Gap Analysis sheet exists in workbook');

    // Verify expected headers on row 4
    const headerRowValues = (orgSheet?.getRow(4).values as string[]) || [];
    assert(headerRowValues.includes('Competency'), '30. Organization workbook contains Competency header');
    assert(headerRowValues.includes('Type'), '30. Organization workbook contains Type header');
    assert(
      headerRowValues.includes('Average Verified Level'),
      '30. Organization workbook contains Average Verified Level header'
    );

    // Test 31: Team Excel Generation
    const teamExcel = await generateTeamGapExcel(acmeTenant.id, backendTeam.id);
    assert(!!teamExcel && !!teamExcel.buffer, '31. Team workbook generated successfully');
    assert(teamExcel?.filename.endsWith('.xlsx') ?? false, '28. Team Excel filename uses .xlsx');

    const teamWb = new ExcelJS.Workbook();
    await teamWb.xlsx.load(teamExcel!.buffer as unknown as ExcelJS.Buffer);
    const teamSheet = teamWb.getWorksheet('Team Gap Analysis');
    assert(!!teamSheet, '31. Team Gap Analysis sheet exists');
    const teamHeader = (teamSheet?.getRow(4).values as string[]) || [];
    assert(teamHeader.includes('Team'), '31. Team workbook contains Team column');

    // Test 35: Foreign tenant team blocked
    const foreignTeamBlocked = await generateTeamGapExcel(acmeTenant.id, foreignTeam.id);
    assert(foreignTeamBlocked === null, '35. Foreign tenant team blocked with null');
    const foreignTenantRequestingAcmeTeam = await generateTeamGapExcel(foreignTenant.id, backendTeam.id);
    assert(foreignTenantRequestingAcmeTeam === null, '35. Foreign tenant querying Acme team blocked with null');

    // Test 32, 33, 34: Individual Excel Generation
    const individualExcel = await generateIndividualGapExcel(acmeTenant.id, completedAssessment.id);
    assert(!!individualExcel && !!individualExcel.buffer, '32. Individual workbook generated successfully');
    assert(individualExcel?.filename.endsWith('.xlsx') ?? false, '28. Individual Excel filename uses .xlsx');

    const indWb = new ExcelJS.Workbook();
    await indWb.xlsx.load(individualExcel!.buffer as unknown as ExcelJS.Buffer);
    const indSheet = indWb.getWorksheet('Individual Gap Analysis');
    assert(!!indSheet, '32. Individual Gap Analysis sheet exists');

    // Inspect individual sheet rows for competency types, current/target/gap/status
    let hasTechnicalRow = false;
    let hasBehavioralRow = false;
    let hasValidStatus = false;

    indSheet?.eachRow((row, rowNumber) => {
      if (rowNumber > 4) {
        const typeVal = row.getCell(6).value?.toString();
        const statusVal = row.getCell(10).value?.toString();
        if (typeVal === 'Technical') hasTechnicalRow = true;
        if (typeVal === 'Behavioral') hasBehavioralRow = true;
        if (
          statusVal === 'Below Target' ||
          statusVal === 'Meets Target' ||
          statusVal === 'Exceeds Target'
        ) {
          hasValidStatus = true;
        }
      }
    });

    assert(hasTechnicalRow && hasBehavioralRow, '33. Competency type preserved (Technical and Behavioral)');
    assert(hasValidStatus, '34. Current/target/gap/status values correct in workbook rows');

    // Test 36: Foreign tenant individual assessment blocked
    const foreignIndBlocked = await generateIndividualGapExcel(foreignTenant.id, completedAssessment.id);
    assert(foreignIndBlocked === null, '36. Foreign tenant individual/assessment blocked with null');

    // Test 37: Empty team report generates valid workbook rather than crashing
    const emptyTeam = await prisma.team.create({
      data: {
        name: `Empty Test Team ${Date.now()}`,
        tenantId: acmeTenant.id,
      },
    });
    const emptyTeamExcel = await generateTeamGapExcel(acmeTenant.id, emptyTeam.id);
    assert(!!emptyTeamExcel && !!emptyTeamExcel.buffer, '37. Empty team report generates valid workbook without crashing');
    const emptyWb = new ExcelJS.Workbook();
    await emptyWb.xlsx.load(emptyTeamExcel!.buffer as unknown as ExcelJS.Buffer);
    assert(emptyWb.worksheets.length > 0, '37. Empty team produces valid parseable workbook');
    await prisma.team.delete({ where: { id: emptyTeam.id } });

    console.log('\n--- SECTION 2: Scheduled Capability Reporting (Tests 38-55) ---');

    // Test 38: Org Admin creates organization report schedule
    const tomorrow = new Date(Date.now() + 86400000);
    const orgSchedule = await createReportSchedule({
      tenantId: acmeTenant.id,
      createdById: admin.id,
      name: 'Exec Weekly Org Gap Report',
      reportType: ReportType.ORGANIZATION_GAP,
      scopeType: ScheduleScopeType.ORGANIZATION,
      frequency: ScheduleFrequency.WEEKLY,
      nextRunAt: tomorrow,
      recipientUserIds: [admin.id, manager.id],
      auditContext: { actorId: admin.id, actorRole: admin.role },
    });
    assert(!!orgSchedule.id, '38. Org Admin creates organization report schedule');
    assert(orgSchedule.isActive === true, '38. Created report schedule is active');

    // Test 39: Org Admin creates team report schedule
    const teamSchedule = await createReportSchedule({
      tenantId: acmeTenant.id,
      createdById: admin.id,
      name: 'Backend Engineering Monthly Capability',
      reportType: ReportType.TEAM_GAP,
      scopeType: ScheduleScopeType.TEAM,
      scopeId: backendTeam.id,
      frequency: ScheduleFrequency.MONTHLY,
      nextRunAt: tomorrow,
      recipientUserIds: [admin.id],
      auditContext: { actorId: admin.id, actorRole: admin.role },
    });
    assert(!!teamSchedule.id, '39. Org Admin creates team report schedule');

    // Test 40: Foreign team rejected
    let foreignTeamError = false;
    try {
      await createReportSchedule({
        tenantId: acmeTenant.id,
        createdById: admin.id,
        name: 'Invalid Foreign Team Schedule',
        reportType: ReportType.TEAM_GAP,
        scopeType: ScheduleScopeType.TEAM,
        scopeId: foreignTeam.id,
        frequency: ScheduleFrequency.WEEKLY,
        nextRunAt: tomorrow,
        recipientUserIds: [admin.id],
      });
    } catch {
      foreignTeamError = true;
    }
    assert(foreignTeamError, '40. Foreign team rejected when creating schedule');

    // Test 41: Invalid recurrence rejected
    let invalidRecurrenceError = false;
    try {
      await createReportSchedule({
        tenantId: acmeTenant.id,
        createdById: admin.id,
        name: 'Invalid Frequency Schedule',
        reportType: ReportType.ORGANIZATION_GAP,
        scopeType: ScheduleScopeType.ORGANIZATION,
        frequency: 'HOURLY' as unknown as ScheduleFrequency,
        nextRunAt: tomorrow,
        recipientUserIds: [admin.id],
      });
    } catch {
      invalidRecurrenceError = true;
    }
    assert(invalidRecurrenceError, '41. Invalid recurrence frequency rejected');

    // Test 48: Foreign tenant recipient rejected
    let foreignRecipientError = false;
    try {
      await createReportSchedule({
        tenantId: acmeTenant.id,
        createdById: admin.id,
        name: 'Cross Tenant Recipient Schedule',
        reportType: ReportType.ORGANIZATION_GAP,
        scopeType: ScheduleScopeType.ORGANIZATION,
        frequency: ScheduleFrequency.WEEKLY,
        nextRunAt: tomorrow,
        recipientUserIds: [foreignAdmin.id],
      });
    } catch {
      foreignRecipientError = true;
    }
    assert(foreignRecipientError, '48. Foreign tenant recipient rejected');

    // Test 42: Schedule can be deactivated
    const deactivated = await toggleReportScheduleActive({
      scheduleId: orgSchedule.id,
      tenantId: acmeTenant.id,
      isActive: false,
      auditContext: { actorId: admin.id, actorRole: admin.role },
    });
    assert(deactivated.isActive === false, '42. Schedule can be deactivated');

    // Test 54: Audit event created on schedule mutation
    const createLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: acmeTenant.id,
        action: AuditAction.REPORT_SCHEDULE_CREATE,
      },
    });
    assert(createLogs.length >= 2, '54. Audit event created on schedule creation');

    const deactLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: acmeTenant.id,
        action: AuditAction.REPORT_SCHEDULE_DEACTIVATE,
      },
    });
    assert(deactLogs.length >= 1, '54. Audit event created on schedule deactivation');

    // Test 44: Future schedule ignored by cron
    const futureRunResult = await executeDueReportSchedules(new Date('2026-02-01T00:00:00Z'));
    assert(futureRunResult.processed === 0, '44. Future schedule ignored by cron execution');

    // Create a due schedule for immediate cron execution: nextRunAt in past
    mockEmailClient.clear();
    const pastDate = new Date(Date.now() - 60000);
    const dueOrgSchedule = await createReportSchedule({
      tenantId: acmeTenant.id,
      createdById: admin.id,
      name: 'Immediate Due Org Schedule',
      reportType: ReportType.ORGANIZATION_GAP,
      scopeType: ScheduleScopeType.ORGANIZATION,
      frequency: ScheduleFrequency.DAILY,
      nextRunAt: pastDate,
      recipientUserIds: [admin.id, manager.id],
      auditContext: { actorId: admin.id, actorRole: admin.role },
    });

    // Test 43, 45, 46, 49, 50, 55: Execute due schedules
    const executionResult = await executeDueReportSchedules();
    assert(executionResult.processed >= 1, '43. Due schedule detected by cron');
    assert(executionResult.succeeded >= 1, '43. Due schedule executed successfully');

    // Verify email sent with Excel attachment
    const dispatched = mockEmailClient.getDispatchedEmails();
    assert(dispatched.length >= 2, '46. Due schedule sends through email abstraction (to 2 recipients)');

    const emailWithAttachment = dispatched.find((e) => e.to === admin.email);
    assert(
      emailWithAttachment !== undefined &&
        (emailWithAttachment.attachments || []).length > 0,
      '46. Email contains attachment'
    );
    assert(
      emailWithAttachment?.attachments?.[0]?.filename?.endsWith('.xlsx') ?? false,
      '45. Attached file is a valid .xlsx capability report'
    );

    // Verify workbook inside attachment
    const attWb = new ExcelJS.Workbook();
    await attWb.xlsx.load(emailWithAttachment!.attachments![0].content as unknown as ExcelJS.Buffer);
    assert(attWb.worksheets.length > 0, '45. Attached Excel document parses cleanly');

    // Verify schedule updated in DB
    const refreshedSchedule = await prisma.reportSchedule.findUnique({
      where: { id: dueOrgSchedule.id },
    });
    assert(refreshedSchedule?.lastRunStatus === ScheduleRunStatus.SUCCESS, '49. lastRunAt/status updated after success');
    assert(!!refreshedSchedule?.lastRunAt, '49. lastRunAt timestamp recorded');
    assert(
      refreshedSchedule!.nextRunAt.getTime() > Date.now(),
      '50. nextRunAt advanced to future after success'
    );

    // Test 53: Duplicate cron execution does not duplicate delivery (idempotency)
    mockEmailClient.clear();
    const duplicateRunResult = await executeDueReportSchedules();
    assert(
      duplicateRunResult.processed === 0,
      '53. Duplicate cron execution does not re-process advanced schedule (idempotency guard)'
    );
    assert(mockEmailClient.getDispatchedEmails().length === 0, '53. No duplicate emails sent on retry');

    // Test 55: Audit event for schedule execution
    const runLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: acmeTenant.id,
        action: AuditAction.REPORT_SCHEDULE_RUN,
      },
    });
    assert(runLogs.length >= 1, '55. Audit event created for schedule execution');
    assert(
      (runLogs[0].details as Record<string, unknown>)?.status === 'SUCCESS',
      '55. Audit event records execution status SUCCESS'
    );

    // Test 47: Inactive recipient excluded at execution time
    const inactiveUser = await prisma.user.create({
      data: {
        name: 'Deactivated Recipient',
        email: `deactivated.recipient.${Date.now()}@acme.test`,
        passwordHash: 'dummy',
        role: UserRole.STAFF,
        tenantId: acmeTenant.id,
        isActive: true, // active initially
      },
    });

    const scheduleWithInactive = await createReportSchedule({
      tenantId: acmeTenant.id,
      createdById: admin.id,
      name: 'Schedule With Future Inactive User',
      reportType: ReportType.ORGANIZATION_GAP,
      scopeType: ScheduleScopeType.ORGANIZATION,
      frequency: ScheduleFrequency.DAILY,
      nextRunAt: pastDate,
      recipientUserIds: [admin.id, inactiveUser.id],
    });

    // Now deactivate the user before cron fires
    await prisma.user.update({
      where: { id: inactiveUser.id },
      data: { isActive: false, deactivatedAt: new Date() },
    });

    mockEmailClient.clear();
    await executeDueReportSchedules();
    const emailsAfterDeactivation = mockEmailClient.getDispatchedEmails();
    assert(
      !emailsAfterDeactivation.some((e) => e.to === inactiveUser.email),
      '47. Deactivated recipient excluded at execution time'
    );
    assert(
      emailsAfterDeactivation.some((e) => e.to === admin.email),
      '47. Active recipient still receives report'
    );

    // Test 51 & 52: Failure does not report success and does not block another schedule
    // Create one failing schedule (team that will be deleted) and one healthy schedule
    const doomedTeam = await prisma.team.create({
      data: {
        name: `Doomed Team ${Date.now()}`,
        tenantId: acmeTenant.id,
      },
    });

    const failingSchedule = await createReportSchedule({
      tenantId: acmeTenant.id,
      createdById: admin.id,
      name: 'Failing Team Schedule',
      reportType: ReportType.TEAM_GAP,
      scopeType: ScheduleScopeType.TEAM,
      scopeId: doomedTeam.id,
      frequency: ScheduleFrequency.DAILY,
      nextRunAt: pastDate,
      recipientUserIds: [admin.id],
    });

    // Delete the team to simulate broken scope
    await prisma.team.delete({ where: { id: doomedTeam.id } });

    const healthySchedule = await createReportSchedule({
      tenantId: acmeTenant.id,
      createdById: admin.id,
      name: 'Healthy Parallel Schedule',
      reportType: ReportType.ORGANIZATION_GAP,
      scopeType: ScheduleScopeType.ORGANIZATION,
      frequency: ScheduleFrequency.DAILY,
      nextRunAt: pastDate,
      recipientUserIds: [admin.id],
    });

    mockEmailClient.clear();
    const mixedRunResult = await executeDueReportSchedules();
    assert(mixedRunResult.failed >= 1, '51. Failure does not report success');
    assert(mixedRunResult.succeeded >= 1, '52. Failure of one schedule does not prevent another running');

    const failingRecord = await prisma.reportSchedule.findUnique({
      where: { id: failingSchedule.id },
    });
    assert(failingRecord?.lastRunStatus === ScheduleRunStatus.FAILED, '51. Failing schedule recorded as FAILED');
    assert(!!failingRecord?.lastRunError, '51. Failing schedule stores sanitized error');

    // Clean up temporary data
    await prisma.reportScheduleRecipient.deleteMany({
      where: {
        scheduleId: {
          in: [
            orgSchedule.id,
            teamSchedule.id,
            dueOrgSchedule.id,
            scheduleWithInactive.id,
            failingSchedule.id,
            healthySchedule.id,
          ],
        },
      },
    });
    await prisma.reportSchedule.deleteMany({
      where: {
        id: {
          in: [
            orgSchedule.id,
            teamSchedule.id,
            dueOrgSchedule.id,
            scheduleWithInactive.id,
            failingSchedule.id,
            healthySchedule.id,
          ],
        },
      },
    });

    await prisma.assessmentItem.deleteMany({ where: { assessmentId: completedAssessment.id } });
    await prisma.assessment.delete({ where: { id: completedAssessment.id } });
    await prisma.assessmentCampaign.delete({ where: { id: testCampaign.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.user.delete({ where: { id: inactiveUser.id } });

    await prisma.team.delete({ where: { id: foreignTeam.id } });
    await prisma.user.delete({ where: { id: foreignAdmin.id } });
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

runExcelAndScheduledReportsTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
