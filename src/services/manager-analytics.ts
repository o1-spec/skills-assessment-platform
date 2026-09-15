import { prisma } from '@/lib/db';
import { CompetencyType, UserRole } from '@prisma/client';
import {
  calculateCapabilityGap,
  CapabilityGapStatus,
} from './gap-analysis';
import {
  getLatestVerifiedRatingsForUsers,
  getStaffSkillsProfile,
  StaffSkillsProfile,
  getStaffPersonalGapAnalysis,
  StaffPersonalGapAnalysis,
} from './skills-profile';

export interface ManagerDirectReportSummaryItem {
  id: string;
  name: string;
  email: string;
  roleProfile: {
    id: string;
    name: string;
  } | null;
  verifiedCompetenciesCount: number;
  totalRequirementsCount: number;
  belowTargetCount: number;
  meetsTargetCount: number;
  exceedsTargetCount: number;
  notAssessedCount: number;
  totalGapPoints: number;
  lastAssessmentDate: Date | null;
}

export interface ManagerMatrixCompetencyColumn {
  id: string;
  name: string;
  type: CompetencyType;
}

export interface ManagerMatrixCell {
  competencyId: string;
  finalRating: number | null;
  targetLevel: number | null;
  status: CapabilityGapStatus | 'NOT_REQUIRED';
}

export interface ManagerMatrixRow {
  userId: string;
  name: string;
  email: string;
  roleProfileName: string | null;
  cells: Record<string, ManagerMatrixCell>;
}

export interface ManagerTeamMatrixData {
  directReportsCount: number;
  competencies: ManagerMatrixCompetencyColumn[];
  rows: ManagerMatrixRow[];
}

export interface ManagerTeamGapAggregation {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  employeesRequiringCount: number;
  assessedCount: number;
  belowTargetCount: number;
  meetsTargetCount: number;
  exceedsTargetCount: number;
  notAssessedCount: number;
}

export interface ManagerDashboardData {
  manager: {
    id: string;
    name: string;
    email: string;
  };
  directReports: ManagerDirectReportSummaryItem[];
  matrix: ManagerTeamMatrixData;
  gapAggregation: ManagerTeamGapAggregation[];
}

/**
 * Retrieves the list of active direct reports for a manager within a tenant.
 */
async function getActiveDirectReportsForManager(managerId: string, tenantId: string) {
  return prisma.user.findMany({
    where: {
      managerId,
      tenantId,
      isActive: true,
      role: UserRole.STAFF,
    },
    include: {
      roleProfile: {
        include: {
          requirements: {
            include: {
              competency: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Builds the complete Manager Dashboard and Competency Matrix (MG-05).
 */
export async function getManagerDashboardData(
  managerId: string,
  tenantId: string
): Promise<ManagerDashboardData | null> {
  if (!managerId || !tenantId) return null;

  const manager = await prisma.user.findFirst({
    where: {
      id: managerId,
      tenantId,
      role: { in: [UserRole.MANAGER, UserRole.ORGANIZATION_ADMIN] },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!manager) return null;

  const directReports = await getActiveDirectReportsForManager(managerId, tenantId);
  const reportIds = directReports.map((r) => r.id);

  // Bulk resolve all latest verified ratings for all direct reports
  const userRatingsMap = await getLatestVerifiedRatingsForUsers(reportIds, tenantId);

  // 1. Build Direct Reports Summary List
  const summaryList: ManagerDirectReportSummaryItem[] = [];
  // Also collect all relevant competencies for the dynamic matrix
  const competencyMap = new Map<string, ManagerMatrixCompetencyColumn>();

  for (const report of directReports) {
    const ratings = userRatingsMap.get(report.id) ?? new Map();
    let belowTargetCount = 0;
    let meetsTargetCount = 0;
    let exceedsTargetCount = 0;
    let notAssessedCount = 0;
    let totalGapPoints = 0;
    let lastAssessmentDate: Date | null = null;

    for (const r of ratings.values()) {
      if (!lastAssessmentDate || r.completedAt > lastAssessmentDate) {
        lastAssessmentDate = r.completedAt;
      }
    }

    if (report.roleProfile) {
      for (const req of report.roleProfile.requirements) {
        // Collect competency into dynamic column list
        if (!competencyMap.has(req.competencyId)) {
          competencyMap.set(req.competencyId, {
            id: req.competency.id,
            name: req.competency.name,
            type: req.competency.type,
          });
        }

        const userRating = ratings.get(req.competencyId)?.finalRating ?? null;
        const calc = calculateCapabilityGap(userRating, req.targetLevel);

        if (calc.status === 'NOT_ASSESSED') {
          notAssessedCount++;
        } else if (calc.status === 'BELOW_TARGET') {
          belowTargetCount++;
          totalGapPoints += calc.gap ?? 0;
        } else if (calc.status === 'MEETS_TARGET') {
          meetsTargetCount++;
        } else if (calc.status === 'EXCEEDS_TARGET') {
          exceedsTargetCount++;
        }
      }
    }

    // Also include any other competencies assessed for this user
    for (const rating of ratings.values()) {
      if (!competencyMap.has(rating.competencyId)) {
        const comp = await prisma.competency.findUnique({
          where: { id: rating.competencyId },
          select: { id: true, name: true, type: true },
        });
        if (comp) {
          competencyMap.set(comp.id, comp);
        }
      }
    }

    summaryList.push({
      id: report.id,
      name: report.name,
      email: report.email,
      roleProfile: report.roleProfile
        ? {
            id: report.roleProfile.id,
            name: report.roleProfile.name,
          }
        : null,
      verifiedCompetenciesCount: ratings.size,
      totalRequirementsCount: report.roleProfile?.requirements.length ?? 0,
      belowTargetCount,
      meetsTargetCount,
      exceedsTargetCount,
      notAssessedCount,
      totalGapPoints,
      lastAssessmentDate,
    });
  }

  // Sorted dynamic competency columns: TECHNICAL first, then BEHAVIORAL, then alphabetical
  const sortedCompetencies = Array.from(competencyMap.values()).sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === CompetencyType.TECHNICAL ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  // 2. Build Matrix Rows
  const matrixRows: ManagerMatrixRow[] = [];
  for (const report of directReports) {
    const ratings = userRatingsMap.get(report.id) ?? new Map();
    const cells: Record<string, ManagerMatrixCell> = {};

    const reqMap = new Map(
      report.roleProfile?.requirements.map((r) => [r.competencyId, r.targetLevel]) ?? []
    );

    for (const comp of sortedCompetencies) {
      const ratingInfo = ratings.get(comp.id);
      const finalRating = ratingInfo?.finalRating ?? null;
      const targetLevel = reqMap.get(comp.id) ?? null;

      let status: CapabilityGapStatus | 'NOT_REQUIRED';
      if (targetLevel !== null) {
        const calc = calculateCapabilityGap(finalRating, targetLevel);
        status = calc.status;
      } else {
        status = 'NOT_REQUIRED';
      }

      cells[comp.id] = {
        competencyId: comp.id,
        finalRating,
        targetLevel,
        status,
      };
    }

    matrixRows.push({
      userId: report.id,
      name: report.name,
      email: report.email,
      roleProfileName: report.roleProfile?.name ?? null,
      cells,
    });
  }

  // 3. Build Manager Gap Aggregation across all direct reports
  const gapAggregation: ManagerTeamGapAggregation[] = [];
  for (const comp of sortedCompetencies) {
    let employeesRequiringCount = 0;
    let assessedCount = 0;
    let belowTargetCount = 0;
    let meetsTargetCount = 0;
    let exceedsTargetCount = 0;
    let notAssessedCount = 0;

    for (const report of directReports) {
      const req = report.roleProfile?.requirements.find((r) => r.competencyId === comp.id);
      if (!req) continue; // Only count employees who actually require this competency

      employeesRequiringCount++;
      const ratingInfo = userRatingsMap.get(report.id)?.get(comp.id);
      const finalRating = ratingInfo?.finalRating ?? null;
      const calc = calculateCapabilityGap(finalRating, req.targetLevel);

      if (calc.status === 'NOT_ASSESSED') {
        notAssessedCount++;
      } else {
        assessedCount++;
        if (calc.status === 'BELOW_TARGET') {
          belowTargetCount++;
        } else if (calc.status === 'MEETS_TARGET') {
          meetsTargetCount++;
        } else if (calc.status === 'EXCEEDS_TARGET') {
          exceedsTargetCount++;
        }
      }
    }

    if (employeesRequiringCount > 0) {
      gapAggregation.push({
        competencyId: comp.id,
        competencyName: comp.name,
        competencyType: comp.type,
        employeesRequiringCount,
        assessedCount,
        belowTargetCount,
        meetsTargetCount,
        exceedsTargetCount,
        notAssessedCount,
      });
    }
  }

  return {
    manager,
    directReports: summaryList,
    matrix: {
      directReportsCount: directReports.length,
      competencies: sortedCompetencies,
      rows: matrixRows,
    },
    gapAggregation,
  };
}

/**
 * Allows a manager to view the full read-only capability detail of their direct report.
 * Strictly verifies that directReportId is an active direct report of managerId.
 */
export async function getManagerDirectReportDetail(
  managerId: string,
  directReportId: string,
  tenantId: string
): Promise<{
  profile: StaffSkillsProfile | null;
  gapAnalysis: StaffPersonalGapAnalysis | null;
} | null> {
  if (!managerId || !directReportId || !tenantId) return null;

  // Enforce manager authorization
  const report = await prisma.user.findFirst({
    where: {
      id: directReportId,
      managerId,
      tenantId,
      isActive: true,
    },
  });

  if (!report) {
    return null;
  }

  const [profile, gapAnalysis] = await Promise.all([
    getStaffSkillsProfile(directReportId, tenantId),
    getStaffPersonalGapAnalysis(directReportId, tenantId),
  ]);

  return {
    profile,
    gapAnalysis,
  };
}
