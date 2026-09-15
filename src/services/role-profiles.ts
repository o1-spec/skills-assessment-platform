import { prisma } from '@/lib/db';
import { CreateRoleProfileInput } from '@/lib/validation';
import { RoleProfile, RoleRequirement, Competency, CompetencyLevel, RoleProfileStatus } from '@prisma/client';

export type RoleProfileListItem = RoleProfile & {
  _count: {
    requirements: number;
  };
};

export type RoleRequirementDetail = RoleRequirement & {
  competency: Competency & {
    levels: CompetencyLevel[];
  };
};

export type RoleProfileDetail = RoleProfile & {
  requirements: RoleRequirementDetail[];
};

/**
 * Retrieves all role profiles for an organization, ordered by newest first.
 * Strictly scoped by tenantId.
 */
export async function getRoleProfilesForTenant(tenantId: string): Promise<RoleProfileListItem[]> {
  if (!tenantId) {
    return [];
  }

  return prisma.roleProfile.findMany({
    where: {
      tenantId,
    },
    include: {
      _count: {
        select: {
          requirements: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Retrieves a single role profile by ID, verifying tenant ownership.
 * Returns null if not found or if it belongs to another tenant.
 */
export async function getRoleProfileById(
  id: string,
  tenantId: string
): Promise<RoleProfileDetail | null> {
  if (!id || !tenantId) {
    return null;
  }

  return prisma.roleProfile.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      requirements: {
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
}

/**
 * Creates a new role profile and its requirements atomically.
 * Ensures:
 * 1. tenantId comes from server-side authenticated context.
 * 2. All submitted competencies belong to this tenant.
 * 3. Every target level corresponds to an existing CompetencyLevel record for that competency.
 * 4. At least one requirement is present if status is PUBLISHED.
 */
export async function createRoleProfile(
  tenantId: string,
  input: CreateRoleProfileInput
): Promise<RoleProfile> {
  if (!tenantId) {
    throw new Error('Tenant ID is required to create a role profile.');
  }

  if (input.status === RoleProfileStatus.PUBLISHED && input.requirements.length === 0) {
    throw new Error('Publishing a role profile requires at least one competency requirement.');
  }

  // Deduplicate requirements by competencyId if submitted multiple times
  const uniqueRequirementsMap = new Map<string, number>();
  for (const req of input.requirements) {
    uniqueRequirementsMap.set(req.competencyId, req.targetLevel);
  }

  const reqEntries = Array.from(uniqueRequirementsMap.entries()).map(([competencyId, targetLevel]) => ({
    competencyId,
    targetLevel,
  }));

  if (reqEntries.length > 0) {
    const competencyIds = reqEntries.map((r) => r.competencyId);

    // Verify tenant ownership of all competencies
    const tenantCompetencies = await prisma.competency.findMany({
      where: {
        id: { in: competencyIds },
        tenantId,
      },
      include: {
        levels: true,
      },
    });

    if (tenantCompetencies.length !== competencyIds.length) {
      throw new Error('One or more selected competencies do not belong to your organization.');
    }

    // Verify that every targetLevel actually exists for that competency
    const compMap = new Map(tenantCompetencies.map((c) => [c.id, c]));

    for (const req of reqEntries) {
      const comp = compMap.get(req.competencyId);
      if (!comp) {
        throw new Error(`Competency not found: ${req.competencyId}`);
      }

      const validLevel = comp.levels.some((l) => l.level === req.targetLevel);
      if (!validLevel) {
        throw new Error(
          `Target level ${req.targetLevel} is not valid for competency "${comp.name}".`
        );
      }
    }
  }

  // Create atomically using Prisma nested create
  return prisma.roleProfile.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description || null,
      status: input.status,
      requirements: {
        create: reqEntries.map((r) => ({
          competencyId: r.competencyId,
          targetLevel: r.targetLevel,
        })),
      },
    },
  });
}
