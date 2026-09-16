import { prisma } from '@/lib/db';
import { SaveAssessmentDraftInput, SubmitAssessmentInput } from '@/lib/validation';
import {
  Assessment,
  AssessmentItem,
  AssessmentStatus,
  Competency,
  CompetencyLevel,
  AssessmentCampaign,
  EvidenceAttachment,
  NotificationType,
  AuditAction,
} from '@prisma/client';
import { createAndDispatchNotification } from '@/services/notifications';
import { logAuditEvent } from './audit';

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
      attachments: EvidenceAttachment[];
    }
  >;
};

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
          attachments: {
            orderBy: {
              createdAt: 'asc',
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

export async function saveAssessmentDraft(
  userId: string,
  tenantId: string,
  input: SaveAssessmentDraftInput
): Promise<Assessment> {
  if (!userId || !tenantId) {
    throw new Error('User and Tenant authorization required.');
  }

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

  if (
    assessment.status === AssessmentStatus.PENDING_CORROBORATION ||
    assessment.status === AssessmentStatus.COMPLETED ||
    assessment.status === AssessmentStatus.SUBMITTED
  ) {
    throw new Error('Cannot edit an assessment that has already been submitted or completed.');
  }

  const validItemMap = new Map(assessment.items.map((i) => [i.id, i]));

  for (const submittedItem of input.items) {
    const matchedItem = validItemMap.get(submittedItem.assessmentItemId);
    if (!matchedItem) {
      throw new Error(`Assessment item ${submittedItem.assessmentItemId} does not belong to this assessment.`);
    }

    if (submittedItem.selfRating !== null && submittedItem.selfRating !== undefined) {
      const validLevels = matchedItem.competency.levels.map((l) => l.level);
      if (!validLevels.includes(submittedItem.selfRating)) {
        throw new Error(
          `Invalid level ${submittedItem.selfRating} for competency "${matchedItem.competency.name}".`
        );
      }
    }
  }

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

export async function submitAssessment(
  userId: string,
  tenantId: string,
  input: SubmitAssessmentInput,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<Assessment> {
  if (!userId || !tenantId) {
    throw new Error('User and Tenant authorization required.');
  }

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

  if (
    assessment.status === AssessmentStatus.PENDING_CORROBORATION ||
    assessment.status === AssessmentStatus.COMPLETED ||
    assessment.status === AssessmentStatus.SUBMITTED
  ) {
    throw new Error('This assessment has already been submitted.');
  }

  if (new Date(assessment.campaign.deadline).getTime() < Date.now()) {
    throw new Error('This assessment deadline has passed.');
  }

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

    const matchedLevel = existingItem.competency.levels.find(
      (l) => l.level === submitted.selfRating
    );

    if (!matchedLevel) {
      throw new Error(
        `Invalid level ${submitted.selfRating} for competency "${existingItem.competency.name}".`
      );
    }

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

  const campaignName = assessment.campaign.name;
  const assessmentId = assessment.id;

  const submittedAssessment = await prisma.$transaction(async (tx) => {
    for (const submitted of input.items) {
      await tx.assessmentItem.update({
        where: {
          id: submitted.assessmentItemId,
        },
        data: {
          selfRating: submitted.selfRating,
          evidenceText: submitted.evidenceText ? submitted.evidenceText.trim() : null,
          finalRating: requiresCorroboration ? null : submitted.selfRating,
        },
      });
    }

    const nextStatus = requiresCorroboration
      ? AssessmentStatus.PENDING_CORROBORATION
      : AssessmentStatus.COMPLETED;

    const updated = await tx.assessment.update({
      where: {
        id: assessmentId,
      },
      data: {
        status: nextStatus,
        submittedAt: now,
        completedAt: requiresCorroboration ? null : now,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.ASSESSMENT_SUBMIT,
      entityType: 'Assessment',
      entityId: assessmentId,
      tenantId,
      actorId: actorContext?.actorId || userId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        campaignId: assessment.campaignId,
        campaignName,
        status: nextStatus,
        resultingStatus: nextStatus,
        requiresCorroboration,
        itemsCount: input.items.length,
      },
    });

    return updated;
  });

  try {
    if (requiresCorroboration) {
      const staffUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
      });

      if (staffUser && staffUser.managerId && staffUser.manager && staffUser.manager.isActive) {
        const manager = staffUser.manager;
        await createAndDispatchNotification({
          tenantId,
          recipientId: manager.id,
          type: NotificationType.ASSESSMENT_SUBMITTED_FOR_REVIEW,
          title: `Assessment Submitted for Review: ${staffUser.name}`,
          message: `${staffUser.name} has submitted their self-assessment for "${campaignName}". Please review and corroborate their ratings.`,
          href: `/manager/corroborations/${assessmentId}`,
          resourceType: 'Assessment',
          resourceId: assessmentId,
          dedupeKey: `assessment-submitted-review:${assessmentId}`,
        }).catch((err) => {
          console.error(
            '[NotificationEngine:Assessment] Failed to dispatch manager review notification:',
            err
          );
        });
      }
    } else {
      await createAndDispatchNotification({
        tenantId,
        recipientId: userId,
        type: NotificationType.ASSESSMENT_COMPLETED,
        title: `Assessment Completed: ${campaignName}`,
        message: `Your skills assessment for "${campaignName}" has been completed and recorded successfully.`,
        href: `/staff/assessments/${assessmentId}`,
        resourceType: 'Assessment',
        resourceId: assessmentId,
        dedupeKey: `assessment-completed:${assessmentId}`,
      }).catch((err) => {
        console.error(
          '[NotificationEngine:Assessment] Failed to dispatch completion notification to staff:',
          err
        );
      });
    }
  } catch (notifErr) {
    console.error(
      '[NotificationEngine:Assessment] Error in post-submission notification handler:',
      notifErr
    );
  }

  return submittedAssessment;
}
