import { prisma } from '@/lib/db';
import {
  AuditAction,
  CompetencyType,
  LearningResource,
  LearningResourceType,
  Prisma,
} from '@prisma/client';
import { logAuditEvent, AuditActorContext } from './audit';
import {
  CreateLearningResourceInput,
  UpdateLearningResourceInput,
  createLearningResourceSchema,
  updateLearningResourceSchema,
} from '@/lib/validation/learning-resources';
import { getStaffPersonalGapAnalysis } from './skills-profile';

export interface LearningResourceWithMappings extends LearningResource {
  mappings: Array<{
    id: string;
    competencyId: string;
    targetLevel: number | null;
    competency: {
      id: string;
      name: string;
      type: CompetencyType;
    };
  }>;
}

export interface StaffCompetencyRecommendation {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  status: 'BELOW_TARGET' | 'NOT_ASSESSED';
  currentVerifiedLevel: number | null;
  targetLevel: number;
  gap: number | null;
  rationale: string;
  resources: Array<{
    id: string;
    title: string;
    description: string | null;
    url: string;
    provider: string | null;
    resourceType: LearningResourceType;
    targetLevel: number | null;
  }>;
}

export interface StaffLearningRecommendationsResult {
  hasRoleProfile: boolean;
  roleProfileName: string | null;
  hasGaps: boolean;
  message?: string;
  recommendations: StaffCompetencyRecommendation[];
}

/**
 * Lists all learning resources for a tenant with optional filtering.
 */
export async function getLearningResourcesForTenant(
  tenantId: string,
  options?: {
    search?: string;
    resourceType?: LearningResourceType;
    isActive?: boolean;
    competencyId?: string;
  }
): Promise<LearningResourceWithMappings[]> {
  if (!tenantId) return [];

  const whereClause: Prisma.LearningResourceWhereInput = {
    tenantId,
  };

  if (options?.isActive !== undefined) {
    whereClause.isActive = options.isActive;
  }

  if (options?.resourceType) {
    whereClause.resourceType = options.resourceType;
  }

  if (options?.search) {
    const term = options.search.trim();
    whereClause.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { provider: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (options?.competencyId) {
    whereClause.mappings = {
      some: {
        competencyId: options.competencyId,
      },
    };
  }

  const resources = await prisma.learningResource.findMany({
    where: whereClause,
    include: {
      mappings: {
        include: {
          competency: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: [
          { competency: { name: 'asc' } },
          { targetLevel: 'asc' },
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return resources as LearningResourceWithMappings[];
}

/**
 * Retrieves a single learning resource by ID for a tenant.
 */
export async function getLearningResourceById(
  tenantId: string,
  id: string
): Promise<LearningResourceWithMappings | null> {
  if (!tenantId || !id) return null;

  const resource = await prisma.learningResource.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      mappings: {
        include: {
          competency: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: [
          { competency: { name: 'asc' } },
          { targetLevel: 'asc' },
        ],
      },
    },
  });

  return resource as LearningResourceWithMappings | null;
}

/**
 * Validates that all mapped competencies belong to the authenticated tenant
 * and that any specified target levels exist on those competencies.
 */
async function validateMappingsForTenant(
  tenantId: string,
  mappings: Array<{ competencyId: string; targetLevel?: number | null }>
): Promise<void> {
  if (!mappings || mappings.length === 0) return;

  const compIds = Array.from(new Set(mappings.map((m) => m.competencyId)));

  const tenantComps = await prisma.competency.findMany({
    where: {
      id: { in: compIds },
      tenantId,
    },
    include: {
      levels: true,
    },
  });

  if (tenantComps.length !== compIds.length) {
    throw new Error('One or more mapped competencies do not belong to your organization');
  }

  const compMap = new Map(tenantComps.map((c) => [c.id, c]));

  for (const m of mappings) {
    const comp = compMap.get(m.competencyId);
    if (!comp) {
      throw new Error(`Competency with ID ${m.competencyId} was not found`);
    }

    if (m.targetLevel !== undefined && m.targetLevel !== null) {
      const levelExists = comp.levels.some((l) => l.level === m.targetLevel);
      if (!levelExists) {
        throw new Error(
          `Target level ${m.targetLevel} does not exist for competency "${comp.name}"`
        );
      }
    }
  }
}

/**
 * Creates a new learning resource with competency mappings.
 */
export async function createLearningResource(
  tenantId: string,
  input: CreateLearningResourceInput,
  actor?: AuditActorContext
): Promise<LearningResourceWithMappings> {
  const validated = createLearningResourceSchema.parse(input);

  // Validate tenant ownership and level existence
  await validateMappingsForTenant(tenantId, validated.mappings);

  const resource = await prisma.$transaction(async (tx) => {
    const created = await tx.learningResource.create({
      data: {
        tenantId,
        title: validated.title,
        description: validated.description || null,
        url: validated.url,
        provider: validated.provider || null,
        resourceType: validated.resourceType,
        isActive: validated.isActive,
      },
    });

    if (validated.mappings && validated.mappings.length > 0) {
      // Deduplicate mappings by competencyId + targetLevel
      const seen = new Set<string>();
      const validMappings = [];
      for (const m of validated.mappings) {
        const key = `${m.competencyId}_${m.targetLevel ?? 'null'}`;
        if (!seen.has(key)) {
          seen.add(key);
          validMappings.push({
            learningResourceId: created.id,
            competencyId: m.competencyId,
            targetLevel: m.targetLevel ?? null,
          });
        }
      }

      await tx.competencyLearningResource.createMany({
        data: validMappings,
      });
    }

    return tx.learningResource.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        mappings: {
          include: {
            competency: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });
  });

  await logAuditEvent({
    tenantId,
    actorId: actor?.actorId || null,
    actorRole: actor?.actorRole || null,
    action: AuditAction.LEARNING_RESOURCE_CREATE,
    resourceType: 'LearningResource',
    resourceId: resource.id,
    details: {
      title: resource.title,
      resourceType: resource.resourceType,
      provider: resource.provider,
      mappingsCount: resource.mappings.length,
    },
    ipAddress: actor?.ipAddress || null,
    userAgent: actor?.userAgent || null,
  });

  return resource as LearningResourceWithMappings;
}

/**
 * Updates an existing learning resource and synchronizes its mappings.
 */
export async function updateLearningResource(
  tenantId: string,
  id: string,
  input: UpdateLearningResourceInput,
  actor?: AuditActorContext
): Promise<LearningResourceWithMappings> {
  const existing = await prisma.learningResource.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Learning resource not found or access denied');
  }

  const validated = updateLearningResourceSchema.parse(input);

  await validateMappingsForTenant(tenantId, validated.mappings);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.learningResource.update({
      where: { id },
      data: {
        title: validated.title,
        description: validated.description || null,
        url: validated.url,
        provider: validated.provider || null,
        resourceType: validated.resourceType,
        isActive: validated.isActive,
      },
    });

    // Replace mappings
    await tx.competencyLearningResource.deleteMany({
      where: { learningResourceId: id },
    });

    if (validated.mappings && validated.mappings.length > 0) {
      const seen = new Set<string>();
      const validMappings = [];
      for (const m of validated.mappings) {
        const key = `${m.competencyId}_${m.targetLevel ?? 'null'}`;
        if (!seen.has(key)) {
          seen.add(key);
          validMappings.push({
            learningResourceId: id,
            competencyId: m.competencyId,
            targetLevel: m.targetLevel ?? null,
          });
        }
      }

      await tx.competencyLearningResource.createMany({
        data: validMappings,
      });
    }

    return tx.learningResource.findUniqueOrThrow({
      where: { id },
      include: {
        mappings: {
          include: {
            competency: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });
  });

  await logAuditEvent({
    tenantId,
    actorId: actor?.actorId || null,
    actorRole: actor?.actorRole || null,
    action: AuditAction.LEARNING_RESOURCE_UPDATE,
    resourceType: 'LearningResource',
    resourceId: updated.id,
    details: {
      title: updated.title,
      resourceType: updated.resourceType,
      isActive: updated.isActive,
      mappingsCount: updated.mappings.length,
    },
    ipAddress: actor?.ipAddress || null,
    userAgent: actor?.userAgent || null,
  });

  return updated as LearningResourceWithMappings;
}

/**
 * Toggles the active status of a learning resource.
 */
export async function toggleLearningResourceActive(
  tenantId: string,
  id: string,
  actor?: AuditActorContext
): Promise<LearningResource> {
  const existing = await prisma.learningResource.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Learning resource not found or access denied');
  }

  const newStatus = !existing.isActive;

  const updated = await prisma.learningResource.update({
    where: { id },
    data: { isActive: newStatus },
  });

  await logAuditEvent({
    tenantId,
    actorId: actor?.actorId || null,
    actorRole: actor?.actorRole || null,
    action: newStatus
      ? AuditAction.LEARNING_RESOURCE_ACTIVATE
      : AuditAction.LEARNING_RESOURCE_DEACTIVATE,
    resourceType: 'LearningResource',
    resourceId: updated.id,
    details: {
      title: updated.title,
      isActive: newStatus,
    },
    ipAddress: actor?.ipAddress || null,
    userAgent: actor?.userAgent || null,
  });

  return updated;
}

/**
 * Deletes a learning resource. Cascades to mappings safely without touching assessments.
 */
export async function deleteLearningResource(
  tenantId: string,
  id: string,
  actor?: AuditActorContext
): Promise<void> {
  const existing = await prisma.learningResource.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Learning resource not found or access denied');
  }

  await prisma.learningResource.delete({
    where: { id },
  });

  await logAuditEvent({
    tenantId,
    actorId: actor?.actorId || null,
    actorRole: actor?.actorRole || null,
    action: AuditAction.LEARNING_RESOURCE_UPDATE,
    resourceType: 'LearningResource',
    resourceId: id,
    details: {
      deleted: true,
      title: existing.title,
    },
    ipAddress: actor?.ipAddress || null,
    userAgent: actor?.userAgent || null,
  });
}

/**
 * Generates personalized learning recommendations for a staff member based on their
 * verified capability gaps (OA-12 & SM-05).
 *
 * Recommendation Rules:
 * 1. For BELOW_TARGET requirements (verifiedLevel < targetLevel):
 *    Recommend active resources mapped to this competency where:
 *      targetLevel is null (general/unrestricted) OR
 *      targetLevel > currentVerifiedLevel AND targetLevel <= roleTargetLevel.
 *    (Material already achieved, i.e. targetLevel <= currentVerifiedLevel, is excluded).
 * 2. For NOT_ASSESSED requirements (no verified rating yet):
 *    Recommend active resources mapped to this competency where:
 *      targetLevel is null OR targetLevel <= roleTargetLevel.
 * 3. Requirements with MEETS_TARGET or EXCEEDS_TARGET produce zero recommendations.
 * 4. Deactivating or deleting a resource stops recommendations without modifying assessment data.
 */
export async function getStaffLearningRecommendations(
  userId: string,
  tenantId: string
): Promise<StaffLearningRecommendationsResult> {
  if (!userId || !tenantId) {
    return {
      hasRoleProfile: false,
      roleProfileName: null,
      hasGaps: false,
      message: 'Invalid user or organization',
      recommendations: [],
    };
  }

  const gapAnalysis = await getStaffPersonalGapAnalysis(userId, tenantId);

  if (!gapAnalysis || !gapAnalysis.hasRoleProfile || !gapAnalysis.roleProfile) {
    return {
      hasRoleProfile: false,
      roleProfileName: null,
      hasGaps: false,
      message: 'No role profile is currently assigned to your account.',
      recommendations: [],
    };
  }

  const gapRequirements = gapAnalysis.requirements.filter(
    (r) => r.status === 'BELOW_TARGET' || r.status === 'NOT_ASSESSED'
  );

  if (gapRequirements.length === 0) {
    return {
      hasRoleProfile: true,
      roleProfileName: gapAnalysis.roleProfile.name,
      hasGaps: false,
      message:
        'No learning recommendations are currently needed based on your verified role requirements.',
      recommendations: [],
    };
  }

  // Fetch all active mapped learning resources for this tenant
  const targetCompIds = gapRequirements.map((r) => r.competencyId);
  const activeResources = await prisma.learningResource.findMany({
    where: {
      tenantId,
      isActive: true,
      mappings: {
        some: {
          competencyId: { in: targetCompIds },
        },
      },
    },
    include: {
      mappings: {
        where: {
          competencyId: { in: targetCompIds },
        },
      },
    },
  });

  const recommendations: StaffCompetencyRecommendation[] = [];

  for (const req of gapRequirements) {
    const verifiedLevel = req.currentLevel; // number or null
    const targetLevel = req.targetLevel;

    // Filter resources matching the level criteria for this competency
    const matchingResources = activeResources
      .filter((res) => {
        const mapping = res.mappings.find((m) => m.competencyId === req.competencyId);
        if (!mapping) return false;

        const mapLevel = mapping.targetLevel; // null or number

        if (req.status === 'BELOW_TARGET') {
          // Must be general or between (verifiedLevel + 1) and targetLevel
          if (mapLevel === null) return true;
          return verifiedLevel !== null && mapLevel > verifiedLevel && mapLevel <= targetLevel;
        } else {
          // NOT_ASSESSED: general or entry through targetLevel
          if (mapLevel === null) return true;
          return mapLevel <= targetLevel;
        }
      })
      .map((res) => {
        const mapping = res.mappings.find((m) => m.competencyId === req.competencyId);
        return {
          id: res.id,
          title: res.title,
          description: res.description,
          url: res.url,
          provider: res.provider,
          resourceType: res.resourceType,
          targetLevel: mapping?.targetLevel ?? null,
        };
      });

    let rationale = '';
    if (matchingResources.length > 0) {
      if (req.status === 'BELOW_TARGET') {
        rationale = `Supports progression from Level ${verifiedLevel} toward Level ${targetLevel}.`;
      } else {
        rationale = `Supports foundation and progression toward Level ${targetLevel}.`;
      }
    } else {
      rationale = 'No learning resource has been mapped for this gap yet.';
    }

    recommendations.push({
      competencyId: req.competencyId,
      competencyName: req.competencyName,
      competencyType: req.competencyType,
      status: req.status as 'BELOW_TARGET' | 'NOT_ASSESSED',
      currentVerifiedLevel: verifiedLevel,
      targetLevel,
      gap: req.gap,
      rationale,
      resources: matchingResources,
    });
  }

  return {
    hasRoleProfile: true,
    roleProfileName: gapAnalysis.roleProfile.name,
    hasGaps: true,
    recommendations,
  };
}
