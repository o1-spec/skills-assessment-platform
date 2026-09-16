import { prisma } from '@/lib/db';
import {
  CareerPath,
  CareerPathStep,
  CareerPathStatus,
  RoleProfile,
  RoleRequirement,
  Competency,
  CompetencyType,
  AuditAction,
  UserRole,
} from '@prisma/client';
import { CreateCareerPathInput, UpdateCareerPathInput, createCareerPathSchema, updateCareerPathSchema } from '@/lib/validation';
import { logAuditEvent, AuditActorContext } from './audit';
import { getLatestVerifiedRatingsForUsers, VerifiedCompetencyRating } from './skills-profile';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export type CompetencyDeltaType =
  | 'NEW_REQUIREMENT'
  | 'LEVEL_INCREASE'
  | 'UNCHANGED'
  | 'LOWER_TARGET'
  | 'NO_LONGER_REQUIRED';

export interface CompetencyTransitionDelta {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  sourceTargetLevel: number | null;
  targetTargetLevel: number | null;
  deltaType: CompetencyDeltaType;
}

export interface CareerPathTransition {
  sourceRole: Pick<RoleProfile, 'id' | 'name' | 'description' | 'status' | 'isArchived'>;
  targetRole: Pick<RoleProfile, 'id' | 'name' | 'description' | 'status' | 'isArchived'>;
  newSkillsCount: number;
  levelIncreasesCount: number;
  technicalDeltasCount: number;
  behavioralDeltasCount: number;
  deltas: CompetencyTransitionDelta[];
}

export type CareerPathStepWithRole = CareerPathStep & {
  roleProfile: RoleProfile & {
    requirements: Array<
      RoleRequirement & {
        competency: Competency;
      }
    >;
  };
};

export type CareerPathWithSteps = CareerPath & {
  steps: CareerPathStep[];
};

export type CareerPathDetail = CareerPath & {
  steps: CareerPathStepWithRole[];
  transitions: CareerPathTransition[];
};

export type CareerPathListItem = CareerPath & {
  _count: {
    steps: number;
  };
  steps: Array<{
    id: string;
    orderIndex: number;
    roleProfile: {
      id: string;
      name: string;
      isArchived: boolean;
    };
  }>;
};

export type StaffCareerProgressionStatus =
  | 'NOT_ASSESSED'
  | 'MEETS_TARGET'
  | 'DEVELOPMENT_NEEDED'
  | 'EXCEEDS_TARGET';

export interface StaffProgressionItem {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  currentVerifiedLevel: number | null;
  nextRoleTargetLevel: number;
  gap: number | null;
  status: StaffCareerProgressionStatus;
}

export interface StaffCareerPathViewData {
  careerPath: Pick<CareerPath, 'id' | 'name' | 'description' | 'status'>;
  steps: Array<{
    orderIndex: number;
    roleProfile: Pick<RoleProfile, 'id' | 'name' | 'description' | 'isArchived'>;
    isCurrentRole: boolean;
    isPastRole: boolean;
    isNextRole: boolean;
    isFutureRole: boolean;
  }>;
  currentRoleIndex: number; // -1 if not in path
  nextRole: Pick<RoleProfile, 'id' | 'name' | 'description'> | null;
  progressionItems: StaffProgressionItem[];
}

// ---------------------------------------------------------------------------
// CORE DELTA CALCULATION ALGORITHM
// ---------------------------------------------------------------------------

/**
 * Calculates deterministic skill/level deltas between sourceRole and targetRole.
 */
export type RoleRequirementWithCompetency = {
  competencyId: string;
  targetLevel: number;
  competency: Pick<Competency, 'id' | 'name' | 'type'> & Partial<Competency>;
};

/**
 * Pure derived computation using RoleRequirement.competencyId (never matching by name).
 */
export function calculateRoleProgressionDeltas(
  sourceRequirements: RoleRequirementWithCompetency[],
  targetRequirements: RoleRequirementWithCompetency[]
): CompetencyTransitionDelta[] {
  const sourceMap = new Map<string, RoleRequirementWithCompetency>();
  for (const req of sourceRequirements) {
    sourceMap.set(req.competencyId, req);
  }

  const targetMap = new Map<string, RoleRequirementWithCompetency>();
  for (const req of targetRequirements) {
    targetMap.set(req.competencyId, req);
  }

  const allCompIds = Array.from(new Set([...sourceMap.keys(), ...targetMap.keys()]));
  const deltas: CompetencyTransitionDelta[] = [];

  for (const compId of allCompIds) {
    const sReq = sourceMap.get(compId);
    const tReq = targetMap.get(compId);

    const comp = (tReq?.competency || sReq?.competency)!;

    let deltaType: CompetencyDeltaType;
    if (tReq && !sReq) {
      deltaType = 'NEW_REQUIREMENT';
    } else if (!tReq && sReq) {
      deltaType = 'NO_LONGER_REQUIRED';
    } else if (tReq && sReq) {
      if (tReq.targetLevel > sReq.targetLevel) {
        deltaType = 'LEVEL_INCREASE';
      } else if (tReq.targetLevel === sReq.targetLevel) {
        deltaType = 'UNCHANGED';
      } else {
        deltaType = 'LOWER_TARGET';
      }
    } else {
      continue;
    }

    deltas.push({
      competencyId: compId,
      competencyName: comp.name,
      competencyType: comp.type,
      sourceTargetLevel: sReq ? sReq.targetLevel : null,
      targetTargetLevel: tReq ? tReq.targetLevel : null,
      deltaType,
    });
  }

  // Deterministic order: Technical first, then alphabetical
  deltas.sort((a, b) => {
    if (a.competencyType !== b.competencyType) {
      return a.competencyType === CompetencyType.TECHNICAL ? -1 : 1;
    }
    return a.competencyName.localeCompare(b.competencyName);
  });

  return deltas;
}

/**
 * Builds all adjacent step-to-step transitions for a loaded career path.
 */
export function buildCareerPathTransitions(steps: CareerPathStepWithRole[]): CareerPathTransition[] {
  const transitions: CareerPathTransition[] = [];
  const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);

  for (let i = 0; i < sortedSteps.length - 1; i++) {
    const sourceStep = sortedSteps[i];
    const targetStep = sortedSteps[i + 1];

    const deltas = calculateRoleProgressionDeltas(
      sourceStep.roleProfile.requirements,
      targetStep.roleProfile.requirements
    );

    const newSkillsCount = deltas.filter((d) => d.deltaType === 'NEW_REQUIREMENT').length;
    const levelIncreasesCount = deltas.filter((d) => d.deltaType === 'LEVEL_INCREASE').length;
    const technicalDeltasCount = deltas.filter(
      (d) =>
        d.competencyType === CompetencyType.TECHNICAL &&
        (d.deltaType === 'NEW_REQUIREMENT' || d.deltaType === 'LEVEL_INCREASE')
    ).length;
    const behavioralDeltasCount = deltas.filter(
      (d) =>
        d.competencyType === CompetencyType.BEHAVIORAL &&
        (d.deltaType === 'NEW_REQUIREMENT' || d.deltaType === 'LEVEL_INCREASE')
    ).length;

    transitions.push({
      sourceRole: {
        id: sourceStep.roleProfile.id,
        name: sourceStep.roleProfile.name,
        description: sourceStep.roleProfile.description,
        status: sourceStep.roleProfile.status,
        isArchived: sourceStep.roleProfile.isArchived,
      },
      targetRole: {
        id: targetStep.roleProfile.id,
        name: targetStep.roleProfile.name,
        description: targetStep.roleProfile.description,
        status: targetStep.roleProfile.status,
        isArchived: targetStep.roleProfile.isArchived,
      },
      newSkillsCount,
      levelIncreasesCount,
      technicalDeltasCount,
      behavioralDeltasCount,
      deltas,
    });
  }

  return transitions;
}

// ---------------------------------------------------------------------------
// QUERIES & MUTATIONS (ORGANIZATION ADMIN)
// ---------------------------------------------------------------------------

/**
 * Lists career paths for an organization.
 */
export async function getCareerPathsForTenant(
  tenantId: string,
  options?: { onlyPublished?: boolean }
): Promise<CareerPathListItem[]> {
  if (!tenantId) return [];

  const where: Record<string, unknown> = { tenantId };
  if (options?.onlyPublished) {
    where.status = CareerPathStatus.PUBLISHED;
  }

  return prisma.careerPath.findMany({
    where,
    include: {
      _count: {
        select: { steps: true },
      },
      steps: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          orderIndex: true,
          roleProfile: {
            select: {
              id: true,
              name: true,
              isArchived: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Loads a single CareerPath with role requirements and derived transitions.
 */
export async function getCareerPathById(
  id: string,
  tenantId: string
): Promise<CareerPathDetail | null> {
  if (!id || !tenantId) return null;

  const path = await prisma.careerPath.findFirst({
    where: { id, tenantId },
    include: {
      steps: {
        orderBy: { orderIndex: 'asc' },
        include: {
          roleProfile: {
            include: {
              requirements: {
                include: {
                  competency: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!path) return null;

  const transitions = buildCareerPathTransitions(path.steps);

  return {
    ...path,
    transitions,
  };
}

/**
 * Creates a new Career Path.
 * Rejects draft roles, archived roles, duplicate roles, or foreign tenant roles.
 */
export async function createCareerPath(
  tenantId: string,
  rawInput: CreateCareerPathInput,
  actorContext?: AuditActorContext
): Promise<CareerPathWithSteps> {
  if (!tenantId) {
    throw new Error('Tenant ID is required.');
  }

  const input = createCareerPathSchema.parse(rawInput);

  // Validate roles eligibility: must belong to tenant, be PUBLISHED, not archived
  const roles = await prisma.roleProfile.findMany({
    where: {
      id: { in: input.roleProfileIds },
      tenantId,
    },
  });

  if (roles.length !== input.roleProfileIds.length) {
    throw new Error('One or more selected role profiles were not found or belong to another organization.');
  }

  for (const r of roles) {
    if (r.status !== 'PUBLISHED') {
      throw new Error(`Role profile "${r.name}" is in DRAFT status. Only published roles can be used in a career path.`);
    }
    if (r.isArchived) {
      throw new Error(`Role profile "${r.name}" is archived. Archived roles cannot be newly added to a career path.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const careerPath = await tx.careerPath.create({
      data: {
        tenantId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        status: input.status,
        steps: {
          create: input.roleProfileIds.map((roleProfileId, idx) => ({
            roleProfileId,
            orderIndex: idx,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.CAREER_PATH_CREATE,
      entityType: 'CareerPath',
      entityId: careerPath.id,
      tenantId,
      actorId: actorContext?.actorId,
      actorRole: actorContext?.actorRole || UserRole.ORGANIZATION_ADMIN,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: careerPath.name,
        roleProfileIds: input.roleProfileIds,
        status: careerPath.status,
      },
    });

    return careerPath;
  });
}

/**
 * Updates a DRAFT Career Path.
 * Published paths are structurally immutable.
 */
export async function updateCareerPath(
  tenantId: string,
  id: string,
  rawInput: UpdateCareerPathInput,
  actorContext?: AuditActorContext
): Promise<CareerPathWithSteps> {
  if (!tenantId || !id) {
    throw new Error('Tenant ID and Career Path ID are required.');
  }

  const existing = await prisma.careerPath.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Career path not found.');
  }

  if (existing.status === CareerPathStatus.PUBLISHED) {
    throw new Error('Published career paths are structurally immutable.');
  }

  const input = updateCareerPathSchema.parse(rawInput);

  // Validate roles
  const roles = await prisma.roleProfile.findMany({
    where: {
      id: { in: input.roleProfileIds },
      tenantId,
    },
  });

  if (roles.length !== input.roleProfileIds.length) {
    throw new Error('One or more selected role profiles were not found or belong to another organization.');
  }

  for (const r of roles) {
    if (r.status !== 'PUBLISHED') {
      throw new Error(`Role profile "${r.name}" is in DRAFT status. Only published roles can be added.`);
    }
    if (r.isArchived) {
      throw new Error(`Role profile "${r.name}" is archived. Archived roles cannot be newly added.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.careerPathStep.deleteMany({
      where: { careerPathId: id },
    });

    const updated = await tx.careerPath.update({
      where: { id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        steps: {
          create: input.roleProfileIds.map((roleProfileId, idx) => ({
            roleProfileId,
            orderIndex: idx,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.CAREER_PATH_UPDATE,
      entityType: 'CareerPath',
      entityId: updated.id,
      tenantId,
      actorId: actorContext?.actorId,
      actorRole: actorContext?.actorRole || UserRole.ORGANIZATION_ADMIN,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
        roleProfileIds: input.roleProfileIds,
      },
    });

    return updated;
  });
}

/**
 * Publishes a Career Path.
 */
export async function publishCareerPath(
  tenantId: string,
  id: string,
  actorContext?: AuditActorContext
): Promise<CareerPath> {
  if (!tenantId || !id) {
    throw new Error('Tenant ID and Career Path ID are required.');
  }

  const existing = await prisma.careerPath.findFirst({
    where: { id, tenantId },
    include: {
      steps: {
        include: {
          roleProfile: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error('Career path not found.');
  }

  if (existing.status === CareerPathStatus.PUBLISHED) {
    return existing;
  }

  if (existing.steps.length < 2) {
    throw new Error('A career path must contain at least 2 role profiles to be published.');
  }

  for (const step of existing.steps) {
    if (step.roleProfile.status !== 'PUBLISHED') {
      throw new Error(`Cannot publish: Role "${step.roleProfile.name}" is not published.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.careerPath.update({
      where: { id },
      data: {
        status: CareerPathStatus.PUBLISHED,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.CAREER_PATH_PUBLISH,
      entityType: 'CareerPath',
      entityId: updated.id,
      tenantId,
      actorId: actorContext?.actorId,
      actorRole: actorContext?.actorRole || UserRole.ORGANIZATION_ADMIN,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
        stepsCount: existing.steps.length,
      },
    });

    return updated;
  });
}

// ---------------------------------------------------------------------------
// STAFF CAREER PATH VIEWS (SM-04)
// ---------------------------------------------------------------------------

/**
 * Loads published career paths relevant to a staff user, along with progression analysis
 * against their next role in the path.
 */
export async function getStaffCareerPathView(
  userId: string,
  tenantId: string,
  selectedPathId?: string
): Promise<{
  userHasRoleProfile: boolean;
  userRoleProfile: Pick<RoleProfile, 'id' | 'name' | 'description'> | null;
  availablePaths: Array<Pick<CareerPath, 'id' | 'name' | 'description'>>;
  selectedPathData: StaffCareerPathViewData | null;
}> {
  if (!userId || !tenantId) {
    return {
      userHasRoleProfile: false,
      userRoleProfile: null,
      availablePaths: [],
      selectedPathData: null,
    };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: {
      id: true,
      roleProfileId: true,
      roleProfile: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  const publishedPaths = await prisma.careerPath.findMany({
    where: {
      tenantId,
      status: CareerPathStatus.PUBLISHED,
    },
    include: {
      steps: {
        orderBy: { orderIndex: 'asc' },
        include: {
          roleProfile: {
            include: {
              requirements: {
                include: {
                  competency: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const availablePaths = publishedPaths.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));

  if (!user?.roleProfileId || !user.roleProfile) {
    return {
      userHasRoleProfile: false,
      userRoleProfile: null,
      availablePaths,
      selectedPathData: null,
    };
  }

  // Find candidate path: selectedPathId, or first path that includes the user's current role, or first available
  let chosenPath = publishedPaths.find((p) => p.id === selectedPathId);
  if (!chosenPath) {
    chosenPath = publishedPaths.find((p) =>
      p.steps.some((s) => s.roleProfileId === user.roleProfileId)
    );
  }
  if (!chosenPath && publishedPaths.length > 0) {
    chosenPath = publishedPaths[0];
  }

  if (!chosenPath) {
    return {
      userHasRoleProfile: true,
      userRoleProfile: user.roleProfile,
      availablePaths,
      selectedPathData: null,
    };
  }

  // Locate user's position in this path
  const currentRoleIdx = chosenPath.steps.findIndex(
    (s) => s.roleProfileId === user.roleProfileId
  );

  const nextStep = currentRoleIdx >= 0 && currentRoleIdx < chosenPath.steps.length - 1
    ? chosenPath.steps[currentRoleIdx + 1]
    : null;

  // Resolve verified ratings for the staff user
  const ratingsMap = await getLatestVerifiedRatingsForUsers([userId], tenantId);
  const userRatings = ratingsMap.get(userId) || new Map<string, VerifiedCompetencyRating>();

  let progressionItems: StaffProgressionItem[] = [];

  if (nextStep) {
    progressionItems = nextStep.roleProfile.requirements.map((req) => {
      const verified = userRatings.get(req.competencyId);
      const currentVerifiedLevel = verified ? verified.finalRating : null;
      const nextRoleTargetLevel = req.targetLevel;

      let status: StaffCareerProgressionStatus;
      let gap: number | null = null;

      if (currentVerifiedLevel === null) {
        status = 'NOT_ASSESSED';
        gap = nextRoleTargetLevel;
      } else {
        gap = nextRoleTargetLevel - currentVerifiedLevel;
        if (currentVerifiedLevel === nextRoleTargetLevel) {
          status = 'MEETS_TARGET';
        } else if (currentVerifiedLevel > nextRoleTargetLevel) {
          status = 'EXCEEDS_TARGET';
        } else {
          status = 'DEVELOPMENT_NEEDED';
        }
      }

      return {
        competencyId: req.competencyId,
        competencyName: req.competency.name,
        competencyType: req.competency.type,
        currentVerifiedLevel,
        nextRoleTargetLevel,
        gap,
        status,
      };
    });

    // Order: Technical first, then alphabetical
    progressionItems.sort((a, b) => {
      if (a.competencyType !== b.competencyType) {
        return a.competencyType === CompetencyType.TECHNICAL ? -1 : 1;
      }
      return a.competencyName.localeCompare(b.competencyName);
    });
  }

  const stepsData = chosenPath.steps.map((step, idx) => ({
    orderIndex: step.orderIndex,
    roleProfile: {
      id: step.roleProfile.id,
      name: step.roleProfile.name,
      description: step.roleProfile.description,
      isArchived: step.roleProfile.isArchived,
    },
    isCurrentRole: idx === currentRoleIdx,
    isPastRole: currentRoleIdx >= 0 && idx < currentRoleIdx,
    isNextRole: currentRoleIdx >= 0 && idx === currentRoleIdx + 1,
    isFutureRole: currentRoleIdx >= 0 && idx > currentRoleIdx + 1,
  }));

  const selectedPathData: StaffCareerPathViewData = {
    careerPath: {
      id: chosenPath.id,
      name: chosenPath.name,
      description: chosenPath.description,
      status: chosenPath.status,
    },
    steps: stepsData,
    currentRoleIndex: currentRoleIdx,
    nextRole: nextStep ? {
      id: nextStep.roleProfile.id,
      name: nextStep.roleProfile.name,
      description: nextStep.roleProfile.description,
    } : null,
    progressionItems,
  };

  return {
    userHasRoleProfile: true,
    userRoleProfile: user.roleProfile,
    availablePaths,
    selectedPathData,
  };
}
