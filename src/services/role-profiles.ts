import { prisma } from '@/lib/db';
import { CreateRoleProfileInput, UpdateRoleProfileInput } from '@/lib/validation';
import {
  RoleProfile,
  RoleRequirement,
  Competency,
  CompetencyLevel,
  RoleProfileStatus,
  CompetencyType,
  AuditAction,
} from '@prisma/client';
import { getActiveFrameworkAdoptionForTenant } from './framework-adoption';
import { logAuditEvent } from './audit';

export type RoleProfileListItem = RoleProfile & {
  _count: {
    requirements: number;
    users: number;
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

export type RoleProfileWithRequirements = RoleProfileDetail;

export interface RoleProfilesFilterOptions {
  includeArchived?: boolean;
  status?: RoleProfileStatus;
  onlyArchived?: boolean;
}

/**
 * Retrieves role profiles for an organization, ordered by newest first.
 * Strictly scoped by tenantId with optional filtering for archive/publication status.
 */
export async function getRoleProfilesForTenant(
  tenantId: string,
  options?: RoleProfilesFilterOptions
): Promise<RoleProfileListItem[]> {
  if (!tenantId) {
    return [];
  }

  const whereClause: Record<string, unknown> = { tenantId };

  if (options?.onlyArchived) {
    whereClause.isArchived = true;
  } else if (!options?.includeArchived) {
    whereClause.isArchived = false;
  }

  if (options?.status) {
    whereClause.status = options.status;
  }

  return prisma.roleProfile.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          requirements: true,
          users: true,
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

export interface AvailableTemplateRole {
  id: string;
  name: string;
  description: string | null;
  industryTemplateId: string;
  industryTemplateName: string;
  templateName: string;
  frameworkVersion: string;
  requirementsCount: number;
  totalRequirementsCount: number;
  mappedRequirementsCount: number;
  isUsable: boolean;
  unusableReason?: string;
  mappedRequirements: Array<{
    templateRequirementId: string;
    frameworkCompetencyId: string;
    targetLevel: number;
    tenantCompetencyId: string | null;
    tenantCompetencyName: string | null;
    tenantCompetencyType: CompetencyType | null;
    isTenantCompetencyActive: boolean;
    hasValidTargetLevel: boolean;
  }>;
  requirements: Array<{
    competencyId: string;
    competencyName: string;
    targetLevel: number;
  }>;
}

/**
 * Discovers active Industry Template roles compatible with the tenant's adopted framework version.
 * Verifies mapping strictly through frameworkCompetencyId.
 */
export async function getAvailableTemplateRolesForTenant(
  tenantId: string
): Promise<AvailableTemplateRole[]> {
  if (!tenantId) return [];

  // 1. Identify active tenant framework adoption
  const activeAdoption = await getActiveFrameworkAdoptionForTenant(tenantId);
  if (!activeAdoption) return [];

  const frameworkVersionId = activeAdoption.frameworkVersionId;

  // 2. Load active industry templates matching framework version
  const templates = await prisma.industryTemplate.findMany({
    where: {
      frameworkVersionId,
      isActive: true,
    },
    include: {
      frameworkVersion: { select: { version: true } },
      roleProfiles: {
        include: {
          requirements: {
            include: {
              frameworkCompetency: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // 3. Load tenant operational competencies for mapping
  const tenantCompetencies = await prisma.competency.findMany({
    where: {
      tenantId,
      frameworkCompetencyId: { not: null },
    },
    include: {
      levels: {
        select: { level: true },
      },
    },
  });

  const tenantCompByFrameworkCompId = new Map(
    tenantCompetencies.map((c) => [c.frameworkCompetencyId!, c])
  );

  const results: AvailableTemplateRole[] = [];

  for (const template of templates) {
    for (const role of template.roleProfiles) {
      let isUsable = true;
      let unusableReason: string | undefined;

      const mappedRequirements = role.requirements.map((req) => {
        const tenantComp = tenantCompByFrameworkCompId.get(req.frameworkCompetencyId);

        if (!tenantComp) {
          isUsable = false;
          if (!unusableReason) {
            unusableReason = `Competency "${req.frameworkCompetency.name}" is missing from organization library.`;
          }
          return {
            templateRequirementId: req.id,
            frameworkCompetencyId: req.frameworkCompetencyId,
            targetLevel: req.targetLevel,
            tenantCompetencyId: null,
            tenantCompetencyName: req.frameworkCompetency.name,
            tenantCompetencyType: null,
            isTenantCompetencyActive: false,
            hasValidTargetLevel: false,
          };
        }

        const isTenantCompetencyActive = tenantComp.isActive;
        if (!isTenantCompetencyActive) {
          isUsable = false;
          if (!unusableReason) {
            unusableReason = `Competency "${tenantComp.name}" is deactivated in organization library.`;
          }
        }

        const hasValidTargetLevel = tenantComp.levels.some((l) => l.level === req.targetLevel);
        if (!hasValidTargetLevel) {
          isUsable = false;
          if (!unusableReason) {
            unusableReason = `Target level ${req.targetLevel} is not defined for competency "${tenantComp.name}".`;
          }
        }

        return {
          templateRequirementId: req.id,
          frameworkCompetencyId: req.frameworkCompetencyId,
          targetLevel: req.targetLevel,
          tenantCompetencyId: tenantComp.id,
          tenantCompetencyName: tenantComp.name,
          tenantCompetencyType: tenantComp.type,
          isTenantCompetencyActive,
          hasValidTargetLevel,
        };
      });

      const validRequirements = mappedRequirements
        .filter((r) => r.tenantCompetencyId && r.isTenantCompetencyActive && r.hasValidTargetLevel)
        .map((r) => ({
          competencyId: r.tenantCompetencyId!,
          competencyName: r.tenantCompetencyName || '',
          targetLevel: r.targetLevel,
        }));

      results.push({
        id: role.id,
        name: role.name,
        description: role.description,
        industryTemplateId: template.id,
        industryTemplateName: template.name,
        templateName: template.name,
        frameworkVersion: template.frameworkVersion.version,
        requirementsCount: role.requirements.length,
        totalRequirementsCount: role.requirements.length,
        mappedRequirementsCount: validRequirements.length,
        isUsable,
        unusableReason,
        mappedRequirements,
        requirements: validRequirements,
      });
    }
  }

  return results;
}

export interface PrefilledRoleProfileData {
  name: string;
  description: string | null;
  templateRoleProfileId: string;
  industryTemplateName: string;
  requirements: Array<{
    competencyId: string;
    targetLevel: number;
    competencyName: string;
    competencyType: CompetencyType;
  }>;
}

/**
 * Pre-fills role profile data from an Industry Template role.
 * Enforces strict framework compatibility and active tenant competency mapping.
 */
export async function prefillRoleProfileFromTemplate(
  tenantId: string,
  templateRoleProfileId: string
): Promise<PrefilledRoleProfileData> {
  if (!tenantId || !templateRoleProfileId) {
    throw new Error('Tenant ID and Template Role Profile ID are required.');
  }

  const activeAdoption = await getActiveFrameworkAdoptionForTenant(tenantId);
  if (!activeAdoption) {
    throw new Error('No active framework adoption found for your organization.');
  }

  const templateRole = await prisma.templateRoleProfile.findUnique({
    where: { id: templateRoleProfileId },
    include: {
      industryTemplate: {
        select: { id: true, name: true, frameworkVersionId: true },
      },
      requirements: {
        include: {
          frameworkCompetency: true,
        },
      },
    },
  });

  if (!templateRole) {
    throw new Error('Template role profile not found.');
  }

  // Enforce framework version compatibility
  if (templateRole.industryTemplate.frameworkVersionId !== activeAdoption.frameworkVersionId) {
    throw new Error(
      `This template belongs to an incompatible framework version and cannot be used with your organization's active framework.`
    );
  }

  // Load tenant competencies corresponding to template requirements
  const frameworkCompIds = templateRole.requirements.map((r) => r.frameworkCompetencyId);

  const tenantCompetencies = await prisma.competency.findMany({
    where: {
      tenantId,
      frameworkCompetencyId: { in: frameworkCompIds },
    },
    include: {
      levels: true,
    },
  });

  const tenantCompMap = new Map(
    tenantCompetencies.map((c) => [c.frameworkCompetencyId!, c])
  );

  const mappedRequirements: Array<{
    competencyId: string;
    targetLevel: number;
    competencyName: string;
    competencyType: CompetencyType;
  }> = [];

  for (const req of templateRole.requirements) {
    const tenantComp = tenantCompMap.get(req.frameworkCompetencyId);

    if (!tenantComp) {
      throw new Error(
        `Template competency "${req.frameworkCompetency.name}" is missing from your organization's skills library.`
      );
    }

    if (!tenantComp.isActive) {
      throw new Error(
        `Competency "${tenantComp.name}" is currently deactivated in your organization library. Enable it to use this template.`
      );
    }

    const levelExists = tenantComp.levels.some((l) => l.level === req.targetLevel);
    if (!levelExists) {
      throw new Error(
        `Target level ${req.targetLevel} is not valid for competency "${tenantComp.name}".`
      );
    }

    mappedRequirements.push({
      competencyId: tenantComp.id,
      targetLevel: req.targetLevel,
      competencyName: tenantComp.name,
      competencyType: tenantComp.type,
    });
  }

  return {
    name: templateRole.name,
    description: templateRole.description,
    templateRoleProfileId: templateRole.id,
    industryTemplateName: templateRole.industryTemplate.name,
    requirements: mappedRequirements,
  };
}

/**
 * Validates submitted competency requirements for a tenant.
 */
async function validateRoleRequirements(
  tenantId: string,
  requirements: Array<{ competencyId: string; targetLevel: number }>
): Promise<Array<{ competencyId: string; targetLevel: number }>> {
  const uniqueMap = new Map<string, number>();
  for (const req of requirements) {
    uniqueMap.set(req.competencyId, req.targetLevel);
  }

  const entries = Array.from(uniqueMap.entries()).map(([competencyId, targetLevel]) => ({
    competencyId,
    targetLevel,
  }));

  if (entries.length === 0) {
    return [];
  }

  const compIds = entries.map((e) => e.competencyId);

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
    throw new Error('One or more selected competencies do not belong to your organization.');
  }

  const compMap = new Map(tenantComps.map((c) => [c.id, c]));

  for (const entry of entries) {
    const comp = compMap.get(entry.competencyId)!;

    if (!comp.isActive) {
      throw new Error(`Competency "${comp.name}" is deactivated in your skills library.`);
    }

    const hasLevel = comp.levels.some((l) => l.level === entry.targetLevel);
    if (!hasLevel) {
      throw new Error(
        `Target level ${entry.targetLevel} is not valid for competency "${comp.name}".`
      );
    }
  }

  return entries;
}

/**
 * Creates a new role profile and its requirements atomically.
 */
export async function createRoleProfile(
  tenantId: string,
  input: CreateRoleProfileInput,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<RoleProfile & { requirements: RoleRequirement[] }> {
  if (!tenantId) {
    throw new Error('Tenant ID is required to create a role profile.');
  }

  if (input.status === RoleProfileStatus.PUBLISHED && input.requirements.length === 0) {
    throw new Error('Publishing a role profile requires at least one competency requirement.');
  }

  const validatedEntries = await validateRoleRequirements(tenantId, input.requirements);

  return prisma.$transaction(async (tx) => {
    const created = await tx.roleProfile.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description || null,
        status: input.status,
        requirements: {
          create: validatedEntries.map((r) => ({
            competencyId: r.competencyId,
            targetLevel: r.targetLevel,
          })),
        },
      },
      include: {
        requirements: true,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.ROLE_PROFILE_CREATE,
      entityType: 'RoleProfile',
      entityId: created.id,
      tenantId,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: created.name,
        status: created.status,
        requirementsCount: created.requirements.length,
      },
    });

    if (created.status === RoleProfileStatus.PUBLISHED) {
      await logAuditEvent({
        tx,
        action: AuditAction.ROLE_PROFILE_PUBLISH,
        entityType: 'RoleProfile',
        entityId: created.id,
        tenantId,
        actorId: actorContext?.actorId,
        ipAddress: actorContext?.ipAddress,
        userAgent: actorContext?.userAgent,
        details: {
          name: created.name,
          requirementsCount: created.requirements.length,
        },
      });
    }

    return created;
  });
}

/**
 * Updates an existing DRAFT role profile atomically.
 * Published roles are structurally immutable and will be rejected.
 */
export async function updateRoleProfile(
  tenantId: string,
  roleProfileId: string,
  input: UpdateRoleProfileInput,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<RoleProfile & { requirements: RoleRequirement[] }> {
  if (!tenantId || !roleProfileId) {
    throw new Error('Tenant ID and Role Profile ID are required.');
  }

  const role = await prisma.roleProfile.findFirst({
    where: { id: roleProfileId, tenantId },
    include: { requirements: true },
  });

  if (!role) {
    throw new Error('Role profile not found.');
  }

  // Structural Immutability Guard: Published roles cannot be modified
  if (role.status === RoleProfileStatus.PUBLISHED) {
    throw new Error(
      'Published role profiles cannot be modified. They are immutable benchmarks used by active campaigns and assessments.'
    );
  }

  // Archived roles cannot be modified
  if (role.isArchived) {
    throw new Error('Archived role profiles cannot be modified. Unarchive the role profile first.');
  }

  if (input.status === RoleProfileStatus.PUBLISHED && input.requirements && input.requirements.length === 0) {
    throw new Error('Publishing a role profile requires at least one competency requirement.');
  }

  const validatedEntries = input.requirements
    ? await validateRoleRequirements(tenantId, input.requirements)
    : null;

  return prisma.$transaction(async (tx) => {
    if (validatedEntries !== null) {
      await tx.roleRequirement.deleteMany({
        where: { roleProfileId },
      });

      if (validatedEntries.length > 0) {
        await tx.roleRequirement.createMany({
          data: validatedEntries.map((r) => ({
            roleProfileId,
            competencyId: r.competencyId,
            targetLevel: r.targetLevel,
          })),
        });
      }
    }

    const updated = await tx.roleProfile.update({
      where: { id: roleProfileId },
      data: {
        name: input.name !== undefined ? input.name : undefined,
        description: input.description !== undefined ? input.description || null : undefined,
        status: input.status !== undefined ? input.status : undefined,
      },
      include: {
        requirements: true,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.ROLE_PROFILE_UPDATE,
      entityType: 'RoleProfile',
      entityId: updated.id,
      tenantId,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
        changes: input,
      },
    });

    if (role.status !== RoleProfileStatus.PUBLISHED && updated.status === RoleProfileStatus.PUBLISHED) {
      await logAuditEvent({
        tx,
        action: AuditAction.ROLE_PROFILE_PUBLISH,
        entityType: 'RoleProfile',
        entityId: updated.id,
        tenantId,
        actorId: actorContext?.actorId,
        ipAddress: actorContext?.ipAddress,
        userAgent: actorContext?.userAgent,
        details: {
          name: updated.name,
          requirementsCount: updated.requirements.length,
        },
      });
    }

    return updated;
  });
}

/**
 * Publishes an existing DRAFT role profile.
 */
export async function publishRoleProfile(
  tenantId: string,
  roleProfileId: string,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<RoleProfile> {
  if (!tenantId || !roleProfileId) {
    throw new Error('Tenant ID and Role Profile ID are required.');
  }

  const role = await prisma.roleProfile.findFirst({
    where: { id: roleProfileId, tenantId },
    include: { requirements: true },
  });

  if (!role) {
    throw new Error('Role profile not found or does not belong to your organization.');
  }

  if (role.isArchived) {
    throw new Error('Archived role profiles cannot be published.');
  }

  if (role.status === RoleProfileStatus.PUBLISHED) {
    return role;
  }

  if (role.requirements.length === 0) {
    throw new Error('Publishing a role profile requires at least one competency requirement.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.roleProfile.update({
      where: { id: roleProfileId },
      data: {
        status: RoleProfileStatus.PUBLISHED,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.ROLE_PROFILE_PUBLISH,
      entityType: 'RoleProfile',
      entityId: updated.id,
      tenantId,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
        requirementsCount: role.requirements.length,
      },
    });

    return updated;
  });
}

/**
 * Archives a role profile safely (OA-05).
 * Preserves all existing references and historical analytics.
 */
export async function archiveRoleProfile(
  tenantId: string,
  roleProfileId: string,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<RoleProfile> {
  if (!tenantId || !roleProfileId) {
    throw new Error('Tenant ID and Role Profile ID are required.');
  }

  const role = await prisma.roleProfile.findFirst({
    where: { id: roleProfileId, tenantId },
  });

  if (!role) {
    throw new Error('Role profile not found or does not belong to your organization.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.roleProfile.update({
      where: { id: roleProfileId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.ROLE_PROFILE_ARCHIVE,
      entityType: 'RoleProfile',
      entityId: updated.id,
      tenantId,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
      },
    });

    return updated;
  });
}

/**
 * Unarchives a previously archived role profile.
 */
export async function unarchiveRoleProfile(
  tenantId: string,
  roleProfileId: string,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<RoleProfile> {
  if (!tenantId || !roleProfileId) {
    throw new Error('Tenant ID and Role Profile ID are required.');
  }

  const role = await prisma.roleProfile.findFirst({
    where: { id: roleProfileId, tenantId },
  });

  if (!role) {
    throw new Error('Role profile not found or does not belong to your organization.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.roleProfile.update({
      where: { id: roleProfileId },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.ROLE_PROFILE_UNARCHIVE,
      entityType: 'RoleProfile',
      entityId: updated.id,
      tenantId,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
      },
    });

    return updated;
  });
}
