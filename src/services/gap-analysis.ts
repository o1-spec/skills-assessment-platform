import { prisma } from '@/lib/db';
import { AssessmentStatus, CompetencyType } from '@prisma/client';

export type GapStatus = 'BELOW_TARGET' | 'MEETS_TARGET' | 'EXCEEDS_TARGET';

export interface CalculatedGap {
  currentLevel: number;
  targetLevel: number;
  gap: number;
  rawGap: number;
  status: GapStatus;
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
