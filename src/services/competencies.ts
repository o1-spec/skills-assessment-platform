import { prisma } from '@/lib/db';
import { Competency, CompetencyLevel, AuditAction } from '@prisma/client';
import { CreateCustomCompetencyInput, UpdateCustomCompetencyInput } from '@/lib/validation/custom-competency';
import { logAuditEvent } from './audit';

export type CompetencyWithLevels = Competency & {
  levels: CompetencyLevel[];
  frameworkCompetency?: {
    name: string;
    category: {
      frameworkVersion: {
        version: string;
      };
    };
  } | null;
  usageCount?: {
    roleRequirements: number;
    campaignCompetencies: number;
    assessmentItems: number;
  };
};

/**
 * Retrieves all competencies belonging to the specified tenant (active and inactive),
 * including all ordered competency level descriptors and canonical provenance.
 */
export async function getCompetenciesForTenant(tenantId: string): Promise<CompetencyWithLevels[]> {
  if (!tenantId) {
    return [];
  }

  return prisma.competency.findMany({
    where: {
      tenantId,
    },
    include: {
      levels: {
        orderBy: {
          level: 'asc',
        },
      },
      frameworkCompetency: {
        select: {
          name: true,
          category: {
            select: {
              frameworkVersion: {
                select: {
                  version: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { type: 'asc' },
      { name: 'asc' },
    ],
  });
}

/**
 * Retrieves ONLY ACTIVE competencies belonging to the specified tenant.
 * Used for new configuration workflows (creating role profiles, configuring campaigns).
 */
export async function getActiveCompetenciesForTenant(tenantId: string): Promise<CompetencyWithLevels[]> {
  if (!tenantId) {
    return [];
  }

  return prisma.competency.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    include: {
      levels: {
        orderBy: {
          level: 'asc',
        },
      },
      frameworkCompetency: {
        select: {
          name: true,
          category: {
            select: {
              frameworkVersion: {
                select: {
                  version: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { type: 'asc' },
      { name: 'asc' },
    ],
  });
}

/**
 * Retrieves a single competency by ID for a tenant with its levels, canonical metadata, and usage counts.
 */
export async function getTenantCompetencyById(
  tenantId: string,
  id: string
): Promise<CompetencyWithLevels | null> {
  if (!tenantId || !id) return null;

  const competency = await prisma.competency.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      levels: {
        orderBy: {
          level: 'asc',
        },
      },
      frameworkCompetency: {
        select: {
          name: true,
          category: {
            select: {
              frameworkVersion: {
                select: {
                  version: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          roleRequirements: true,
          campaignCompetencies: true,
          assessmentItems: true,
        },
      },
    },
  });

  if (!competency) return null;

  return {
    ...competency,
    usageCount: competency._count,
  };
}

/**
 * Creates a custom organization competency with dynamic level descriptors.
 */
export async function createCustomCompetency(
  tenantId: string,
  input: CreateCustomCompetencyInput,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<CompetencyWithLevels> {
  if (!tenantId) {
    throw new Error('Tenant ID is required.');
  }

  const levelNumbers = input.levels.map((l) => l.level);
  const uniqueLevels = new Set(levelNumbers);
  if (uniqueLevels.size !== levelNumbers.length) {
    throw new Error('Level numbers must be unique within the competency.');
  }

  return prisma.$transaction(async (tx) => {
    const comp = await tx.competency.create({
      data: {
        tenantId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        frameworkCompetencyId: null,
        isCustom: true,
        isActive: true,
      },
    });

    for (const lvl of input.levels) {
      await tx.competencyLevel.create({
        data: {
          competencyId: comp.id,
          level: lvl.level,
          description: lvl.description.trim(),
          evidencePrompt: lvl.evidencePrompt?.trim() || null,
        },
      });
    }

    await logAuditEvent({
      tx,
      action: AuditAction.COMPETENCY_CREATE,
      entityType: 'Competency',
      entityId: comp.id,
      tenantId,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: comp.name,
        type: comp.type,
        levelsCount: input.levels.length,
      },
    });

    const created = await tx.competency.findUniqueOrThrow({
      where: { id: comp.id },
      include: {
        levels: {
          orderBy: { level: 'asc' },
        },
      },
    });

    return created;
  });
}

/**
 * Updates a custom organization competency.
 * Reject structural edits if canonical or if already referenced in role profiles or assessments.
 */
export async function updateCustomCompetency(
  tenantId: string,
  id: string,
  input: UpdateCustomCompetencyInput,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<CompetencyWithLevels> {
  const comp = await prisma.competency.findFirst({
    where: { id, tenantId },
    include: {
      _count: {
        select: {
          roleRequirements: true,
          campaignCompetencies: true,
          assessmentItems: true,
        },
      },
    },
  });

  if (!comp) {
    throw new Error('Competency not found.');
  }

  if (!comp.isCustom) {
    throw new Error('Canonical-derived competencies cannot be structurally modified. You may only activate or deactivate them.');
  }

  const isUsed =
    comp._count.roleRequirements > 0 ||
    comp._count.campaignCompetencies > 0 ||
    comp._count.assessmentItems > 0;

  if (isUsed) {
    throw new Error(
      'This custom competency is already referenced by role profiles or assessments and cannot be structurally modified. Deactivate it instead.'
    );
  }

  return prisma.$transaction(async (tx) => {
    // Delete existing levels and replace with new levels
    await tx.competencyLevel.deleteMany({
      where: { competencyId: id },
    });

    const updated = await tx.competency.update({
      where: { id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        type: input.type,
      },
    });

    for (const lvl of input.levels) {
      await tx.competencyLevel.create({
        data: {
          competencyId: updated.id,
          level: lvl.level,
          description: lvl.description.trim(),
          evidencePrompt: lvl.evidencePrompt?.trim() || null,
        },
      });
    }

    await logAuditEvent({
      tx,
      action: AuditAction.COMPETENCY_UPDATE,
      entityType: 'Competency',
      entityId: updated.id,
      tenantId,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
        type: updated.type,
        levelsCount: input.levels.length,
      },
    });

    return tx.competency.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        levels: {
          orderBy: { level: 'asc' },
        },
      },
    });
  });
}

/**
 * Toggles the active status of any tenant competency (canonical or custom).
 */
export async function toggleCompetencyActive(
  tenantId: string,
  id: string,
  isActive: boolean,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<Competency> {
  const comp = await prisma.competency.findFirst({
    where: { id, tenantId },
  });

  if (!comp) {
    throw new Error('Competency not found.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.competency.update({
      where: { id },
      data: { isActive },
    });

    await logAuditEvent({
      tx,
      action: isActive ? AuditAction.COMPETENCY_ACTIVATE : AuditAction.COMPETENCY_DEACTIVATE,
      entityType: 'Competency',
      entityId: updated.id,
      tenantId,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
        isActive,
      },
    });

    return updated;
  });
}

/**
 * Deletes an unused custom competency.
 */
export async function deleteUnusedCustomCompetency(
  tenantId: string,
  id: string
): Promise<Competency> {
  const comp = await prisma.competency.findFirst({
    where: { id, tenantId },
    include: {
      _count: {
        select: {
          roleRequirements: true,
          campaignCompetencies: true,
          assessmentItems: true,
        },
      },
    },
  });

  if (!comp) {
    throw new Error('Competency not found.');
  }

  if (!comp.isCustom) {
    throw new Error('Canonical-derived competencies cannot be deleted. Deactivate them instead.');
  }

  const isUsed =
    comp._count.roleRequirements > 0 ||
    comp._count.campaignCompetencies > 0 ||
    comp._count.assessmentItems > 0;

  if (isUsed) {
    throw new Error(
      'This custom competency is already referenced by role profiles or assessments and cannot be deleted. Deactivate it instead.'
    );
  }

  return prisma.competency.delete({
    where: { id },
  });
}
