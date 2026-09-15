import { prisma } from '@/lib/db';
import { CreateCampaignInput } from '@/lib/validation';
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
  AssessmentStatus,
  RoleProfileStatus,
  UserRole,
} from '@prisma/client';

export type CampaignListItem = AssessmentCampaign & {
  roleProfile: {
    id: string;
    name: string;
  } | null;
  _count: {
    competencies: number;
    participants: number;
    assessments: number;
  };
};

export type CampaignDetail = AssessmentCampaign & {
  roleProfile: RoleProfile | null;
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
 * Creates an assessment campaign atomically.
 * If status is ACTIVE, also initializes Assessment and AssessmentItem records for all participants.
 */
export async function createAssessmentCampaign(
  tenantId: string,
  input: CreateCampaignInput
): Promise<AssessmentCampaign> {
  if (!tenantId) {
    throw new Error('Tenant ID is required to create a campaign.');
  }

  const isActive = input.status === CampaignStatus.ACTIVE;

  // 1. Business logic check for ACTIVE campaigns
  if (isActive) {
    if (input.competencyIds.length === 0) {
      throw new Error('An active campaign must contain at least one competency.');
    }
    if (input.participantIds.length === 0) {
      throw new Error('An active campaign must contain at least one staff participant.');
    }
    if (input.deadline.getTime() <= Date.now()) {
      throw new Error('The campaign deadline must be in the future.');
    }
  }

  // 2. Validate optional RoleProfile ownership
  if (input.roleProfileId) {
    const roleProfile = await prisma.roleProfile.findFirst({
      where: {
        id: input.roleProfileId,
        tenantId,
        status: RoleProfileStatus.PUBLISHED,
      },
    });

    if (!roleProfile) {
      throw new Error('The selected role profile is invalid, unpublished, or belongs to another organization.');
    }
  }

  // 3. Validate Competencies ownership
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

  // 4. Validate Participants (must belong to tenant, role STAFF, isActive true)
  if (input.participantIds.length > 0) {
    const validStaff = await prisma.user.findMany({
      where: {
        id: { in: input.participantIds },
        tenantId,
        role: UserRole.STAFF,
        isActive: true,
      },
      select: { id: true },
    });

    if (validStaff.length !== input.participantIds.length) {
      throw new Error('One or more selected participants are invalid, inactive, or not staff members of your organization.');
    }
  }

  // 5. Execute atomic transaction
  return prisma.$transaction(async (tx) => {
    // Create base campaign with join rows
    const campaign = await tx.assessmentCampaign.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description || null,
        deadline: input.deadline,
        requiresCorroboration: input.requiresCorroboration,
        status: input.status,
        roleProfileId: input.roleProfileId || null,
        competencies: {
          create: input.competencyIds.map((competencyId) => ({
            competencyId,
          })),
        },
        participants: {
          create: input.participantIds.map((userId) => ({
            userId,
          })),
        },
      },
    });

    // If ACTIVE, instantiate Assessment and AssessmentItem records for every participant
    if (isActive && input.participantIds.length > 0 && input.competencyIds.length > 0) {
      for (const userId of input.participantIds) {
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
}
