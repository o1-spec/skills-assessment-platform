import { prisma } from '@/lib/db';
import { SaveAssessmentDraftInput, SubmitAssessmentInput } from '@/lib/validation';
import {
  Assessment,
  AssessmentItem,
  AssessmentStatus,
  Competency,
  CompetencyLevel,
  AssessmentCampaign,
} from '@prisma/client';

export type StaffAssessmentListItem = Assessment & {
  campaign: Pick<
    AssessmentCampaign,
    'id' | 'name' | 'description' | 'deadline' | 'requiresCorroboration' | 'status'
  >;
  competencyCount: number;
  answeredCount: number;
};

export type StaffAssessmentDetail = Assessment & {
  campaign: Pick<
    AssessmentCampaign,
    'id' | 'name' | 'description' | 'deadline' | 'requiresCorroboration' | 'status'
  >;
  isPastDeadline: boolean;
  items: Array<
    AssessmentItem & {
      competency: Competency & {
        levels: CompetencyLevel[];
      };
    }
  >;
};

/**
 * Retrieves all assessments assigned to the given staff user within their tenant.
 */
export async function getAssessmentsForStaff(
  userId: string,
  tenantId: string
): Promise<StaffAssessmentListItem[]> {
  if (!userId || !tenantId) {
    return [];
  }

  const assessments = await prisma.assessment.findMany({
    where: {
      userId,
      campaign: {
        tenantId,
      },
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          description: true,
          deadline: true,
          requiresCorroboration: true,
          status: true,
        },
      },
      items: {
        select: {
          id: true,
          selfRating: true,
          evidenceText: true,
          finalRating: true,
        },
      },
    },
    orderBy: {
      campaign: {
        deadline: 'asc',
      },
    },
  });

  return assessments.map((assessment) => {
    const answeredCount = assessment.items.filter((item) => item.selfRating !== null).length;
    const competencyCount = assessment.items.length;

    return {
      ...assessment,
      answeredCount,
      competencyCount,
    };
  });
}

/**
 * Retrieves a single assessment detail for a staff user with strict ownership & tenant isolation.
 */
export async function getStaffAssessmentById(
  assessmentId: string,
  userId: string,
  tenantId: string
): Promise<StaffAssessmentDetail | null> {
  if (!assessmentId || !userId || !tenantId) {
    return null;
  }

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      userId,
      campaign: {
        tenantId,
      },
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          description: true,
          deadline: true,
          requiresCorroboration: true,
          status: true,
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

  if (!assessment) {
    return null;
  }

  const isPastDeadline = new Date(assessment.campaign.deadline).getTime() < Date.now();

  return {
    ...assessment,
    isPastDeadline,
  };
}

/**
 * Saves draft progress for a staff assessment.
 * Allows incomplete data (unanswered competencies, missing evidence).
 * Transitions NOT_STARTED -> DRAFT.
 */
export async function saveAssessmentDraft(
  userId: string,
  tenantId: string,
  input: SaveAssessmentDraftInput
): Promise<Assessment> {
  if (!userId || !tenantId) {
    throw new Error('User and Tenant authorization required.');
  }

  // 1. Fetch current assessment with tenant & user ownership
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: input.assessmentId,
      userId,
      campaign: {
        tenantId,
      },
    },
    include: {
      campaign: true,
      items: {
        include: {
          competency: {
            include: {
              levels: true,
            },
          },
        },
      },
    },
  });

  if (!assessment) {
    throw new Error('Assessment not found or does not belong to your account.');
  }

  // 2. Prevent editing if already submitted or completed
  if (
    assessment.status === AssessmentStatus.PENDING_CORROBORATION ||
    assessment.status === AssessmentStatus.COMPLETED ||
    assessment.status === AssessmentStatus.SUBMITTED
  ) {
    throw new Error('Cannot edit an assessment that has already been submitted or completed.');
  }

  // 3. Build a map of valid assessment items
  const validItemMap = new Map(assessment.items.map((i) => [i.id, i]));

  // Validate each provided item
  for (const submittedItem of input.items) {
    const matchedItem = validItemMap.get(submittedItem.assessmentItemId);
    if (!matchedItem) {
      throw new Error(`Assessment item ${submittedItem.assessmentItemId} does not belong to this assessment.`);
    }

    // Validate selfRating against database levels if supplied
    if (submittedItem.selfRating !== null && submittedItem.selfRating !== undefined) {
      const validLevels = matchedItem.competency.levels.map((l) => l.level);
      if (!validLevels.includes(submittedItem.selfRating)) {
        throw new Error(
          `Invalid level ${submittedItem.selfRating} for competency "${matchedItem.competency.name}".`
        );
      }
    }
  }

  // 4. Update items and status in a transaction
  return prisma.$transaction(async (tx) => {
    for (const submittedItem of input.items) {
      await tx.assessmentItem.update({
        where: {
          id: submittedItem.assessmentItemId,
        },
        data: {
          selfRating: submittedItem.selfRating ?? null,
          evidenceText: submittedItem.evidenceText ?? null,
        },
      });
    }

    // Transition NOT_STARTED -> DRAFT if applicable
    const nextStatus =
      assessment.status === AssessmentStatus.NOT_STARTED
        ? AssessmentStatus.DRAFT
        : assessment.status;

    return tx.assessment.update({
      where: {
        id: assessment.id,
      },
      data: {
        status: nextStatus,
      },
    });
  });
}

/**
 * Submits a completed staff assessment atomically.
 * Requires all items to have a valid selfRating.
 * Requires evidenceText if the chosen level includes an evidencePrompt.
 * Transitions to PENDING_CORROBORATION (if corroboration required) or COMPLETED (if not).
 */
export async function submitAssessment(
  userId: string,
  tenantId: string,
  input: SubmitAssessmentInput
): Promise<Assessment> {
  if (!userId || !tenantId) {
    throw new Error('User and Tenant authorization required.');
  }

  // 1. Fetch current assessment with tenant & user ownership
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: input.assessmentId,
      userId,
      campaign: {
        tenantId,
      },
    },
    include: {
      campaign: true,
      items: {
        include: {
          competency: {
            include: {
              levels: true,
            },
          },
        },
      },
    },
  });

  if (!assessment) {
    throw new Error('Assessment not found or does not belong to your account.');
  }

  // 2. Prevent submitting if already submitted/completed
  if (
    assessment.status === AssessmentStatus.PENDING_CORROBORATION ||
    assessment.status === AssessmentStatus.COMPLETED ||
    assessment.status === AssessmentStatus.SUBMITTED
  ) {
    throw new Error('This assessment has already been submitted.');
  }

  // 3. Deadline check
  if (new Date(assessment.campaign.deadline).getTime() < Date.now()) {
    throw new Error('This assessment deadline has passed.');
  }

  // 4. Validate that all items belonging to the assessment are supplied
  const existingItemMap = new Map(assessment.items.map((i) => [i.id, i]));
  const submittedItemMap = new Map(input.items.map((i) => [i.assessmentItemId, i]));

  if (submittedItemMap.size !== existingItemMap.size) {
    throw new Error('All competencies in this assessment must be completed before submission.');
  }

  for (const [itemId, existingItem] of existingItemMap.entries()) {
    const submitted = submittedItemMap.get(itemId);
    if (!submitted) {
      throw new Error(`Missing rating for competency "${existingItem.competency.name}".`);
    }

    if (submitted.selfRating === null || submitted.selfRating === undefined) {
      throw new Error(`Please select a rating for competency "${existingItem.competency.name}".`);
    }

    // Validate that selfRating is a real CompetencyLevel in DB
    const matchedLevel = existingItem.competency.levels.find(
      (l) => l.level === submitted.selfRating
    );

    if (!matchedLevel) {
      throw new Error(
        `Invalid level ${submitted.selfRating} for competency "${existingItem.competency.name}".`
      );
    }

    // If level has an evidencePrompt, require evidenceText
    if (matchedLevel.evidencePrompt && matchedLevel.evidencePrompt.trim().length > 0) {
      if (!submitted.evidenceText || submitted.evidenceText.trim().length === 0) {
        throw new Error(
          `Supporting evidence is required for "${existingItem.competency.name}" at Level ${matchedLevel.level}.`
        );
      }
    }
  }

  const now = new Date();
  const requiresCorroboration = assessment.campaign.requiresCorroboration;

  // 5. Execute submission atomically
  return prisma.$transaction(async (tx) => {
    for (const submitted of input.items) {
      await tx.assessmentItem.update({
        where: {
          id: submitted.assessmentItemId,
        },
        data: {
          selfRating: submitted.selfRating,
          evidenceText: submitted.evidenceText ? submitted.evidenceText.trim() : null,
          // If no manager corroboration required, employee's self-rating becomes the finalRating
          finalRating: requiresCorroboration ? null : submitted.selfRating,
        },
      });
    }

    const nextStatus = requiresCorroboration
      ? AssessmentStatus.PENDING_CORROBORATION
      : AssessmentStatus.COMPLETED;

    return tx.assessment.update({
      where: {
        id: assessment.id,
      },
      data: {
        status: nextStatus,
        submittedAt: now,
        completedAt: requiresCorroboration ? null : now,
      },
    });
  });
}
