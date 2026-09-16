import { prisma } from '@/lib/db';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  getOrganizationGapAnalysis,
  getTeamGapAnalysis,
  getAssessmentGapAnalysis,
} from './gap-analysis';
import { getCampaignById, getCampaignMonitoringStats } from './campaigns';
import { formatDate, formatAssessmentStatus, formatCampaignStatus } from '@/lib/format';
import { CompetencyType } from '@prisma/client';

export function sanitizeReportFilename(rawName: string, extension: string): string {
  const ext = extension.startsWith('.') ? extension.slice(1).toLowerCase() : extension.toLowerCase();
  const slug = rawName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'report'}.${ext}`;
}

function getFilenameDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface OrganizationGapCsvResult {
  filename: string;
  csv: string;
}

export async function generateOrganizationGapCsv(tenantId: string): Promise<OrganizationGapCsvResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true },
  });

  const tenantSlug = tenant?.slug || 'organization';
  const filename = sanitizeReportFilename(
    `${tenantSlug}-organization-gap-${getFilenameDate()}`,
    'csv'
  );

  const orgAnalysis = await getOrganizationGapAnalysis(tenantId);

  const rows = orgAnalysis.competencies.map((comp) => ({
    'Competency': comp.competencyName,
    'Type': comp.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral',
    'Employees Requiring Skill': comp.employeesRequiringCount,
    'Assessed': comp.assessedCount,
    'Below Target': comp.belowTargetCount,
    'Meets Target': comp.meetsTargetCount,
    'Exceeds Target': comp.exceedsTargetCount,
    'Not Assessed': comp.notAssessedCount,
    'Average Verified Level':
      comp.averageVerifiedLevel !== null ? comp.averageVerifiedLevel.toFixed(1) : 'N/A',
  }));

  const csv = Papa.unparse(rows, {
    header: true,
    quotes: true,
  });

  return { filename, csv };
}

export interface TeamGapCsvResult {
  filename: string;
  csv: string;
}

export async function generateTeamGapCsv(
  tenantId: string,
  teamId: string
): Promise<TeamGapCsvResult | null> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, tenantId },
    select: { id: true, name: true },
  });

  if (!team) return null;

  const teamAnalysis = await getTeamGapAnalysis(teamId, tenantId);
  if (!teamAnalysis) return null;

  const filename = sanitizeReportFilename(
    `${team.name}-team-gap-${getFilenameDate()}`,
    'csv'
  );

  const rows = teamAnalysis.competencies.map((comp) => ({
    'Team': team.name,
    'Competency': comp.competencyName,
    'Type': comp.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral',
    'Employees Requiring Skill': comp.employeesRequiringCount,
    'Assessed': comp.assessedCount,
    'Below Target': comp.belowTargetCount,
    'Meets Target': comp.meetsTargetCount,
    'Exceeds Target': comp.exceedsTargetCount,
    'Not Assessed': comp.notAssessedCount,
    'Average Verified Level':
      comp.averageVerifiedLevel !== null ? comp.averageVerifiedLevel.toFixed(1) : 'N/A',
  }));

  const csv = Papa.unparse(rows, {
    header: true,
    quotes: true,
  });

  return { filename, csv };
}

export interface IndividualGapCsvResult {
  filename: string;
  csv: string;
}

export async function generateIndividualGapCsv(
  tenantId: string,
  assessmentId: string
): Promise<IndividualGapCsvResult | null> {
  const gapDetail = await getAssessmentGapAnalysis(assessmentId, tenantId);
  if (!gapDetail) return null;

  const filename = sanitizeReportFilename(
    `${gapDetail.user.name}-${gapDetail.roleProfile.name}-gap-${getFilenameDate()}`,
    'csv'
  );

  const allGaps = [...gapDetail.technicalGaps, ...gapDetail.behavioralGaps];

  const rows = allGaps.map((item) => {
    let statusLabel = 'Meets Target';
    if (item.status === 'BELOW_TARGET') statusLabel = 'Below Target';
    else if (item.status === 'EXCEEDS_TARGET') statusLabel = 'Exceeds Target';

    return {
      'Employee': gapDetail.user.name,
      'Email': gapDetail.user.email,
      'Role Profile': gapDetail.roleProfile.name,
      'Campaign': gapDetail.campaign.name,
      'Competency': item.competencyName,
      'Type': item.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral',
      'Current Verified Level': item.currentLevel,
      'Target Level': item.targetLevel,
      'Gap': item.gap,
      'Status': statusLabel,
    };
  });

  const csv = Papa.unparse(rows, {
    header: true,
    quotes: true,
  });

  return { filename, csv };
}

export interface ExcelReportResult {
  filename: string;
  buffer: Buffer;
}

function styleExcelHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };
  row.alignment = { vertical: 'middle', horizontal: 'left' };
  row.height = 24;
}

function autoFitExcelColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 14;
    if (column.values) {
      column.values.forEach((v) => {
        const str = v !== undefined && v !== null ? v.toString() : '';
        if (str.length > maxLength) {
          maxLength = Math.min(str.length + 3, 50);
        }
      });
    }
    column.width = maxLength;
  });
}

export async function generateOrganizationGapExcel(
  tenantId: string
): Promise<ExcelReportResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true },
  });

  const tenantName = tenant?.name || 'Organization';
  const tenantSlug = tenant?.slug || 'organization';
  const filename = sanitizeReportFilename(
    `${tenantSlug}-organization-gap-${getFilenameDate()}`,
    'xlsx'
  );

  const orgAnalysis = await getOrganizationGapAnalysis(tenantId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Skills Assessment Platform';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Organization Gap Analysis');

  const titleRow = worksheet.addRow([`${tenantName} — Organization Capability Gap Analysis`]);
  titleRow.font = { bold: true, size: 14, color: { argb: 'FF111827' } };

  const metaRow = worksheet.addRow([
    `Generated: ${new Date().toISOString()} | Scope: Organization-wide`,
  ]);
  metaRow.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };

  worksheet.addRow([]);

  const headerRow = worksheet.addRow([
    'Competency',
    'Type',
    'Employees Requiring Skill',
    'Assessed',
    'Below Target',
    'Meets Target',
    'Exceeds Target',
    'Not Assessed',
    'Average Verified Level',
  ]);
  styleExcelHeaderRow(headerRow);

  for (const comp of orgAnalysis.competencies) {
    worksheet.addRow([
      comp.competencyName,
      comp.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral',
      comp.employeesRequiringCount,
      comp.assessedCount,
      comp.belowTargetCount,
      comp.meetsTargetCount,
      comp.exceedsTargetCount,
      comp.notAssessedCount,
      comp.averageVerifiedLevel !== null ? Number(comp.averageVerifiedLevel.toFixed(1)) : 'N/A',
    ]);
  }

  autoFitExcelColumns(worksheet);

  const uint8 = await workbook.xlsx.writeBuffer();
  return {
    filename,
    buffer: Buffer.from(uint8),
  };
}

export async function generateTeamGapExcel(
  tenantId: string,
  teamId: string
): Promise<ExcelReportResult | null> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, tenantId },
    select: { id: true, name: true },
  });

  if (!team) return null;

  const teamAnalysis = await getTeamGapAnalysis(teamId, tenantId);
  if (!teamAnalysis) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  const tenantName = tenant?.name || 'Organization';

  const filename = sanitizeReportFilename(
    `${team.name}-team-gap-${getFilenameDate()}`,
    'xlsx'
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Skills Assessment Platform';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Team Gap Analysis');

  const titleRow = worksheet.addRow([`${team.name} — Team Capability Gap Analysis`]);
  titleRow.font = { bold: true, size: 14, color: { argb: 'FF111827' } };

  const metaRow = worksheet.addRow([
    `Organization: ${tenantName} | Generated: ${new Date().toISOString()} | Scope: Team (${team.name})`,
  ]);
  metaRow.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };

  worksheet.addRow([]);

  const headerRow = worksheet.addRow([
    'Team',
    'Competency',
    'Type',
    'Employees Requiring Skill',
    'Assessed',
    'Below Target',
    'Meets Target',
    'Exceeds Target',
    'Not Assessed',
    'Average Verified Level',
  ]);
  styleExcelHeaderRow(headerRow);

  for (const comp of teamAnalysis.competencies) {
    worksheet.addRow([
      team.name,
      comp.competencyName,
      comp.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral',
      comp.employeesRequiringCount,
      comp.assessedCount,
      comp.belowTargetCount,
      comp.meetsTargetCount,
      comp.exceedsTargetCount,
      comp.notAssessedCount,
      comp.averageVerifiedLevel !== null ? Number(comp.averageVerifiedLevel.toFixed(1)) : 'N/A',
    ]);
  }

  autoFitExcelColumns(worksheet);

  const uint8 = await workbook.xlsx.writeBuffer();
  return {
    filename,
    buffer: Buffer.from(uint8),
  };
}

export async function generateIndividualGapExcel(
  tenantId: string,
  assessmentId: string
): Promise<ExcelReportResult | null> {
  const gapDetail = await getAssessmentGapAnalysis(assessmentId, tenantId);
  if (!gapDetail) return null;

  const filename = sanitizeReportFilename(
    `${gapDetail.user.name}-${gapDetail.roleProfile.name}-gap-${getFilenameDate()}`,
    'xlsx'
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Skills Assessment Platform';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Individual Gap Analysis');

  const titleRow = worksheet.addRow([`${gapDetail.user.name} — Individual Capability Gap Analysis`]);
  titleRow.font = { bold: true, size: 14, color: { argb: 'FF111827' } };

  const metaRow = worksheet.addRow([
    `Role Profile: ${gapDetail.roleProfile.name} | Campaign: ${gapDetail.campaign.name} | Generated: ${new Date().toISOString()}`,
  ]);
  metaRow.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };

  worksheet.addRow([]);

  const headerRow = worksheet.addRow([
    'Employee',
    'Email',
    'Role Profile',
    'Campaign',
    'Competency',
    'Type',
    'Current Verified Level',
    'Target Level',
    'Gap',
    'Status',
  ]);
  styleExcelHeaderRow(headerRow);

  const allGaps = [...gapDetail.technicalGaps, ...gapDetail.behavioralGaps];
  for (const item of allGaps) {
    let statusLabel = 'Meets Target';
    if (item.status === 'BELOW_TARGET') statusLabel = 'Below Target';
    else if (item.status === 'EXCEEDS_TARGET') statusLabel = 'Exceeds Target';

    worksheet.addRow([
      gapDetail.user.name,
      gapDetail.user.email,
      gapDetail.roleProfile.name,
      gapDetail.campaign.name,
      item.competencyName,
      item.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral',
      item.currentLevel,
      item.targetLevel,
      item.gap,
      statusLabel,
    ]);
  }

  autoFitExcelColumns(worksheet);

  const uint8 = await workbook.xlsx.writeBuffer();
  return {
    filename,
    buffer: Buffer.from(uint8),
  };
}

export interface CampaignSummaryPdfResult {
  filename: string;
  pdfBuffer: Uint8Array;
}

export async function generateCampaignSummaryPdf(
  tenantId: string,
  campaignId: string
): Promise<CampaignSummaryPdfResult | null> {
  const campaign = await getCampaignById(campaignId, tenantId);
  if (!campaign) return null;

  const stats = await getCampaignMonitoringStats(tenantId, campaignId);
  if (!stats) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  const orgName = tenant?.name || 'Organization';

  const filename = sanitizeReportFilename(
    `${campaign.name}-summary-${getFilenameDate()}`,
    'pdf'
  );

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const primaryColor = rgb(0.12, 0.23, 0.54);
  const textColor = rgb(0.07, 0.09, 0.15);
  const mutedColor = rgb(0.35, 0.40, 0.47);
  const lightBg = rgb(0.96, 0.97, 0.98);
  const borderColor = rgb(0.88, 0.90, 0.93);
  const successColor = rgb(0.09, 0.64, 0.29);
  const dangerColor = rgb(0.86, 0.15, 0.15);
  const warningColor = rgb(0.85, 0.47, 0.02);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (neededHeight: number): void => {
    if (y - neededHeight < margin + 40) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeaderSmall();
    }
  };

  const drawHeaderSmall = () => {
    currentPage.drawText(`${orgName.toUpperCase()} — ASSESSMENT CAMPAIGN REPORT`, {
      x: margin,
      y: pageHeight - 25,
      size: 8,
      font: fontRegular,
      color: mutedColor,
    });
    currentPage.drawLine({
      start: { x: margin, y: pageHeight - 30 },
      end: { x: pageWidth - margin, y: pageHeight - 30 },
      thickness: 0.5,
      color: borderColor,
    });
  };

  currentPage.drawText(orgName.toUpperCase(), {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: primaryColor,
  });
  y -= 22;

  currentPage.drawText(campaign.name, {
    x: margin,
    y,
    size: 20,
    font: fontBold,
    color: textColor,
  });
  y -= 16;

  const generatedDateStr = `Generated on ${formatDate(new Date())}  •  Status: ${formatCampaignStatus(campaign.status)}`;
  currentPage.drawText(generatedDateStr, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: mutedColor,
  });
  y -= 15;

  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: borderColor,
  });
  y -= 20;

  const metaBoxHeight = 45;
  currentPage.drawRectangle({
    x: margin,
    y: y - metaBoxHeight,
    width: contentWidth,
    height: metaBoxHeight,
    color: lightBg,
    borderColor,
    borderWidth: 0.5,
  });

  const col1X = margin + 15;
  const col2X = margin + 145;
  const col3X = margin + 275;
  const col4X = margin + 395;
  const metaLabelY = y - 16;
  const metaValY = y - 32;

  currentPage.drawText('SCOPE', { x: col1X, y: metaLabelY, size: 7.5, font: fontBold, color: mutedColor });
  currentPage.drawText(campaign.scope.replace(/_/g, ' '), { x: col1X, y: metaValY, size: 9, font: fontBold, color: textColor });

  currentPage.drawText('DEADLINE', { x: col2X, y: metaLabelY, size: 7.5, font: fontBold, color: mutedColor });
  currentPage.drawText(formatDate(campaign.deadline), { x: col2X, y: metaValY, size: 9, font: fontBold, color: textColor });

  currentPage.drawText('CORROBORATION', { x: col3X, y: metaLabelY, size: 7.5, font: fontBold, color: mutedColor });
  currentPage.drawText(campaign.requiresCorroboration ? 'Required' : 'Optional', { x: col3X, y: metaValY, size: 9, font: fontBold, color: textColor });

  currentPage.drawText('FRAMEWORK', { x: col4X, y: metaLabelY, size: 7.5, font: fontBold, color: mutedColor });
  const frameworkText = campaign.frameworkVersion
    ? `Framework v${campaign.frameworkVersion.version}`
    : 'Standard Framework';
  currentPage.drawText(frameworkText, { x: col4X, y: metaValY, size: 9, font: fontBold, color: textColor });

  y -= metaBoxHeight + 20;

  currentPage.drawText('Campaign Progress Summary', {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: textColor,
  });
  y -= 12;

  const statBoxWidth = (contentWidth - 25) / 6;
  const statBoxHeight = 46;
  const statsList = [
    { label: 'Total Staff', value: String(stats.totalParticipants), color: textColor },
    { label: 'Completed', value: String(stats.completed), color: successColor },
    { label: 'Pending Corrob.', value: String(stats.submitted), color: primaryColor },
    { label: 'In Progress', value: String(stats.inProgress), color: warningColor },
    { label: 'Not Started', value: String(stats.notStarted), color: mutedColor },
    { label: 'Overdue', value: String(stats.overdue), color: dangerColor },
  ];

  statsList.forEach((st, idx) => {
    const boxX = margin + idx * (statBoxWidth + 5);
    currentPage.drawRectangle({
      x: boxX,
      y: y - statBoxHeight,
      width: statBoxWidth,
      height: statBoxHeight,
      color: lightBg,
      borderColor,
      borderWidth: 0.5,
    });

    currentPage.drawText(st.label, {
      x: boxX + 6,
      y: y - 15,
      size: 7,
      font: fontBold,
      color: mutedColor,
    });

    currentPage.drawText(st.value, {
      x: boxX + 6,
      y: y - 36,
      size: 16,
      font: fontBold,
      color: st.color,
    });
  });

  y -= statBoxHeight + 25;

  currentPage.drawText(`Participants Progress (${stats.participants.length})`, {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: textColor,
  });
  y -= 14;

  const drawTableHeader = () => {
    currentPage.drawRectangle({
      x: margin,
      y: y - 18,
      width: contentWidth,
      height: 18,
      color: rgb(0.93, 0.94, 0.96),
    });

    currentPage.drawText('NAME', { x: margin + 6, y: y - 13, size: 7.5, font: fontBold, color: textColor });
    currentPage.drawText('EMAIL', { x: margin + 110, y: y - 13, size: 7.5, font: fontBold, color: textColor });
    currentPage.drawText('ROLE PROFILE', { x: margin + 230, y: y - 13, size: 7.5, font: fontBold, color: textColor });
    currentPage.drawText('STATUS', { x: margin + 345, y: y - 13, size: 7.5, font: fontBold, color: textColor });
    currentPage.drawText('SUBMITTED', { x: margin + 420, y: y - 13, size: 7.5, font: fontBold, color: textColor });
    currentPage.drawText('COMPLETED', { x: margin + 475, y: y - 13, size: 7.5, font: fontBold, color: textColor });

    y -= 18;
  };

  drawTableHeader();

  if (stats.participants.length === 0) {
    ensureSpace(30);
    currentPage.drawText('No participants enrolled in this campaign.', {
      x: margin + 10,
      y: y - 18,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });
    y -= 25;
  } else {
    stats.participants.forEach((p, idx) => {
      ensureSpace(20);

      if (idx % 2 === 1) {
        currentPage.drawRectangle({
          x: margin,
          y: y - 18,
          width: contentWidth,
          height: 18,
          color: rgb(0.98, 0.99, 1.0),
        });
      }

      currentPage.drawLine({
        start: { x: margin, y: y - 18 },
        end: { x: pageWidth - margin, y: y - 18 },
        thickness: 0.3,
        color: borderColor,
      });

      const cleanName = p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name;
      currentPage.drawText(cleanName, {
        x: margin + 6,
        y: y - 13,
        size: 8,
        font: fontBold,
        color: textColor,
      });

      const cleanEmail = p.email.length > 24 ? p.email.slice(0, 22) + '…' : p.email;
      currentPage.drawText(cleanEmail, {
        x: margin + 110,
        y: y - 13,
        size: 8,
        font: fontRegular,
        color: textColor,
      });

      const roleStr = p.roleProfileName || 'Unassigned';
      const cleanRole = roleStr.length > 20 ? roleStr.slice(0, 18) + '…' : roleStr;
      currentPage.drawText(cleanRole, {
        x: margin + 230,
        y: y - 13,
        size: 8,
        font: fontRegular,
        color: mutedColor,
      });

      let statusColor = mutedColor;
      if (p.assessmentStatus === 'COMPLETED') statusColor = successColor;
      else if (p.isOverdue) statusColor = dangerColor;
      else if (p.assessmentStatus === 'DRAFT') statusColor = warningColor;
      else if (p.assessmentStatus === 'SUBMITTED' || p.assessmentStatus === 'PENDING_CORROBORATION') statusColor = primaryColor;

      const statusText = p.isOverdue ? 'Overdue' : formatAssessmentStatus(p.assessmentStatus);
      const cleanStatus = statusText.length > 14 ? statusText.slice(0, 12) + '…' : statusText;
      currentPage.drawText(cleanStatus, {
        x: margin + 345,
        y: y - 13,
        size: 8,
        font: fontBold,
        color: statusColor,
      });

      currentPage.drawText(formatDate(p.submittedAt), {
        x: margin + 420,
        y: y - 13,
        size: 7.5,
        font: fontRegular,
        color: mutedColor,
      });

      currentPage.drawText(formatDate(p.completedAt), {
        x: margin + 475,
        y: y - 13,
        size: 7.5,
        font: fontRegular,
        color: mutedColor,
      });

      y -= 18;
    });
  }

  const totalPages = pdfDoc.getPageCount();
  pdfDoc.getPages().forEach((page, pageIdx) => {
    page.drawLine({
      start: { x: margin, y: 30 },
      end: { x: pageWidth - margin, y: 30 },
      thickness: 0.5,
      color: borderColor,
    });

    page.drawText(`${orgName} • Confidential`, {
      x: margin,
      y: 18,
      size: 7.5,
      font: fontRegular,
      color: mutedColor,
    });

    const pageStr = `Page ${pageIdx + 1} of ${totalPages}`;
    const pageStrWidth = fontRegular.widthOfTextAtSize(pageStr, 7.5);
    page.drawText(pageStr, {
      x: pageWidth - margin - pageStrWidth,
      y: 18,
      size: 7.5,
      font: fontRegular,
      color: mutedColor,
    });
  });

  const pdfBuffer = await pdfDoc.save();
  return { filename, pdfBuffer };
}
