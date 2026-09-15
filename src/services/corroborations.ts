import { prisma } from '@/lib/db';
import { SubmitCorroborationInput } from '@/lib/validation';
import {
  Assessment,
  AssessmentCampaign,
  AssessmentItem,
  AssessmentStatus,
  Competency,
  CompetencyLevel,
  Corroboration,
  User,
} from '@prisma/client';

export interface ManagerOverviewStats {
  pendingReviewsCount: number;
  directReportsCount: number;
  completedReviewsCount: number;
}

export type PendingCorroborationListItem = Assessment & {
  user: Pick<User, 'id' | 'name' | 'email'>;
  campaign: Pick<AssessmentCampaign, 'id' | 'name' | 'deadline'>;
  _count: {
    items: number;
  };
};

export type ManagerCorroborationDetail = Assessment & {
  user: User;
  campaign: AssessmentCampaign;
  items: Array<
    AssessmentItem & {
      competency: Competency & {
        levels: CompetencyLevel[];
      };
      corroboration: Corroboration | null;
    }
  >;
};

/**
 * Retrieves summary statistics for the manager overview dashboard.
 */
export async function getManagerOverviewStats(
  managerId: string,
  tenantId: string
): Promise<ManagerOverviewStats> {
  if (!managerId || !tenantId) {
    return {
      pendingReviewsCount: 0,
      directReportsCount: 0,
      completedReviewsCount: 0,
    };
  }

  const [pendingReviewsCount, directReportsCount, completedReviewsCount] =
    await Promise.all([
      prisma.assessment.count({
        where: {
          status: AssessmentStatus.PENDING_CORROBORATION,
          campaign: {
            tenantId,
            requiresCorroboration: true,
          },
          user: {
            managerId,
            tenantId,
          },
        },
      }),
      prisma.user.count({
        where: {
          managerId,
          tenantId,
          isActive: true,
        },
      }),
      prisma.assessment.count({
        where: {
          status: AssessmentStatus.COMPLETED,
          campaign: {
            tenantId,
          },
          user: {
            managerId,
            tenantId,
          },
        },
      }),
    ]);

  return {
    pendingReviewsCount,
    directReportsCount,
    completedReviewsCount,
  };
}

/**
 * Retrieves all assessments awaiting manager review from direct reports within the tenant.
 */
export async function getPendingCorroborationsForManager(
  managerId: string,
  tenantId: string
): Promise<PendingCorroborationListItem[]> {
  if (!managerId || !tenantId) {
    return [];
  }

  return prisma.assessment.findMany({
    where: {
      status: AssessmentStatus.PENDING_CORROBORATION,
      campaign: {
        tenantId,
        requiresCorroboration: true,
      },
      user: {
        managerId,
        tenantId,
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
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'asc',
    },
  });
}

/**
 * Retrieves a single assessment for manager corroboration with strict direct-report and tenant isolation.
 */
export async function getManagerCorroborationById(
  assessmentId: string,
  managerId: string,
  tenantId: string
): Promise<ManagerCorroborationDetail | null> {
  if (!assessmentId || !managerId || !tenantId) {
    return null;
  }

  return prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      campaign: {
        tenantId,
      },
      user: {
        managerId,
        tenantId,
      },
    },
    include: {
      user: true,
      campaign: true,
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
          corroboration: true,
        },
        orderBy: [
          { competency: { type: 'asc' } },
          { competency: { name: 'asc' } },
        ],
      },
    },
  });
}

/**
 * Submits a manager corroboration review atomically.
 * Validates direct-report relation, level validity, and required justification when ratings are adjusted.
 * Sets finalRating on AssessmentItems, creates Corroboration records, and marks Assessment COMPLETED.
 */
export async function submitCorroboration(
  managerId: string,
  tenantId: string,
  input: SubmitCorroborationInput
): Promise<Assessment> {
  if (!managerId || !tenantId) {
    throw new Error('Manager and Tenant authorization required.');
  }

  // 1. Fetch assessment with direct-report & tenant verification
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: input.assessmentId,
      campaign: {
        tenantId,
      },
      user: {
        managerId,
        tenantId,
      },
    },
    include: {
      campaign: true,
      user: true,
      items: {
        include: {
          competency: {
            include: {
              levels: true,
            },
          },
          corroboration: true,
        },
      },
    },
  });

  if (!assessment) {
    throw new Error('Assessment not found, not assigned to your direct reports, or belongs to another organization.');
  }

  // 2. Status verification
  if (assessment.status !== AssessmentStatus.PENDING_CORROBORATION) {
    throw new Error('This assessment is not pending manager review.');
  }

  if (!assessment.campaign.requiresCorroboration) {
    throw new Error('This assessment campaign does not require manager corroboration.');
  }

  // 3. Validate items completeness and rules
  const existingItemMap = new Map(assessment.items.map((i) => [i.id, i]));
  const submittedItemMap = new Map(input.items.map((i) => [i.assessmentItemId, i]));

  if (submittedItemMap.size !== existingItemMap.size) {
    throw new Error('All competencies in this assessment must be reviewed before completion.');
  }

  for (const [itemId, existingItem] of existingItemMap.entries()) {
    const submitted = submittedItemMap.get(itemId);
    if (!submitted) {
      throw new Error(`Missing manager review for competency "${existingItem.competency.name}".`);
    }

    // Verify rating exists as a valid CompetencyLevel
    const validLevel = existingItem.competency.levels.find(
      (l) => l.level === submitted.rating
    );

    if (!validLevel) {
      throw new Error(
        `Invalid level ${submitted.rating} for competency "${existingItem.competency.name}".`
      );
    }

    // Justification Rule: REQUIRED if manager rating differs from staff selfRating
    const isRatingChanged = existingItem.selfRating !== submitted.rating;
    if (isRatingChanged) {
      if (!submitted.justification || submitted.justification.trim().length === 0) {
        throw new Error(
          `Justification is required when adjusting the rating for "${existingItem.competency.name}" (Staff: Level ${existingItem.selfRating}, Manager: Level ${submitted.rating}).`
        );
      }
    }
  }

  const now = new Date();

  // 4. Atomically persist Corroborations, update finalRating, and mark Assessment COMPLETED
  return prisma.$transaction(async (tx) => {
    for (const submitted of input.items) {
      const existingItem = existingItemMap.get(submitted.assessmentItemId)!;

      // Create single Corroboration record (unique constraint on assessmentItemId)
      await tx.corroboration.create({
        data: {
          assessmentItemId: existingItem.id,
          managerId,
          rating: submitted.rating,
          justification: submitted.justification ? submitted.justification.trim() : null,
        },
      });

      // Update AssessmentItem finalRating while leaving selfRating completely unchanged
      await tx.assessmentItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          finalRating: submitted.rating,
        },
      });
    }

    // Mark Assessment as COMPLETED
    return tx.assessment.update({
      where: {
        id: assessment.id,
      },
      data: {
        status: AssessmentStatus.COMPLETED,
        completedAt: now,
      },
    });
  });
}
