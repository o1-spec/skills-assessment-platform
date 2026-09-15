import { prisma } from '@/lib/db';
import { AssessmentStatus, CompetencyType, UserRole } from '@prisma/client';
import { getLatestVerifiedRatingsForUsers } from './skills-profile';

export type GapStatus = 'BELOW_TARGET' | 'MEETS_TARGET' | 'EXCEEDS_TARGET';
export type CapabilityGapStatus = 'NOT_ASSESSED' | 'BELOW_TARGET' | 'MEETS_TARGET' | 'EXCEEDS_TARGET';

export interface CalculatedGap {
  currentLevel: number;
  targetLevel: number;
  gap: number;
  rawGap: number;
  status: GapStatus;
}

export interface CalculatedCapabilityGap {
  finalRating: number | null;
  targetLevel: number;
  gap: number | null;
  rawGap: number | null;
  status: CapabilityGapStatus;
}

/**
 * Pure calculation helper to compare current level against target level.
 */
export function calculateGap(currentLevel: number, targetLevel: number): CalculatedGap {
  const rawGap = targetLevel - currentLevel;
  const gap = Math.max(rawGap, 0);

  let status: GapStatus;
  if (currentLevel < targetLevel) {
    status = 'BELOW_TARGET';
  } else if (currentLevel === targetLevel) {
    status = 'MEETS_TARGET';
  } else {
    status = 'EXCEEDS_TARGET';
  }

  return {
    currentLevel,
    targetLevel,
    gap,
    rawGap,
    status,
  };
}

/**
 * Pure calculation helper with first-class NOT_ASSESSED support.
 * deficiency is null when finalRating is null, otherwise max(targetLevel - finalRating, 0).
 */
export function calculateCapabilityGap(
  finalRating: number | null | undefined,
  targetLevel: number
): CalculatedCapabilityGap {
  if (finalRating === null || finalRating === undefined) {
    return {
      finalRating: null,
      targetLevel,
      gap: null,
      rawGap: null,
      status: 'NOT_ASSESSED',
    };
  }

  const rawGap = targetLevel - finalRating;
  const gap = Math.max(rawGap, 0);

  let status: CapabilityGapStatus;
  if (finalRating < targetLevel) {
    status = 'BELOW_TARGET';
  } else if (finalRating === targetLevel) {
    status = 'MEETS_TARGET';
  } else {
    status = 'EXCEEDS_TARGET';
  }

  return {
    finalRating,
    targetLevel,
    gap,
    rawGap,
    status,
  };
}

export interface CompetencyGapItem {
  competencyId: string;

  competencyName: string;
  competencyType: CompetencyType;
  competencyDescription: string | null;
  currentLevel: number;
  currentLevelDescription: string | null;
  targetLevel: number;
  targetLevelDescription: string | null;
  gap: number;
  rawGap: number;
  status: GapStatus;
}

export interface GapAnalysisSummaryMetrics {
  totalCompared: number;
  belowTargetCount: number;
  meetsTargetCount: number;
  exceedsTargetCount: number;
  totalGapPoints: number;
  technicalGapsCount: number;
  behavioralGapsCount: number;
}

export interface GapAnalysisListItem {
  assessmentId: string;
  completedAt: Date | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  campaign: {
    id: string;
    name: string;
  };
  roleProfile: {
    id: string;
    name: string;
  };
  totalCompared: number;
  belowTargetCount: number;
  totalGapPoints: number;
  technicalGapsCount: number;
  behavioralGapsCount: number;
}

export interface GapAnalysisDetail {
  assessmentId: string;
  completedAt: Date | null;
  submittedAt: Date | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  campaign: {
    id: string;
    name: string;
    deadline: Date;
  };
  roleProfile: {
    id: string;
    name: string;
    description: string | null;
  };
  technicalGaps: CompetencyGapItem[];
  behavioralGaps: CompetencyGapItem[];
  metrics: GapAnalysisSummaryMetrics;
}

/**
 * Retrieves all completed assessments with linked role profiles for the tenant.
 */
export async function getGapAnalysisAssessmentsForTenant(
  tenantId: string
): Promise<GapAnalysisListItem[]> {
  if (!tenantId) {
    return [];
  }

  const assessments = await prisma.assessment.findMany({
    where: {
      status: AssessmentStatus.COMPLETED,
      campaign: {
        tenantId,
        roleProfileId: {
          not: null,
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      campaign: {
        select: {
          id: true,
          name: true,
          roleProfile: {
            select: {
              id: true,
              name: true,
              requirements: {
                select: {
                  competencyId: true,
                  targetLevel: true,
                },
              },
            },
          },
        },
      },
      items: {
        select: {
          competencyId: true,
          finalRating: true,
          competency: {
            select: {
              id: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
  });

  return assessments
    .filter((a) => a.campaign.roleProfile !== null)
    .map((assessment) => {
      const roleProfile = assessment.campaign.roleProfile!;
      const reqMap = new Map(roleProfile.requirements.map((r) => [r.competencyId, r.targetLevel]));

      let totalCompared = 0;
      let belowTargetCount = 0;
      let totalGapPoints = 0;
      let technicalGapsCount = 0;
      let behavioralGapsCount = 0;

      for (const item of assessment.items) {
        const targetLevel = reqMap.get(item.competencyId);
        // Only compare competencies present in the RoleProfile requirements
        if (targetLevel !== undefined && item.finalRating !== null) {
          totalCompared++;
          const calc = calculateGap(item.finalRating, targetLevel);

          if (calc.status === 'BELOW_TARGET') {
            belowTargetCount++;
            totalGapPoints += calc.gap;
            if (item.competency.type === CompetencyType.TECHNICAL) {
              technicalGapsCount++;
            } else {
              behavioralGapsCount++;
            }
          }
        }
      }

      return {
        assessmentId: assessment.id,
        completedAt: assessment.completedAt,
        user: assessment.user,
        campaign: {
          id: assessment.campaign.id,
          name: assessment.campaign.name,
        },
        roleProfile: {
          id: roleProfile.id,
          name: roleProfile.name,
        },
        totalCompared,
        belowTargetCount,
        totalGapPoints,
        technicalGapsCount,
        behavioralGapsCount,
      };
    });
}

/**
 * Retrieves detailed gap analysis comparing an assessment's final ratings against its linked role profile requirements.
 */
export async function getAssessmentGapAnalysis(
  assessmentId: string,
  tenantId: string
): Promise<GapAnalysisDetail | null> {
  if (!assessmentId || !tenantId) {
    return null;
  }

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      status: AssessmentStatus.COMPLETED,
      campaign: {
        tenantId,
        roleProfileId: {
          not: null,
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      campaign: {
        select: {
          id: true,
          name: true,
          deadline: true,
          roleProfile: {
            include: {
              requirements: true,
            },
          },
        },
      },
      items: {
        include: {
          competency: {
            include: {
              levels: {
                orderBy: {
                  level: 'asc',
                },
              },
            },
          },
        },
        orderBy: [
          { competency: { type: 'asc' } },
          { competency: { name: 'asc' } },
        ],
      },
    },
  });

  if (!assessment || !assessment.campaign.roleProfile) {
    return null;
  }

  const roleProfile = assessment.campaign.roleProfile;
  const requirementMap = new Map(
    roleProfile.requirements.map((r) => [r.competencyId, r.targetLevel])
  );

  const technicalGaps: CompetencyGapItem[] = [];
  const behavioralGaps: CompetencyGapItem[] = [];

  let totalCompared = 0;
  let belowTargetCount = 0;
  let meetsTargetCount = 0;
  let exceedsTargetCount = 0;
  let totalGapPoints = 0;
  let technicalGapsCount = 0;
  let behavioralGapsCount = 0;

  for (const item of assessment.items) {
    const targetLevel = requirementMap.get(item.competencyId);
    // Only compare competencies present in the RoleProfile requirements
    if (targetLevel === undefined) {
      continue;
    }

    const currentLevel = item.finalRating ?? 0;
    const calc = calculateGap(currentLevel, targetLevel);

    totalCompared++;
    if (calc.status === 'BELOW_TARGET') {
      belowTargetCount++;
      totalGapPoints += calc.gap;
      if (item.competency.type === CompetencyType.TECHNICAL) {
        technicalGapsCount++;
      } else {
        behavioralGapsCount++;
      }
    } else if (calc.status === 'MEETS_TARGET') {
      meetsTargetCount++;
    } else if (calc.status === 'EXCEEDS_TARGET') {
      exceedsTargetCount++;
    }

    const currentLevelRecord = item.competency.levels.find((l) => l.level === currentLevel);
    const targetLevelRecord = item.competency.levels.find((l) => l.level === targetLevel);

    const gapItem: CompetencyGapItem = {
      competencyId: item.competencyId,
      competencyName: item.competency.name,
      competencyType: item.competency.type,
      competencyDescription: item.competency.description,
      currentLevel,
      currentLevelDescription: currentLevelRecord?.description ?? null,
      targetLevel,
      targetLevelDescription: targetLevelRecord?.description ?? null,
      gap: calc.gap,
      rawGap: calc.rawGap,
      status: calc.status,
    };

    if (item.competency.type === CompetencyType.TECHNICAL) {
      technicalGaps.push(gapItem);
    } else {
      behavioralGaps.push(gapItem);
    }
  }

  return {
    assessmentId: assessment.id,
    completedAt: assessment.completedAt,
    submittedAt: assessment.submittedAt,
    user: assessment.user,
    campaign: {
      id: assessment.campaign.id,
      name: assessment.campaign.name,
      deadline: assessment.campaign.deadline,
    },
    roleProfile: {
      id: roleProfile.id,
      name: roleProfile.name,
      description: roleProfile.description,
    },
    technicalGaps,
    behavioralGaps,
    metrics: {
      totalCompared,
      belowTargetCount,
      meetsTargetCount,
      exceedsTargetCount,
      totalGapPoints,
      technicalGapsCount,
      behavioralGapsCount,
    },
  };
}

export interface TeamCompetencyGapAggregation {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  employeesRequiringCount: number;
  assessedCount: number;
  belowTargetCount: number;
  meetsTargetCount: number;
  exceedsTargetCount: number;
  notAssessedCount: number;
  averageVerifiedLevel: number | null;
}

export interface TeamGapAnalysisSummary {
  team: {
    id: string;
    name: string;
    departmentName: string | null;
    managerName: string | null;
  };
  totalMembersCount: number;
  activeStaffCount: number;
  staffWithoutRoleProfileCount: number;
  competencies: TeamCompetencyGapAggregation[];
}

/**
 * Team-Level Gap Analysis (OA-09).
 * Evaluates active STAFF members of a specific team against their own assigned role profile targets.
 */
export async function getTeamGapAnalysis(
  teamId: string,
  tenantId: string
): Promise<TeamGapAnalysisSummary | null> {
  if (!teamId || !tenantId) return null;

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      tenantId,
    },
    include: {
      department: { select: { name: true } },
      manager: { select: { name: true } },
      memberships: {
        include: {
          user: {
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
          },
        },
      },
    },
  });

  if (!team) return null;

  // Filter for ACTIVE STAFF members only
  const activeStaffMembers = team.memberships
    .map((m) => m.user)
    .filter((u) => u.isActive && u.role === UserRole.STAFF);

  const staffWithoutRoleProfileCount = activeStaffMembers.filter((u) => !u.roleProfile).length;
  const staffWithRoleProfile = activeStaffMembers.filter((u) => !!u.roleProfile);

  // Bulk resolve ratings for all active staff members
  const memberIds = activeStaffMembers.map((u) => u.id);
  const userRatingsMap = await getLatestVerifiedRatingsForUsers(memberIds, tenantId);

  // Collect union of required competencies across team members
  const competencyMap = new Map<
    string,
    {
      id: string;
      name: string;
      type: CompetencyType;
    }
  >();

  for (const user of staffWithRoleProfile) {
    for (const req of user.roleProfile!.requirements) {
      if (!competencyMap.has(req.competencyId)) {
        competencyMap.set(req.competencyId, {
          id: req.competency.id,
          name: req.competency.name,
          type: req.competency.type,
        });
      }
    }
  }

  // Sort competencies: TECHNICAL first, then BEHAVIORAL, then alphabetically
  const sortedCompetencies = Array.from(competencyMap.values()).sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === CompetencyType.TECHNICAL ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const aggregations: TeamCompetencyGapAggregation[] = [];

  for (const comp of sortedCompetencies) {
    let employeesRequiringCount = 0;
    let assessedCount = 0;
    let belowTargetCount = 0;
    let meetsTargetCount = 0;
    let exceedsTargetCount = 0;
    let notAssessedCount = 0;
    let sumVerifiedLevels = 0;

    for (const user of staffWithRoleProfile) {
      const req = user.roleProfile!.requirements.find((r) => r.competencyId === comp.id);
      if (!req) continue; // Only count users who actually require this competency

      employeesRequiringCount++;
      const ratingInfo = userRatingsMap.get(user.id)?.get(comp.id);
      const finalRating = ratingInfo?.finalRating ?? null;
      const calc = calculateCapabilityGap(finalRating, req.targetLevel);

      if (calc.status === 'NOT_ASSESSED') {
        notAssessedCount++;
      } else {
        assessedCount++;
        sumVerifiedLevels += finalRating!;
        if (calc.status === 'BELOW_TARGET') {
          belowTargetCount++;
        } else if (calc.status === 'MEETS_TARGET') {
          meetsTargetCount++;
        } else if (calc.status === 'EXCEEDS_TARGET') {
          exceedsTargetCount++;
        }
      }
    }

    const averageVerifiedLevel =
      assessedCount > 0 ? Number((sumVerifiedLevels / assessedCount).toFixed(1)) : null;

    aggregations.push({
      competencyId: comp.id,
      competencyName: comp.name,
      competencyType: comp.type,
      employeesRequiringCount,
      assessedCount,
      belowTargetCount,
      meetsTargetCount,
      exceedsTargetCount,
      notAssessedCount,
      averageVerifiedLevel,
    });
  }

  return {
    team: {
      id: team.id,
      name: team.name,
      departmentName: team.department?.name ?? null,
      managerName: team.manager?.name ?? null,
    },
    totalMembersCount: team.memberships.length,
    activeStaffCount: activeStaffMembers.length,
    staffWithoutRoleProfileCount,
    competencies: aggregations,
  };
}

export interface OrganizationCompetencyGapAggregation {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  competencyDescription: string | null;
  employeesRequiringCount: number;
  assessedCount: number;
  belowTargetCount: number;
  meetsTargetCount: number;
  exceedsTargetCount: number;
  notAssessedCount: number;
  averageVerifiedLevel: number | null;
}

export interface OrganizationGapAnalysisSummary {
  totalActiveStaffCount: number;
  staffWithRoleProfileCount: number;
  staffWithoutRoleProfileCount: number;
  competencies: OrganizationCompetencyGapAggregation[];
}

/**
 * Organization-Wide Gap Analysis (OA-09).
 * Aggregates all required competencies across active STAFF in the organization.
 */
export async function getOrganizationGapAnalysis(
  tenantId: string
): Promise<OrganizationGapAnalysisSummary> {
  if (!tenantId) {
    return {
      totalActiveStaffCount: 0,
      staffWithRoleProfileCount: 0,
      staffWithoutRoleProfileCount: 0,
      competencies: [],
    };
  }

  const activeStaff = await prisma.user.findMany({
    where: {
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

  const staffWithoutRoleProfileCount = activeStaff.filter((u) => !u.roleProfile).length;
  const staffWithRoleProfile = activeStaff.filter((u) => !!u.roleProfile);

  const staffIds = activeStaff.map((u) => u.id);
  const userRatingsMap = await getLatestVerifiedRatingsForUsers(staffIds, tenantId);

  // Collect union of required competencies across all active staff with role profiles
  const competencyMap = new Map<
    string,
    {
      id: string;
      name: string;
      type: CompetencyType;
      description: string | null;
    }
  >();

  for (const user of staffWithRoleProfile) {
    for (const req of user.roleProfile!.requirements) {
      if (!competencyMap.has(req.competencyId)) {
        competencyMap.set(req.competencyId, {
          id: req.competency.id,
          name: req.competency.name,
          type: req.competency.type,
          description: req.competency.description,
        });
      }
    }
  }

  const sortedCompetencies = Array.from(competencyMap.values()).sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === CompetencyType.TECHNICAL ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const aggregations: OrganizationCompetencyGapAggregation[] = [];

  for (const comp of sortedCompetencies) {
    let employeesRequiringCount = 0;
    let assessedCount = 0;
    let belowTargetCount = 0;
    let meetsTargetCount = 0;
    let exceedsTargetCount = 0;
    let notAssessedCount = 0;
    let sumVerifiedLevels = 0;

    for (const user of staffWithRoleProfile) {
      const req = user.roleProfile!.requirements.find((r) => r.competencyId === comp.id);
      if (!req) continue;

      employeesRequiringCount++;
      const ratingInfo = userRatingsMap.get(user.id)?.get(comp.id);
      const finalRating = ratingInfo?.finalRating ?? null;
      const calc = calculateCapabilityGap(finalRating, req.targetLevel);

      if (calc.status === 'NOT_ASSESSED') {
        notAssessedCount++;
      } else {
        assessedCount++;
        sumVerifiedLevels += finalRating!;
        if (calc.status === 'BELOW_TARGET') {
          belowTargetCount++;
        } else if (calc.status === 'MEETS_TARGET') {
          meetsTargetCount++;
        } else if (calc.status === 'EXCEEDS_TARGET') {
          exceedsTargetCount++;
        }
      }
    }

    const averageVerifiedLevel =
      assessedCount > 0 ? Number((sumVerifiedLevels / assessedCount).toFixed(1)) : null;

    aggregations.push({
      competencyId: comp.id,
      competencyName: comp.name,
      competencyType: comp.type,
      competencyDescription: comp.description,
      employeesRequiringCount,
      assessedCount,
      belowTargetCount,
      meetsTargetCount,
      exceedsTargetCount,
      notAssessedCount,
      averageVerifiedLevel,
    });
  }

  return {
    totalActiveStaffCount: activeStaff.length,
    staffWithRoleProfileCount: staffWithRoleProfile.length,
    staffWithoutRoleProfileCount,
    competencies: aggregations,
  };
}

