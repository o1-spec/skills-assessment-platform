import { prisma } from '@/lib/db';
import {
  CreateCampaignInput,
  UpdateCampaignDraftInput,
  createCampaignSchema,
  updateCampaignDraftSchema,
} from '@/lib/validation';
import {
  AssessmentCampaign,
  CampaignCompetency,
  CampaignParticipant,
  Competency,
  CompetencyLevel,
  RoleProfile,
  User,
  Assessment,
  AssessmentItem,
  CampaignStatus,
  CampaignScope,
  AssessmentStatus,
  RoleProfileStatus,
  UserRole,
  NotificationType,
} from '@prisma/client';
import { createAndDispatchNotification } from '@/services/notifications';

export type CampaignListItem = AssessmentCampaign & {
  roleProfile: {
    id: string;
    name: string;
  } | null;
  campaignTeams: Array<{
    team: {
      id: string;
      name: string;
    };
  }>;
  _count: {
    competencies: number;
    participants: number;
    assessments: number;
  };
};

export type CampaignDetail = AssessmentCampaign & {
  roleProfile: RoleProfile | null;
  frameworkVersion: {
    id: string;
    version: string;
  } | null;
  campaignTeams: Array<{
    id: string;
    teamId: string;
    team: {
      id: string;
      name: string;
      department: { id: string; name: string } | null;
      _count: { memberships: number };
    };
  }>;
  competencies: Array<
    CampaignCompetency & {
      competency: Competency & {
        levels: CompetencyLevel[];
      };
    }
  >;
  participants: Array<
    CampaignParticipant & {
      user: User;
    }
  >;
  assessments: Array<
    Assessment & {
      user: User;
      items: Array<
        AssessmentItem & {
          competency: Competency;
        }
      >;
    }
  >;
};

export type PublishedRoleProfileOption = RoleProfile & {
  requirements: Array<{
    competencyId: string;
    targetLevel: number;
  }>;
};

export type EligibleParticipantOption = Pick<User, 'id' | 'name' | 'email' | 'role'>;

export type EligibleTeamOption = {
  id: string;
  name: string;
  department: { id: string; name: string } | null;
  _count: { memberships: number };
};

export type EligibleCampaignTeamOption = EligibleTeamOption;

export type ParticipantMonitoringRecord = {
  participantId?: string;
  userId: string;
  name: string;
  email: string;
  teams: Array<{ id: string; name: string }>;
  roleProfileName: string | null;
  assessmentStatus: AssessmentStatus;
  submittedAt: Date | null;
  completedAt: Date | null;
  isOverdue: boolean;
};

export type CampaignMonitoringSummary = {
  totalParticipants: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  completed: number;
  overdue: number;
  completionPercentage: number;
  participants: ParticipantMonitoringRecord[];
};

export type CampaignMonitoringStats = CampaignMonitoringSummary;

/**
 * Retrieves all assessment campaigns belonging to the specified tenant.
 */
export async function getCampaignsForTenant(tenantId: string): Promise<CampaignListItem[]> {
  if (!tenantId) {
    return [];
  }

  return prisma.assessmentCampaign.findMany({
    where: {
      tenantId,
    },
    include: {
      roleProfile: {
        select: {
          id: true,
          name: true,
        },
      },
      campaignTeams: {
        include: {
          team: {
            select: { id: true, name: true },
          },
        },
      },
      _count: {
        select: {
          competencies: true,
          participants: true,
          assessments: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Retrieves a single assessment campaign by ID with strict tenant isolation.
 * Returns null if the campaign does not belong to the tenant.
 */
export async function getCampaignById(
  id: string,
  tenantId: string
): Promise<CampaignDetail | null> {
  if (!id || !tenantId) {
    return null;
  }

  return prisma.assessmentCampaign.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      roleProfile: true,
      frameworkVersion: {
        select: { id: true, version: true },
      },
      campaignTeams: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              department: { select: { id: true, name: true } },
              _count: { select: { memberships: true } },
            },
          },
        },
      },
      competencies: {
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
      participants: {
        include: {
          user: true,
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      },
      assessments: {
        include: {
          user: true,
          items: {
            include: {
              competency: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      },
    },
  });
}

/**
 * Loads published role profiles with requirements for preselection.
 */
export async function getPublishedRoleProfilesForTenant(
  tenantId: string
): Promise<PublishedRoleProfileOption[]> {
  if (!tenantId) {
    return [];
  }

  return prisma.roleProfile.findMany({
    where: {
      tenantId,
      status: RoleProfileStatus.PUBLISHED,
      isArchived: false,
    },
    include: {
      requirements: {
        select: {
          competencyId: true,
          targetLevel: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Loads active staff users eligible to be campaign participants.
 */
export async function getEligibleCampaignParticipants(
  tenantId: string
): Promise<EligibleParticipantOption[]> {
  if (!tenantId) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      tenantId,
      role: UserRole.STAFF,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Loads active teams eligible to be targeted by a campaign.
 */
export async function getEligibleCampaignTeams(tenantId: string): Promise<EligibleTeamOption[]> {
  if (!tenantId) {
    return [];
  }

  return prisma.team.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      department: {
        select: { id: true, name: true },
      },
      _count: {
        select: { memberships: true },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Resolves participant user IDs based on the specified scope and selections.
 */
export async function resolveCampaignParticipants(
  tenantId: string,
  scope: CampaignScope,
  options: {
    teamIds?: string[];
    participantIds?: string[];
  } = {}
): Promise<string[]> {
  if (scope === CampaignScope.ORGANIZATION) {
    const staff = await prisma.user.findMany({
      where: {
        tenantId,
        role: UserRole.STAFF,
        isActive: true,
      },
      select: { id: true },
    });
    return staff.map((s) => s.id);
  }

  if (scope === CampaignScope.TEAM) {
    const teamIds = options.teamIds || [];
    if (teamIds.length === 0) return [];

    // Verify all teams belong to tenant and are active
    const teams = await prisma.team.findMany({
      where: {
        id: { in: teamIds },
        tenantId,
        isActive: true,
      },
      select: { id: true },
    });

    if (teams.length !== teamIds.length) {
      throw new Error('One or more selected teams are invalid, inactive, or belong to another organization.');
    }

    // Find all active STAFF users belonging to these teams
    const memberships = await prisma.teamMembership.findMany({
      where: {
        teamId: { in: teamIds },
        user: {
          tenantId,
          role: UserRole.STAFF,
          isActive: true,
        },
      },
      select: { userId: true },
    });

    return Array.from(new Set(memberships.map((m) => m.userId)));
  }

  if (scope === CampaignScope.INDIVIDUAL) {
    const participantIds = options.participantIds || [];
    if (participantIds.length === 0) return [];

    const validStaff = await prisma.user.findMany({
      where: {
        id: { in: participantIds },
        tenantId,
        role: UserRole.STAFF,
        isActive: true,
      },
      select: { id: true },
    });

    if (validStaff.length !== participantIds.length) {
      throw new Error('One or more selected participants are invalid, inactive, or not staff members of your organization.');
    }

    return Array.from(new Set(validStaff.map((s) => s.id)));
  }

  return [];
}

/**
 * Creates an assessment campaign atomically.
 * If status is ACTIVE, also initializes Assessment and AssessmentItem records for all participants.
 */
export async function createAssessmentCampaign(
  tenantId: string,
  rawInput: CreateCampaignInput
): Promise<AssessmentCampaign> {
  if (!tenantId) {
    throw new Error('Tenant ID is required to create a campaign.');
  }

  const input = createCampaignSchema.parse(rawInput);

  const isActive = input.status === CampaignStatus.ACTIVE;

  // 1. Resolve participants based on scope
  const resolvedParticipantIds = await resolveCampaignParticipants(tenantId, input.scope, {
    teamIds: input.teamIds,
    participantIds: input.participantIds,
  });

  // 2. Business logic checks for ACTIVE campaigns
  if (isActive) {
    if (input.competencyIds.length === 0) {
      throw new Error('An active campaign must contain at least one competency.');
    }
    if (input.scope === CampaignScope.TEAM && input.teamIds.length === 0) {
      throw new Error('A team-scoped campaign must select at least one team.');
    }
    if (resolvedParticipantIds.length === 0) {
      throw new Error('An active campaign must resolve to at least one eligible active staff participant.');
    }
    if (input.deadline.getTime() <= Date.now()) {
      throw new Error('The campaign deadline must be in the future.');
    }
  }

  // 3. Validate optional RoleProfile ownership
  if (input.roleProfileId) {
    const roleProfile = await prisma.roleProfile.findFirst({
      where: {
        id: input.roleProfileId,
        tenantId,
        status: RoleProfileStatus.PUBLISHED,
        isArchived: false,
      },
    });

    if (!roleProfile) {
      throw new Error('The selected role profile is invalid, unpublished, archived, or belongs to another organization.');
    }
  }

  // 4. Validate Competencies ownership
  if (input.competencyIds.length > 0) {
    const validCompetencies = await prisma.competency.findMany({
      where: {
        id: { in: input.competencyIds },
        tenantId,
      },
      select: { id: true },
    });

    if (validCompetencies.length !== input.competencyIds.length) {
      throw new Error('One or more selected competencies do not belong to your organization.');
    }
  }

  // 5. Execute atomic transaction
  const createdCampaign = await prisma.$transaction(async (tx) => {
    // Capture active framework version for campaign cycle provenance
    const activeAdoption = await tx.tenantFrameworkAdoption.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // Create base campaign with join rows
    const campaign = await tx.assessmentCampaign.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description || null,
        deadline: input.deadline,
        requiresCorroboration: input.requiresCorroboration,
        status: input.status,
        scope: input.scope,
        roleProfileId: input.roleProfileId || null,
        frameworkVersionId: activeAdoption?.frameworkVersionId || null,
        competencies: {
          create: input.competencyIds.map((competencyId) => ({
            competencyId,
          })),
        },
        campaignTeams:
          input.scope === CampaignScope.TEAM
            ? {
                create: input.teamIds.map((teamId) => ({
                  teamId,
                })),
              }
            : undefined,
        participants: {
          create: resolvedParticipantIds.map((userId) => ({
            userId,
          })),
        },
      },
    });

    // If ACTIVE, instantiate Assessment and AssessmentItem records for every participant
    if (isActive && resolvedParticipantIds.length > 0 && input.competencyIds.length > 0) {
      for (const userId of resolvedParticipantIds) {
        await tx.assessment.create({
          data: {
            campaignId: campaign.id,
            userId,
            status: AssessmentStatus.NOT_STARTED,
            items: {
              create: input.competencyIds.map((competencyId) => ({
                competencyId,
                selfRating: null,
                evidenceText: null,
                finalRating: null,
              })),
            },
          },
        });
      }
    }

    return campaign;
  });

  if (isActive) {
    await notifyCampaignAssignedParticipants(createdCampaign.id, tenantId);
  }

  return createdCampaign;
}

/**
 * Updates a DRAFT assessment campaign.
 * Active campaigns are immutable and cannot be updated.
 */
export async function updateCampaignDraft(
  tenantId: string,
  campaignId: string,
  rawInput: UpdateCampaignDraftInput
): Promise<AssessmentCampaign> {
  if (!tenantId || !campaignId) {
    throw new Error('Tenant ID and Campaign ID are required.');
  }

  const input = updateCampaignDraftSchema.parse(rawInput);

  const campaign = await prisma.assessmentCampaign.findFirst({
    where: { id: campaignId, tenantId },
    include: { competencies: true, campaignTeams: true, participants: true },
  });

  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  if (campaign.status !== CampaignStatus.DRAFT) {
    throw new Error('Only draft campaigns can be modified. Active campaigns are immutable.');
  }

  // Validate optional role profile
  if (input.roleProfileId) {
    const rp = await prisma.roleProfile.findFirst({
      where: { id: input.roleProfileId, tenantId, status: RoleProfileStatus.PUBLISHED, isArchived: false },
    });
    if (!rp) {
      throw new Error('The selected role profile is invalid, unpublished, archived, or belongs to another organization.');
    }
  }

  // Validate competencies
  if (input.competencyIds.length > 0) {
    const validCompetencies = await prisma.competency.findMany({
      where: { id: { in: input.competencyIds }, tenantId },
      select: { id: true },
    });
    if (validCompetencies.length !== input.competencyIds.length) {
      throw new Error('One or more selected competencies do not belong to your organization.');
    }
  }

  // Resolve participants for draft snapshot
  const resolvedParticipantIds = await resolveCampaignParticipants(tenantId, input.scope, {
    teamIds: input.teamIds,
    participantIds: input.participantIds,
  });

  return prisma.$transaction(async (tx) => {
    // 1. Delete existing draft associations
    await tx.campaignCompetency.deleteMany({ where: { campaignId } });
    await tx.campaignTeam.deleteMany({ where: { campaignId } });
    await tx.campaignParticipant.deleteMany({ where: { campaignId } });

    // 2. Update campaign details
    const updated = await tx.assessmentCampaign.update({
      where: { id: campaignId },
      data: {
        name: input.name,
        description: input.description || null,
        deadline: input.deadline,
        requiresCorroboration: input.requiresCorroboration,
        roleProfileId: input.roleProfileId || null,
        scope: input.scope,
        competencies: {
          create: input.competencyIds.map((competencyId) => ({ competencyId })),
        },
        campaignTeams:
          input.scope === CampaignScope.TEAM
            ? { create: input.teamIds.map((teamId) => ({ teamId })) }
            : undefined,
        participants: {
          create: resolvedParticipantIds.map((userId) => ({ userId })),
        },
      },
    });

    return updated;
  });
}

/**
 * Atomically launches a DRAFT assessment campaign into ACTIVE status.
 * Captures the current active framework version, resolves eligible staff participants,
 * snapshots participants, and creates Assessment and AssessmentItem records.
 */
export async function launchCampaign(
  tenantId: string,
  campaignId: string
): Promise<AssessmentCampaign> {
  if (!tenantId || !campaignId) {
    throw new Error('Tenant ID and Campaign ID are required.');
  }

  const campaign = await prisma.assessmentCampaign.findFirst({
    where: { id: campaignId, tenantId },
    include: {
      competencies: true,
      campaignTeams: true,
      participants: true,
    },
  });

  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  if (campaign.status !== CampaignStatus.DRAFT) {
    throw new Error('Only draft campaigns can be launched.');
  }

  if (campaign.deadline.getTime() <= Date.now()) {
    throw new Error('The campaign deadline must be in the future to launch.');
  }

  if (campaign.competencies.length === 0) {
    throw new Error('An active campaign must contain at least one competency.');
  }

  // Resolve participants according to campaign.scope
  const teamIds = campaign.campaignTeams.map((t) => t.teamId);
  const participantIds = campaign.participants.map((p) => p.userId);

  const resolvedParticipantIds = await resolveCampaignParticipants(tenantId, campaign.scope, {
    teamIds,
    participantIds,
  });

  if (resolvedParticipantIds.length === 0) {
    throw new Error('Cannot launch campaign: no eligible active staff members were resolved for this scope.');
  }

  const launchedCampaign = await prisma.$transaction(async (tx) => {
    // 1. Capture active framework version for campaign cycle provenance
    const activeAdoption = await tx.tenantFrameworkAdoption.findFirst({
      where: { tenantId, isActive: true },
    });

    // 2. Refresh CampaignParticipant snapshot
    await tx.campaignParticipant.deleteMany({ where: { campaignId } });
    await tx.campaignParticipant.createMany({
      data: resolvedParticipantIds.map((userId) => ({ campaignId, userId })),
    });

    // 3. Create Assessment and AssessmentItem records
    for (const userId of resolvedParticipantIds) {
      await tx.assessment.create({
        data: {
          campaignId,
          userId,
          status: AssessmentStatus.NOT_STARTED,
          items: {
            create: campaign.competencies.map((c) => ({
              competencyId: c.competencyId,
              selfRating: null,
              evidenceText: null,
              finalRating: null,
            })),
          },
        },
      });
    }

    // 4. Update campaign status to ACTIVE and bind framework version
    const launched = await tx.assessmentCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.ACTIVE,
        frameworkVersionId: activeAdoption?.frameworkVersionId || campaign.frameworkVersionId,
      },
    });

    return launched;
  });

  await notifyCampaignAssignedParticipants(launchedCampaign.id, tenantId);

  return launchedCampaign;
}

/**
 * Central helper to notify all enrolled staff participants when a campaign becomes ACTIVE.
 */
async function notifyCampaignAssignedParticipants(
  campaignId: string,
  tenantId: string
): Promise<void> {
  try {
    const campaign = await prisma.assessmentCampaign.findUnique({
      where: { id: campaignId },
      include: {
        participants: true,
        assessments: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!campaign || campaign.status !== CampaignStatus.ACTIVE) return;

    const formattedDeadline = new Date(campaign.deadline).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const assessmentMap = new Map(campaign.assessments.map((a) => [a.userId, a.id]));

    for (const participant of campaign.participants) {
      const assessmentId = assessmentMap.get(participant.userId);
      const href = assessmentId ? `/staff/assessments/${assessmentId}` : '/staff/assessments';
      const dedupeKey = `campaign-assigned:${campaign.id}:${participant.userId}`;

      await createAndDispatchNotification({
        tenantId,
        recipientId: participant.userId,
        type: NotificationType.CAMPAIGN_ASSIGNED,
        title: `New Assessment Assigned: ${campaign.name}`,
        message: `You have been enrolled in the "${campaign.name}" skills assessment. Complete and submit your self-assessment before the deadline on ${formattedDeadline}.`,
        href,
        resourceType: 'AssessmentCampaign',
        resourceId: campaign.id,
        dedupeKey,
      }).catch((err) => {
        console.error(
          `[NotificationEngine:Campaign] Failed to dispatch notification to user ${participant.userId}:`,
          err
        );
      });
    }
  } catch (err) {
    console.error(
      `[NotificationEngine:Campaign] Error dispatching launch notifications for campaign ${campaignId}:`,
      err
    );
  }
}

/**
 * Calculates monitoring metrics and participant records for an assessment campaign.
 */
export async function getCampaignMonitoringStats(
  tenantId: string,
  campaignId: string
): Promise<CampaignMonitoringSummary | null> {
  const campaign = await prisma.assessmentCampaign.findFirst({
    where: { id: campaignId, tenantId },
    include: {
      participants: {
        include: {
          user: {
            include: {
              roleProfile: { select: { name: true } },
              teamMemberships: {
                where: { team: { tenantId } },
                include: { team: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
      assessments: true,
    },
  });

  if (!campaign) return null;

  const assessmentMap = new Map(campaign.assessments.map((a) => [a.userId, a]));
  const now = new Date();
  const isPastDeadline = campaign.deadline < now;

  let notStarted = 0;
  let inProgress = 0;
  let submitted = 0;
  let completed = 0;
  let overdue = 0;

  const participantRecords: ParticipantMonitoringRecord[] = campaign.participants.map((p) => {
    const assessment = assessmentMap.get(p.userId);
    const status = assessment ? assessment.status : AssessmentStatus.NOT_STARTED;
    const isCompleted = status === AssessmentStatus.COMPLETED;
    const isOverdue = isPastDeadline && !isCompleted;

    if (isOverdue) overdue++;

    if (status === AssessmentStatus.NOT_STARTED) {
      notStarted++;
    } else if (status === AssessmentStatus.DRAFT) {
      inProgress++;
    } else if (
      status === AssessmentStatus.SUBMITTED ||
      status === AssessmentStatus.PENDING_CORROBORATION
    ) {
      submitted++;
    } else if (status === AssessmentStatus.COMPLETED) {
      completed++;
    }

    return {
      userId: p.userId,
      name: p.user.name,
      email: p.user.email,
      teams: p.user.teamMemberships.map((m) => ({ id: m.team.id, name: m.team.name })),
      roleProfileName: p.user.roleProfile?.name || null,
      assessmentStatus: status,
      submittedAt: assessment?.submittedAt || null,
      completedAt: assessment?.completedAt || null,
      isOverdue,
    };
  });

  const totalParticipants = participantRecords.length;
  const completionPercentage =
    totalParticipants > 0 ? Math.round((completed / totalParticipants) * 100) : 0;

  return {
    totalParticipants,
    notStarted,
    inProgress,
    submitted,
    completed,
    overdue,
    completionPercentage,
    participants: participantRecords,
  };
}
