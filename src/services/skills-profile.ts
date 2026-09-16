import { prisma } from '@/lib/db';
import { AssessmentStatus, CompetencyType, RoleProfileStatus } from '@prisma/client';
import { calculateCapabilityGap, CapabilityGapStatus } from './gap-analysis';

export interface CompetencyHistoryRecord {
  assessmentId: string;
  campaignName: string;
  frameworkVersion: string | null;
  completedAt: Date;
  finalRating: number;
}

export interface CompetencyProgression {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  competencyDescription: string | null;
  latestRating: number;
  previousRating: number | null;
  change: number;
  historyCount: number;
  isSingleAssessment: boolean;
  history: CompetencyHistoryRecord[];
}

export interface StaffSkillsHistory {
  userId: string;
  hasHistory: boolean;
  totalCompletedAssessments: number;
  technical: CompetencyProgression[];
  behavioral: CompetencyProgression[];
}

export interface VerifiedCompetencyRating {
  competencyId: string;
  finalRating: number;
  completedAt: Date;
  assessmentId: string;
  campaignName: string;
}

export interface StaffCompetencyProfileItem {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  competencyDescription: string | null;
  verifiedLevel: number | null;
  verifiedLevelDescription: string | null;
  maxLevel: number;
  levels: Array<{ level: number; description: string }>;
  isAssessed: boolean;
  verifiedAt: Date | null;
  sourceAssessmentId: string | null;
  isRequiredByRole: boolean;
  targetLevel: number | null;
}

export interface StaffSkillsProfile {
  userId: string;
  userName: string;
  userEmail: string;
  roleProfile: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  lastAssessmentDate: Date | null;
  totalVerifiedCompetencies: number;
  technical: StaffCompetencyProfileItem[];
  behavioral: StaffCompetencyProfileItem[];
}

export interface PersonalGapRequirementItem {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  currentLevel: number | null;
  currentLevelDescription: string | null;
  targetLevel: number;
  targetLevelDescription: string | null;
  gap: number | null;
  rawGap: number | null;
  status: CapabilityGapStatus;
}

export interface StaffPersonalGapAnalysis {
  userId: string;
  userName: string;
  userEmail: string;
  hasRoleProfile: boolean;
  roleProfile: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  requirements: PersonalGapRequirementItem[];
  metrics: {
    totalRequirements: number;
    assessedRequirementsCount: number;
    belowTargetCount: number;
    meetsTargetCount: number;
    exceedsTargetCount: number;
    notAssessedCount: number;
    totalGapPoints: number;
  };
}

/**
 * Bulk resolves the most recent verified final rating for a set of users across all their completed assessments.
 *
 * Enforces:
 * 1. Only COMPLETED assessments are analyzed.
 * 2. AssessmentItem.finalRating is used (never selfRating).
 * 3. Most recent completed assessment item wins for any duplicate competency evaluation.
 * 4. Deterministic ordering: completedAt DESC.
 * 5. Strict competencyId provenance (no name matching).
 *
 * Returns Map<userId, Map<competencyId, VerifiedCompetencyRating>>
 */
export async function getLatestVerifiedRatingsForUsers(
  userIds: string[],
  tenantId: string
): Promise<Map<string, Map<string, VerifiedCompetencyRating>>> {
  const resultMap = new Map<string, Map<string, VerifiedCompetencyRating>>();
  for (const uid of userIds) {
    resultMap.set(uid, new Map<string, VerifiedCompetencyRating>());
  }

  if (userIds.length === 0 || !tenantId) {
    return resultMap;
  }

  const completedAssessments = await prisma.assessment.findMany({
    where: {
      userId: { in: userIds },
      status: AssessmentStatus.COMPLETED,
      campaign: {
        tenantId,
      },
    },
    include: {
      campaign: {
        select: {
          name: true,
        },
      },
      items: {
        select: {
          competencyId: true,
          finalRating: true,
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
  });

  for (const assessment of completedAssessments) {
    const userRatingsMap = resultMap.get(assessment.userId);
    if (!userRatingsMap) continue;

    const completedAt = assessment.completedAt ?? assessment.updatedAt;

    for (const item of assessment.items) {
      if (item.finalRating === null || item.finalRating === undefined) {
        continue;
      }

      // First encountered is the latest completed rating for this competencyId
      if (!userRatingsMap.has(item.competencyId)) {
        userRatingsMap.set(item.competencyId, {
          competencyId: item.competencyId,
          finalRating: item.finalRating,
          completedAt,
          assessmentId: assessment.id,
          campaignName: assessment.campaign.name,
        });
      }
    }
  }

  return resultMap;
}

/**
 * Resolves the latest verified ratings for a single user.
 */
export async function getLatestVerifiedRatingsForUser(
  userId: string,
  tenantId: string
): Promise<Map<string, VerifiedCompetencyRating>> {
  const multiMap = await getLatestVerifiedRatingsForUsers([userId], tenantId);
  return multiMap.get(userId) ?? new Map<string, VerifiedCompetencyRating>();
}

/**
 * Builds the visual skills profile (SF-06) for a staff member.
 */
export async function getStaffSkillsProfile(
  userId: string,
  tenantId: string
): Promise<StaffSkillsProfile | null> {
  if (!userId || !tenantId) return null;

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId,
    },
    include: {
      roleProfile: {
        include: {
          requirements: {
            include: {
              competency: {
                include: {
                  levels: {
                    orderBy: { level: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  // Retrieve user's latest verified ratings
  const ratingsMap = await getLatestVerifiedRatingsForUser(userId, tenantId);

  // Find most recent completed assessment date
  const latestCompletedAssessment = await prisma.assessment.findFirst({
    where: {
      userId,
      status: AssessmentStatus.COMPLETED,
      campaign: { tenantId },
    },
    orderBy: {
      completedAt: 'desc',
    },
    select: {
      completedAt: true,
    },
  });

  // Collect all competencies relevant to this user:
  // 1. Role requirements (if user has a role profile)
  // 2. Any additional competencies that have a verified rating
  const competencyMap = new Map<
    string,
    {
      competency: {
        id: string;
        name: string;
        type: CompetencyType;
        description: string | null;
        levels: Array<{ level: number; description: string }>;
      };
      isRequired: boolean;
      targetLevel: number | null;
    }
  >();

  if (user.roleProfile) {
    for (const req of user.roleProfile.requirements) {
      competencyMap.set(req.competencyId, {
        competency: {
          id: req.competency.id,
          name: req.competency.name,
          type: req.competency.type,
          description: req.competency.description,
          levels: req.competency.levels.map((l) => ({
            level: l.level,
            description: l.description,
          })),
        },
        isRequired: true,
        targetLevel: req.targetLevel,
      });
    }
  }

  // Check if any verified ratings are outside current role profile
  const extraCompetencyIds = Array.from(ratingsMap.keys()).filter((id) => !competencyMap.has(id));
  if (extraCompetencyIds.length > 0) {
    const extraCompetencies = await prisma.competency.findMany({
      where: {
        id: { in: extraCompetencyIds },
      },
      include: {
        levels: {
          orderBy: { level: 'asc' },
        },
      },
    });

    for (const comp of extraCompetencies) {
      competencyMap.set(comp.id, {
        competency: {
          id: comp.id,
          name: comp.name,
          type: comp.type,
          description: comp.description,
          levels: comp.levels.map((l) => ({
            level: l.level,
            description: l.description,
          })),
        },
        isRequired: false,
        targetLevel: null,
      });
    }
  }

  const technical: StaffCompetencyProfileItem[] = [];
  const behavioral: StaffCompetencyProfileItem[] = [];
  let totalVerified = 0;

  for (const item of competencyMap.values()) {
    const ratingInfo = ratingsMap.get(item.competency.id);
    const isAssessed = ratingInfo !== undefined;
    const verifiedLevel = ratingInfo?.finalRating ?? null;

    if (isAssessed) {
      totalVerified++;
    }

    const levelRecord = verifiedLevel !== null
      ? item.competency.levels.find((l) => l.level === verifiedLevel)
      : null;

    const maxLevel = item.competency.levels.length > 0
      ? item.competency.levels[item.competency.levels.length - 1].level
      : 5;

    const profileItem: StaffCompetencyProfileItem = {
      competencyId: item.competency.id,
      competencyName: item.competency.name,
      competencyType: item.competency.type,
      competencyDescription: item.competency.description,
      verifiedLevel,
      verifiedLevelDescription: levelRecord?.description ?? null,
      maxLevel,
      levels: item.competency.levels,
      isAssessed,
      verifiedAt: ratingInfo?.completedAt ?? null,
      sourceAssessmentId: ratingInfo?.assessmentId ?? null,
      isRequiredByRole: item.isRequired,
      targetLevel: item.targetLevel,
    };

    if (item.competency.type === CompetencyType.TECHNICAL) {
      technical.push(profileItem);
    } else {
      behavioral.push(profileItem);
    }
  }

  // Sort alphabetically by competency name within sections
  technical.sort((a, b) => a.competencyName.localeCompare(b.competencyName));
  behavioral.sort((a, b) => a.competencyName.localeCompare(b.competencyName));

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    roleProfile: user.roleProfile
      ? {
          id: user.roleProfile.id,
          name: user.roleProfile.name,
          description: user.roleProfile.description,
        }
      : null,
    lastAssessmentDate: latestCompletedAssessment?.completedAt ?? null,
    totalVerifiedCompetencies: totalVerified,
    technical,
    behavioral,
  };
}

/**
 * Builds the personal gap-to-target analysis (SF-08) for a staff member.
 */
export async function getStaffPersonalGapAnalysis(
  userId: string,
  tenantId: string
): Promise<StaffPersonalGapAnalysis | null> {
  if (!userId || !tenantId) return null;

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId,
    },
    include: {
      roleProfile: {
        include: {
          requirements: {
            include: {
              competency: {
                include: {
                  levels: {
                    orderBy: { level: 'asc' },
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
      },
    },
  });

  if (!user) return null;

  if (!user.roleProfile) {
    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      hasRoleProfile: false,
      roleProfile: null,
      requirements: [],
      metrics: {
        totalRequirements: 0,
        assessedRequirementsCount: 0,
        belowTargetCount: 0,
        meetsTargetCount: 0,
        exceedsTargetCount: 0,
        notAssessedCount: 0,
        totalGapPoints: 0,
      },
    };
  }

  const ratingsMap = await getLatestVerifiedRatingsForUser(userId, tenantId);

  const requirementsList: PersonalGapRequirementItem[] = [];
  let assessedCount = 0;
  let belowTargetCount = 0;
  let meetsTargetCount = 0;
  let exceedsTargetCount = 0;
  let notAssessedCount = 0;
  let totalGapPoints = 0;

  for (const req of user.roleProfile.requirements) {
    const ratingInfo = ratingsMap.get(req.competencyId);
    const verifiedRating = ratingInfo?.finalRating ?? null;
    const calc = calculateCapabilityGap(verifiedRating, req.targetLevel);

    if (calc.status === 'NOT_ASSESSED') {
      notAssessedCount++;
    } else {
      assessedCount++;
      if (calc.status === 'BELOW_TARGET') {
        belowTargetCount++;
        totalGapPoints += calc.gap ?? 0;
      } else if (calc.status === 'MEETS_TARGET') {
        meetsTargetCount++;
      } else if (calc.status === 'EXCEEDS_TARGET') {
        exceedsTargetCount++;
      }
    }

    const currentLevelRecord = verifiedRating !== null
      ? req.competency.levels.find((l) => l.level === verifiedRating)
      : null;
    const targetLevelRecord = req.competency.levels.find((l) => l.level === req.targetLevel);

    requirementsList.push({
      competencyId: req.competencyId,
      competencyName: req.competency.name,
      competencyType: req.competency.type,
      currentLevel: verifiedRating,
      currentLevelDescription: currentLevelRecord?.description ?? null,
      targetLevel: req.targetLevel,
      targetLevelDescription: targetLevelRecord?.description ?? null,
      gap: calc.gap,
      rawGap: calc.rawGap,
      status: calc.status,
    });
  }

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    hasRoleProfile: true,
    roleProfile: {
      id: user.roleProfile.id,
      name: user.roleProfile.name,
      description: user.roleProfile.description,
    },
    requirements: requirementsList,
    metrics: {
      totalRequirements: user.roleProfile.requirements.length,
      assessedRequirementsCount: assessedCount,
      belowTargetCount,
      meetsTargetCount,
      exceedsTargetCount,
      notAssessedCount,
      totalGapPoints,
    },
  };
}

/**
 * Retrieves chronological historical progression and trends over time for a staff member.
 *
 * Rules:
 * 1. COMPLETED assessments only.
 * 2. Uses AssessmentItem.finalRating only (never selfRating, never draft/unverified).
 * 3. Matched strictly by competencyId.
 * 4. Chronological order by completedAt (or updatedAt).
 * 5. Distinct technical vs behavioral groupings.
 * 6. Handles single completed assessment record with clear indicator (isSingleAssessment).
 * 7. Handles no completed history gracefully.
 */
export async function getStaffSkillsHistory(
  userId: string,
  tenantId: string
): Promise<StaffSkillsHistory> {
  if (!userId || !tenantId) {
    return {
      userId: userId || '',
      hasHistory: false,
      totalCompletedAssessments: 0,
      technical: [],
      behavioral: [],
    };
  }

  // Find all COMPLETED assessments for this user in this tenant
  const completedAssessments = await prisma.assessment.findMany({
    where: {
      userId,
      status: AssessmentStatus.COMPLETED,
      campaign: {
        tenantId,
      },
    },
    include: {
      campaign: {
        include: {
          frameworkVersion: {
            select: { version: true },
          },
        },
      },
      items: {
        where: {
          finalRating: { not: null },
        },
        include: {
          competency: true,
        },
      },
    },
    orderBy: [
      { completedAt: 'asc' },
      { updatedAt: 'asc' },
    ],
  });

  if (completedAssessments.length === 0) {
    return {
      userId,
      hasHistory: false,
      totalCompletedAssessments: 0,
      technical: [],
      behavioral: [],
    };
  }

  // Map competencyId -> records
  const competencyMap = new Map<
    string,
    {
      competency: {
        id: string;
        name: string;
        type: CompetencyType;
        description: string | null;
      };
      records: CompetencyHistoryRecord[];
    }
  >();

  for (const assessment of completedAssessments) {
    const completedAt = assessment.completedAt ?? assessment.updatedAt;
    const campaignName = assessment.campaign.name;
    const frameworkVersion = assessment.campaign.frameworkVersion?.version ?? null;

    for (const item of assessment.items) {
      if (item.finalRating === null || item.finalRating === undefined) {
        continue;
      }

      let entry = competencyMap.get(item.competencyId);
      if (!entry) {
        entry = {
          competency: {
            id: item.competency.id,
            name: item.competency.name,
            type: item.competency.type,
            description: item.competency.description,
          },
          records: [],
        };
        competencyMap.set(item.competencyId, entry);
      }

      entry.records.push({
        assessmentId: assessment.id,
        campaignName,
        frameworkVersion,
        completedAt,
        finalRating: item.finalRating,
      });
    }
  }

  const technical: CompetencyProgression[] = [];
  const behavioral: CompetencyProgression[] = [];

  for (const entry of competencyMap.values()) {
    // Sort records chronologically ascending
    const sortedRecords = [...entry.records].sort(
      (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
    );

    if (sortedRecords.length === 0) continue;

    const latestRecord = sortedRecords[sortedRecords.length - 1];
    const previousRecord = sortedRecords.length > 1 ? sortedRecords[sortedRecords.length - 2] : null;

    const latestRating = latestRecord.finalRating;
    const previousRating = previousRecord ? previousRecord.finalRating : null;
    const change = previousRating !== null ? latestRating - previousRating : 0;
    const isSingleAssessment = sortedRecords.length === 1;

    const progressionItem: CompetencyProgression = {
      competencyId: entry.competency.id,
      competencyName: entry.competency.name,
      competencyType: entry.competency.type,
      competencyDescription: entry.competency.description,
      latestRating,
      previousRating,
      change,
      historyCount: sortedRecords.length,
      isSingleAssessment,
      history: sortedRecords,
    };

    if (entry.competency.type === CompetencyType.TECHNICAL) {
      technical.push(progressionItem);
    } else {
      behavioral.push(progressionItem);
    }
  }

  technical.sort((a, b) => a.competencyName.localeCompare(b.competencyName));
  behavioral.sort((a, b) => a.competencyName.localeCompare(b.competencyName));

  return {
    userId,
    hasHistory: technical.length > 0 || behavioral.length > 0,
    totalCompletedAssessments: completedAssessments.length,
    technical,
    behavioral,
  };
}

/**
 * Builds the aspirational gap-to-target analysis for a staff member against a target role profile.
 *
 * Rules:
 * 1. Target role must belong to same tenant.
 * 2. Target role must be PUBLISHED.
 * 3. Target role must NOT be archived.
 * 4. Strictly temporary analysis: NEVER mutates user.roleProfileId or role assignments.
 * 5. Reuses latest completed verified ratings (getLatestVerifiedRatingsForUser).
 * 6. Competencies on aspirational role not in current role are assessed if historical rating exists,
 *    otherwise NOT_ASSESSED.
 */
export async function getStaffAspirationalGapAnalysis(
  userId: string,
  tenantId: string,
  aspirationalRoleId: string
): Promise<StaffPersonalGapAnalysis | null> {
  if (!userId || !tenantId || !aspirationalRoleId) return null;

  // 1. Verify user exists and belongs to tenant
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true, name: true, email: true, roleProfileId: true },
  });
  if (!user) return null;

  // 2. Verify target role profile: same tenant, PUBLISHED, NOT archived
  const aspirationalRole = await prisma.roleProfile.findFirst({
    where: {
      id: aspirationalRoleId,
      tenantId,
      status: RoleProfileStatus.PUBLISHED,
      isArchived: false,
    },
    include: {
      requirements: {
        include: {
          competency: {
            include: {
              levels: {
                orderBy: { level: 'asc' },
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

  if (!aspirationalRole) return null;

  // 3. User's latest verified ratings across completed assessments
  const ratingsMap = await getLatestVerifiedRatingsForUser(userId, tenantId);

  const requirementsList: PersonalGapRequirementItem[] = [];
  let assessedCount = 0;
  let belowTargetCount = 0;
  let meetsTargetCount = 0;
  let exceedsTargetCount = 0;
  let notAssessedCount = 0;
  let totalGapPoints = 0;

  for (const req of aspirationalRole.requirements) {
    const ratingInfo = ratingsMap.get(req.competencyId);
    const verifiedRating = ratingInfo?.finalRating ?? null;
    const calc = calculateCapabilityGap(verifiedRating, req.targetLevel);

    if (calc.status === 'NOT_ASSESSED') {
      notAssessedCount++;
    } else {
      assessedCount++;
      if (calc.status === 'BELOW_TARGET') {
        belowTargetCount++;
        totalGapPoints += calc.gap ?? 0;
      } else if (calc.status === 'MEETS_TARGET') {
        meetsTargetCount++;
      } else if (calc.status === 'EXCEEDS_TARGET') {
        exceedsTargetCount++;
      }
    }

    const currentLevelRecord = verifiedRating !== null
      ? req.competency.levels.find((l) => l.level === verifiedRating)
      : null;
    const targetLevelRecord = req.competency.levels.find((l) => l.level === req.targetLevel);

    requirementsList.push({
      competencyId: req.competencyId,
      competencyName: req.competency.name,
      competencyType: req.competency.type,
      currentLevel: verifiedRating,
      currentLevelDescription: currentLevelRecord?.description ?? null,
      targetLevel: req.targetLevel,
      targetLevelDescription: targetLevelRecord?.description ?? null,
      gap: calc.gap,
      rawGap: calc.rawGap,
      status: calc.status,
    });
  }

  // NOTE: user.roleProfileId remains untouched
  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    hasRoleProfile: true,
    roleProfile: {
      id: aspirationalRole.id,
      name: aspirationalRole.name,
      description: aspirationalRole.description,
    },
    requirements: requirementsList,
    metrics: {
      totalRequirements: aspirationalRole.requirements.length,
      assessedRequirementsCount: assessedCount,
      belowTargetCount,
      meetsTargetCount,
      exceedsTargetCount,
      notAssessedCount,
      totalGapPoints,
    },
  };
}

/**
 * Returns all published, unarchived role profiles in the tenant that can be selected as aspirational roles.
 */
export async function getAspirationalTargetRolesForStaff(
  tenantId: string
): Promise<Array<{ id: string; name: string; description: string | null }>> {
  if (!tenantId) return [];
  return prisma.roleProfile.findMany({
    where: {
      tenantId,
      status: RoleProfileStatus.PUBLISHED,
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

