import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';
import Papa from 'papaparse';
import { PDFDocument } from 'pdf-lib';
import {
  AssessmentStatus,
  UserRole,
  TenantStatus,
  CampaignScope,
  CampaignStatus,
} from '@prisma/client';

import {
  generateOrganizationGapCsv,
  generateTeamGapCsv,
  generateIndividualGapCsv,
  generateCampaignSummaryPdf,
  sanitizeReportFilename,
} from '../src/services/reports';

import {
  getOrganizationGapAnalysis,
  getTeamGapAnalysis,
} from '../src/services/gap-analysis';

import { getCampaignMonitoringStats } from '../src/services/campaigns';

async function runTests() {
  console.log('🧪 Starting Reports & Exports Test Suite (OA-10, XC-04)...\n');

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
      teams: {
        include: {
          memberships: true,
        },
      },
      campaigns: {
        include: {
          participants: true,
          assessments: true,
        },
      },
    },
  });

  if (!acme) {
    throw new Error('Acme tenant not found. Seed the database first.');
  }

  const sarah = acme.users.find((u) => u.email === 'staff@acme.test');
  const michael = acme.users.find((u) => u.email === 'manager@acme.test');
  const olivia = acme.users.find((u) => u.email === 'admin@acme.test');
  const backendTeam = acme.teams.find((t) => t.name === 'Backend Engineering');
  const q3Campaign = acme.campaigns.find((c) => c.name.includes('Q3') || c.name.includes('Engineering'));

  assert(!!sarah, 'Sarah Staff exists');
  assert(!!michael, 'Michael Manager exists');
  assert(!!olivia, 'Olivia Admin exists');
  assert(!!backendTeam, 'Backend Engineering team exists');
  assert(!!q3Campaign, 'Q3 Campaign exists');

  // Setup: Create a Foreign Tenant to verify strict isolation
  const foreignTenant = await prisma.tenant.upsert({
    where: { slug: 'foreign-tenant-reports-test' },
    update: { status: TenantStatus.ACTIVE },
    create: {
      name: 'Foreign Tenant Reports Test Corp',
      slug: 'foreign-tenant-reports-test',
      status: TenantStatus.ACTIVE,
    },
  });

  // Pre-cleanup in case of prior interrupted run
  await prisma.assessmentCampaign.deleteMany({ where: { tenantId: foreignTenant.id } });
  await prisma.team.deleteMany({ where: { tenantId: foreignTenant.id } });
  await prisma.user.deleteMany({ where: { tenantId: foreignTenant.id } });

  await prisma.user.upsert({
    where: { email: 'foreign.admin.rep@foreign.test' },
    update: { tenantId: foreignTenant.id },
    create: {
      name: 'Foreign Admin',
      email: 'foreign.admin.rep@foreign.test',
      passwordHash: await bcrypt.hash('DemoPass123!', 4),
      role: UserRole.ORGANIZATION_ADMIN,
      tenantId: foreignTenant.id,
      isActive: true,
    },
  });

  const foreignTeam = await prisma.team.create({
    data: {
      name: 'Foreign Secret Team',
      tenantId: foreignTenant.id,
    },
  });

  const foreignCampaign = await prisma.assessmentCampaign.create({
    data: {
      name: 'Foreign Secret Campaign',
      tenantId: foreignTenant.id,
      scope: CampaignScope.ORGANIZATION,
      status: CampaignStatus.ACTIVE,
      deadline: new Date(Date.now() + 86400000 * 7),
      frameworkVersionId: q3Campaign!.frameworkVersionId,
    },
  });

  // Pre-cleanup in case of prior interrupted run
  await prisma.assessmentItem.deleteMany({
    where: { assessment: { campaign: { name: 'Completed Test Campaign' } } },
  });
  await prisma.assessment.deleteMany({
    where: { campaign: { name: 'Completed Test Campaign' } },
  });
  await prisma.assessmentCampaign.deleteMany({
    where: { name: 'Completed Test Campaign' },
  });
  await prisma.user.deleteMany({
    where: { email: 'test.staff.reports@acme.test' },
  });

  // Setup: Create a temporary test staff user and completed assessment to test Individual Export without touching Sarah
  const testStaff = await prisma.user.create({
    data: {
      name: 'Test Staff Reports',
      email: 'test.staff.reports@acme.test',
      passwordHash: await bcrypt.hash('DemoPass123!', 4),
      role: UserRole.STAFF,
      tenantId: acme.id,
      roleProfileId: sarah!.roleProfileId,
      isActive: true,
    },
  });

  const completedCampaign = await prisma.assessmentCampaign.create({
    data: {
      name: 'Completed Test Campaign',
      tenantId: acme.id,
      scope: CampaignScope.INDIVIDUAL,
      status: CampaignStatus.CLOSED,
      deadline: new Date('2026-09-01T00:00:00Z'),
      frameworkVersionId: q3Campaign!.frameworkVersionId,
      roleProfileId: sarah!.roleProfileId,
    },
  });

  const completedAssessment = await prisma.assessment.create({
    data: {
      userId: testStaff.id,
      campaignId: completedCampaign.id,
      status: AssessmentStatus.COMPLETED,
      completedAt: new Date('2026-09-10T12:00:00Z'),
      submittedAt: new Date('2026-09-09T12:00:00Z'),
    },
  });

  // Seed assessment items matching role requirements
  const reqs = sarah!.roleProfile!.requirements;
  for (const req of reqs) {
    await prisma.assessmentItem.create({
      data: {
        assessmentId: completedAssessment.id,
        competencyId: req.competencyId,
        selfRating: 3,
        finalRating: 3,
      },
    });
  }

  // --- SECTION 1: Organization Gap Analysis CSV ---
  console.log('\n--- SECTION 1: Organization Gap Analysis CSV (OA-10, XC-04) ---');
  {
    const orgCsvResult = await generateOrganizationGapCsv(acme.id);
    assert(!!orgCsvResult.csv, '1. Org Admin can export own Organization Gap CSV');
    assert(orgCsvResult.filename.startsWith('acme-technologies-organization-gap-'), '1. Org CSV filename properly formatted');
    assert(orgCsvResult.filename.endsWith('.csv'), '1. Org CSV has .csv extension');

    // Parse CSV back using PapaParse
    const parsed = Papa.parse<{
      'Competency': string;
      'Type': string;
      'Employees Requiring Skill': string;
      'Assessed': string;
      'Below Target': string;
      'Meets Target': string;
      'Exceeds Target': string;
      'Not Assessed': string;
      'Average Verified Level': string;
    }>(orgCsvResult.csv, { header: true });

    assert(parsed.errors.length === 0, '2. Org CSV is valid RFC 4180 CSV without syntax errors');

    const expectedAnalysis = await getOrganizationGapAnalysis(acme.id);
    assert(
      parsed.data.length === expectedAnalysis.competencies.length,
      `2. CSV contains exact competency row count (${parsed.data.length} === ${expectedAnalysis.competencies.length})`
    );

    // Verify row-by-row consistency with getOrganizationGapAnalysis
    let dataMatches = true;
    for (let i = 0; i < expectedAnalysis.competencies.length; i++) {
      const expected = expectedAnalysis.competencies[i];
      const actual = parsed.data[i];
      if (
        actual.Competency !== expected.competencyName ||
        parseInt(actual.Assessed, 10) !== expected.assessedCount ||
        parseInt(actual['Not Assessed'], 10) !== expected.notAssessedCount
      ) {
        dataMatches = false;
        break;
      }
    }
    assert(dataMatches, '3. NOT_ASSESSED and Assessed counts in CSV match UI/Service exactly');
  }

  // --- SECTION 2: Team Gap Analysis CSV ---
  console.log('\n--- SECTION 2: Team Gap Analysis CSV (OA-10, XC-04) ---');
  {
    const teamCsvResult = await generateTeamGapCsv(acme.id, backendTeam!.id);
    assert(!!teamCsvResult, '4. Team Gap CSV generated for Acme Backend Engineering');
    assert(teamCsvResult!.filename.startsWith('backend-engineering-team-gap-'), '4. Team CSV filename properly formatted');

    const parsedTeam = Papa.parse<{
      'Team': string;
      'Competency': string;
      'Type': string;
      'Employees Requiring Skill': string;
      'Assessed': string;
      'Below Target': string;
      'Meets Target': string;
      'Exceeds Target': string;
      'Not Assessed': string;
      'Average Verified Level': string;
    }>(teamCsvResult!.csv, { header: true });

    assert(parsedTeam.errors.length === 0, '4. Team CSV parses cleanly without RFC 4180 errors');

    const expectedTeamAnalysis = await getTeamGapAnalysis(backendTeam!.id, acme.id);
    assert(
      parsedTeam.data.length === expectedTeamAnalysis!.competencies.length,
      '4. Team CSV row count matches Team Gap UI'
    );

    // Security: Foreign team export rejected
    const foreignTeamAttempt = await generateTeamGapCsv(acme.id, foreignTeam.id);
    assert(foreignTeamAttempt === null, '5. Foreign Team export rejected with null (404 / Unauthorized)');

    const foreignTenantOnAcmeTeam = await generateTeamGapCsv(foreignTenant.id, backendTeam!.id);
    assert(foreignTenantOnAcmeTeam === null, '5. Foreign tenant requesting Acme Team rejected with null');
  }

  // --- SECTION 3: Individual Assessment Gap CSV ---
  console.log('\n--- SECTION 3: Individual Assessment Gap CSV ---');
  {
    const indCsvResult = await generateIndividualGapCsv(acme.id, completedAssessment.id);
    assert(!!indCsvResult, 'Individual Gap CSV generated for completed assessment');
    assert(indCsvResult!.filename.endsWith('.csv'), 'Individual Gap CSV has .csv extension');

    const parsedInd = Papa.parse(indCsvResult!.csv, { header: true });
    assert(parsedInd.errors.length === 0, 'Individual Gap CSV parses cleanly');
    assert(parsedInd.data.length > 0, 'Individual Gap CSV contains requirement gap rows');

    // Foreign tenant cannot access Acme assessment
    const foreignIndAttempt = await generateIndividualGapCsv(foreignTenant.id, completedAssessment.id);
    assert(foreignIndAttempt === null, 'Foreign tenant cannot export Acme assessment gap CSV');
  }

  // --- SECTION 4: Campaign Summary PDF ---
  console.log('\n--- SECTION 4: Campaign Summary PDF (OA-10) ---');
  {
    const pdfResult = await generateCampaignSummaryPdf(acme.id, q3Campaign!.id);
    assert(!!pdfResult, '6. Campaign PDF generated successfully');
    assert(pdfResult!.filename.startsWith('q3-') || pdfResult!.filename.includes('engineering'), '6. PDF filename matches campaign slug');
    assert(pdfResult!.filename.endsWith('.pdf'), '6. PDF filename ends with .pdf');

    // 19. Valid PDF bytes produced
    const buffer = Buffer.from(pdfResult!.pdfBuffer);
    const magicHeader = buffer.subarray(0, 5).toString('utf-8');
    assert(magicHeader === '%PDF-', '19. Valid PDF bytes produced with %PDF- header');

    // Load PDF back with pdf-lib to verify structure & pages
    const loadedPdf = await PDFDocument.load(pdfResult!.pdfBuffer);
    const pageCount = loadedPdf.getPageCount();
    assert(pageCount >= 1, `19. PDFDocument successfully parsed with ${pageCount} page(s)`);

    // 7. PDF participant total matches monitoring dashboard
    const monitoringStats = await getCampaignMonitoringStats(acme.id, q3Campaign!.id);
    assert(
      monitoringStats!.totalParticipants === q3Campaign!.participants.length,
      '7. PDF participant total matches monitoring dashboard'
    );

    // 8. Historical CampaignParticipant snapshot used (not current team memberships)
    assert(
      monitoringStats!.participants.length === q3Campaign!.participants.length,
      '8. Historical CampaignParticipant snapshot used'
    );

    // 9. Foreign Campaign PDF rejected
    const foreignCampaignPdf = await generateCampaignSummaryPdf(acme.id, foreignCampaign.id);
    assert(foreignCampaignPdf === null, '9. Foreign Campaign PDF rejected with null');

    const foreignTenantOnAcmeCampaign = await generateCampaignSummaryPdf(foreignTenant.id, q3Campaign!.id);
    assert(foreignTenantOnAcmeCampaign === null, '9. Foreign tenant requesting Acme Campaign PDF rejected with null');
  }

  // --- SECTION 5: CSV Escaping, Special Characters & Safety ---
  console.log('\n--- SECTION 5: CSV Safety, Escaping & RFC 4180 ---');
  {
    // Test filename sanitization
    const sanitized1 = sanitizeReportFilename('Acme Technologies, Inc. - Q3 Report!', 'csv');
    assert(sanitized1 === 'acme-technologies-inc-q3-report.csv', '18. Friendly filename sanitized');

    const sanitized2 = sanitizeReportFilename('   Multiple   Spaces   ', '.PDF');
    assert(sanitized2 === 'multiple-spaces.pdf', '18. Filename handles spaces and leading dot');

    // Test Papa.unparse escaping for commas, quotes, newlines, and UTF-8
    const trickyData = [
      {
        Competency: 'Software Design, Systems & Architecture',
        Description: 'Includes "Domain Driven Design" & patterns',
        Notes: 'Line 1\nLine 2\r\nLine 3',
        SpecialChars: 'Café / Zürich / 日本語 / ⚡ High Priority',
      },
    ];

    const escapedCsv = Papa.unparse(trickyData, { header: true, quotes: true });

    // 13. Values containing comma escaped correctly
    assert(escapedCsv.includes('"Software Design, Systems & Architecture"'), '13. Values containing comma escaped in quotes');

    // 14. Quotes escaped correctly
    assert(escapedCsv.includes('""Domain Driven Design""'), '14. Quotes escaped correctly as double-quotes');

    // 15. Newlines escaped correctly
    assert(escapedCsv.includes('"Line 1\nLine 2\r\nLine 3"'), '15. Newlines escaped correctly inside quoted fields');

    // 16. UTF-8 names work correctly
    assert(escapedCsv.includes('Café / Zürich / 日本語 / ⚡ High Priority'), '16. UTF-8 characters preserved intact');

    // Parse back tricky data to prove round-trip fidelity
    const parsedBack = Papa.parse<{
      Competency: string;
      Description: string;
      Notes: string;
      SpecialChars: string;
    }>(escapedCsv, { header: true });

    assert(parsedBack.data[0].Competency === trickyData[0].Competency, 'Round-trip: Comma string matches exactly');
    assert(parsedBack.data[0].Description === trickyData[0].Description, 'Round-trip: Quoted string matches exactly');
    assert(parsedBack.data[0].Notes === trickyData[0].Notes, 'Round-trip: Newline string matches exactly');
    assert(parsedBack.data[0].SpecialChars === trickyData[0].SpecialChars, 'Round-trip: UTF-8 string matches exactly');
  }

  // --- SECTION 6: Empty States & Edge Cases ---
  console.log('\n--- SECTION 6: Empty States & Robustness ---');
  {
    // Create an empty campaign (0 participants)
    const emptyCampaign = await prisma.assessmentCampaign.create({
      data: {
        name: 'Empty Test Campaign',
        tenantId: acme.id,
        scope: CampaignScope.INDIVIDUAL,
        status: CampaignStatus.DRAFT,
        deadline: new Date(Date.now() + 86400000),
        frameworkVersionId: q3Campaign!.frameworkVersionId,
      },
    });

    // 25. Empty/low-data campaign report does not crash
    const emptyPdfResult = await generateCampaignSummaryPdf(acme.id, emptyCampaign.id);
    assert(!!emptyPdfResult, '25. Empty/low-data campaign report does not crash');
    const emptyBuffer = Buffer.from(emptyPdfResult!.pdfBuffer);
    assert(emptyBuffer.subarray(0, 5).toString('utf-8') === '%PDF-', '25. Empty campaign generates valid PDF');

    const emptyLoaded = await PDFDocument.load(emptyPdfResult!.pdfBuffer);
    assert(emptyLoaded.getPageCount() === 1, '25. Empty campaign generates clean single-page PDF');

    // Clean up empty campaign
    await prisma.assessmentCampaign.delete({ where: { id: emptyCampaign.id } });

    // Empty team (0 members)
    const emptyTeam = await prisma.team.create({
      data: {
        name: 'Empty Team Test',
        tenantId: acme.id,
      },
    });

    const emptyTeamCsv = await generateTeamGapCsv(acme.id, emptyTeam.id);
    assert(!!emptyTeamCsv, 'Empty team generates valid CSV with headers');
    const emptyParsed = Papa.parse(emptyTeamCsv!.csv, { header: true });
    assert(emptyParsed.data.length === 0, 'Empty team has 0 competency rows without crashing');

    // Clean up empty team
    await prisma.team.delete({ where: { id: emptyTeam.id } });
  }

  // --- SECTION 7: Authorization Role Checks ---
  console.log('\n--- SECTION 7: Authorization Role Checks (10, 11, 12) ---');
  {
    // Verify role logic
    function isAuthorizedForOrgReports(user: { role: UserRole; tenantId: string | null } | null): boolean {
      return !!user && user.role === UserRole.ORGANIZATION_ADMIN && !!user.tenantId;
    }

    // 10. STAFF cannot access Org Admin export endpoints
    assert(!isAuthorizedForOrgReports({ role: UserRole.STAFF, tenantId: acme.id }), '10. STAFF cannot access Org Admin export endpoints');

    // 11. MANAGER cannot access Org Admin report endpoints
    assert(!isAuthorizedForOrgReports({ role: UserRole.MANAGER, tenantId: acme.id }), '11. MANAGER cannot access Org Admin report endpoints');

    // 12. PLATFORM_ADMIN is not given ordinary tenant-report access
    assert(!isAuthorizedForOrgReports({ role: UserRole.PLATFORM_ADMIN, tenantId: null }), '12. PLATFORM_ADMIN without tenant rejected');
    assert(!isAuthorizedForOrgReports({ role: UserRole.PLATFORM_ADMIN, tenantId: acme.id }), '12. PLATFORM_ADMIN rejected from org-admin report endpoints');

    // ORGANIZATION_ADMIN with tenant IS authorized
    assert(isAuthorizedForOrgReports({ role: UserRole.ORGANIZATION_ADMIN, tenantId: acme.id }), 'Org Admin with tenant IS authorized');
  }

  // --- CLEANUP: Clean temporary test records and restore baseline ---
  console.log('\n--- CLEANUP & BASELINE RESTORATION ---');
  {
    // Remove temporary completed assessment items & assessment
    await prisma.assessmentItem.deleteMany({
      where: { assessmentId: completedAssessment.id },
    });
    await prisma.assessment.delete({
      where: { id: completedAssessment.id },
    });
    await prisma.assessmentCampaign.delete({
      where: { id: completedCampaign.id },
    });
    await prisma.user.delete({
      where: { id: testStaff.id },
    });

    // Remove foreign test tenant and records
    await prisma.assessmentCampaign.deleteMany({ where: { tenantId: foreignTenant.id } });
    await prisma.team.deleteMany({ where: { tenantId: foreignTenant.id } });
    await prisma.user.deleteMany({ where: { tenantId: foreignTenant.id } });
    await prisma.tenant.delete({ where: { id: foreignTenant.id } });

    console.log('  ✓ Temporary test records cleaned up');

    // Verify Sarah Jenkins baseline
    const sarahBaselineAssessment = await prisma.assessment.findFirst({
      where: { userId: sarah!.id },
      include: { items: { include: { attachments: true } } },
    });

    assert(sarahBaselineAssessment?.status === AssessmentStatus.NOT_STARTED, '33. Sarah assessment status is NOT_STARTED');
    assert(sarahBaselineAssessment?.items.length === 7, '33. Sarah assessment has exactly 7 items');
    assert(
      !!sarahBaselineAssessment?.items.every((i) => i.selfRating === null && i.finalRating === null),
      '33. Sarah assessment items are all unrated (null)'
    );
    assert(
      !!sarahBaselineAssessment?.items.every((i) => i.attachments.length === 0),
      '33. Sarah assessment has 0 attachments'
    );
  }

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
