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
  EvidenceAttachment,
  User,
  NotificationType,
  AuditAction,
} from '@prisma/client';
import { createAndDispatchNotification } from '@/services/notifications';
import { logAuditEvent } from './audit';

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
      attachments: EvidenceAttachment[];
    }
  >;
};

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
}

export async function submitCorroboration(
  managerId: string,
  tenantId: string,
  input: SubmitCorroborationInput,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<Assessment> {
  if (!managerId || !tenantId) {
    throw new Error('Manager and Tenant authorization required.');
  }

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

  if (assessment.status !== AssessmentStatus.PENDING_CORROBORATION) {
    throw new Error('This assessment is not pending manager review.');
  }

  if (!assessment.campaign.requiresCorroboration) {
    throw new Error('This assessment campaign does not require manager corroboration.');
  }

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

    const validLevel = existingItem.competency.levels.find(
      (l) => l.level === submitted.rating
    );

    if (!validLevel) {
      throw new Error(
        `Invalid level ${submitted.rating} for competency "${existingItem.competency.name}".`
      );
    }

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

  const assessmentUserId = assessment.userId;
  const assessmentId = assessment.id;
  const campaignName = assessment.campaign.name;

  const completedAssessment = await prisma.$transaction(async (tx) => {
    for (const submitted of input.items) {
      const existingItem = existingItemMap.get(submitted.assessmentItemId)!;

      await tx.corroboration.create({
        data: {
          assessmentItemId: existingItem.id,
          managerId,
          rating: submitted.rating,
          justification: submitted.justification ? submitted.justification.trim() : null,
        },
      });

      await tx.assessmentItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          finalRating: submitted.rating,
        },
      });
    }

    const updated = await tx.assessment.update({
      where: {
        id: assessmentId,
      },
      data: {
        status: AssessmentStatus.COMPLETED,
        completedAt: now,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.CORROBORATION_SUBMIT,
      entityType: 'Assessment',
      entityId: assessmentId,
      tenantId,
      actorId: actorContext?.actorId || managerId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        campaignId: assessment.campaignId,
        campaignName,
        staffUserId: assessmentUserId,
        staffName: assessment.user.name,
        reviewedItemsCount: input.items.length,
      },
    });

    return updated;
  });

  try {
    await createAndDispatchNotification({
      tenantId,
      recipientId: assessmentUserId,
      type: NotificationType.CORROBORATION_COMPLETED,
      title: `Assessment Review Completed: ${campaignName}`,
      message: `Your manager has reviewed and corroborated your skills assessment for "${campaignName}". Your results are now finalized.`,
      href: `/staff/assessments/${assessmentId}`,
      resourceType: 'Assessment',
      resourceId: assessmentId,
      dedupeKey: `corroboration-completed:${assessmentId}`,
    }).catch((err) => {
      console.error(
        '[NotificationEngine:Corroboration] Failed to dispatch corroboration completed notification:',
        err
      );
    });
  } catch (notifErr) {
    console.error(
      '[NotificationEngine:Corroboration] Error in post-corroboration notification handler:',
      notifErr
    );
  }

  return completedAssessment;
}
