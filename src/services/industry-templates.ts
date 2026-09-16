import { prisma } from '@/lib/db';
import { FrameworkStatus, IndustryTemplate, TemplateRoleProfile, TemplateRequirement, AuditAction } from '@prisma/client';
import { logAuditEvent } from './audit';

export type IndustryTemplateWithStats = IndustryTemplate & {
  frameworkVersion: {
    id: string;
    version: string;
    status: FrameworkStatus;
    description: string | null;
  };
  _count: {
    competencies: number;
    roleProfiles: number;
  };
};

export type IndustryTemplateWithCounts = IndustryTemplateWithStats;

export type FullIndustryTemplate = IndustryTemplate & {
  frameworkVersion: {
    id: string;
    version: string;
    status: FrameworkStatus;
    description: string | null;
    categories: {
      id: string;
      name: string;
      description: string | null;
      type: 'TECHNICAL' | 'BEHAVIORAL';
      parentId: string | null;
      children: {
        id: string;
        name: string;
        description: string | null;
        type: 'TECHNICAL' | 'BEHAVIORAL';
        competencies: {
          id: string;
          name: string;
          description: string;
          levels: {
            id: string;
            level: number;
            description: string;
            evidencePrompt: string | null;
          }[];
        }[];
      }[];
      competencies: {
        id: string;
        name: string;
        description: string;
        levels: {
          id: string;
          level: number;
          description: string;
          evidencePrompt: string | null;
        }[];
      }[];
    }[];
  };
  competencies: {
    id: string;
    industryTemplateId?: string;
    frameworkCompetencyId: string;
    weight: number;
    frameworkCompetency: {
      id: string;
      name: string;
      description: string;
      category: {
        id: string;
        name: string;
        type: 'TECHNICAL' | 'BEHAVIORAL';
        parentId: string | null;
      };
      levels: {
        id: string;
        level: number;
        description: string;
        evidencePrompt: string | null;
      }[];
    };
  }[];
  roleProfiles: (TemplateRoleProfile & {
    requirements: (TemplateRequirement & {
      frameworkCompetency: {
        id: string;
        name: string;
        description: string;
        category: {
          id: string;
          name: string;
          type: 'TECHNICAL' | 'BEHAVIORAL';
        };
        levels: {
          id: string;
          level: number;
          description: string;
        }[];
      };
    })[];
  })[];
};

export async function getIndustryTemplates(): Promise<IndustryTemplateWithStats[]> {
  return prisma.industryTemplate.findMany({
    include: {
      frameworkVersion: {
        select: {
          id: true,
          version: true,
          status: true,
          description: true,
        },
      },
      _count: {
        select: {
          competencies: true,
          roleProfiles: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getActiveIndustryTemplates(): Promise<IndustryTemplateWithStats[]> {
  return prisma.industryTemplate.findMany({
    where: {
      isActive: true,
    },
    include: {
      frameworkVersion: {
        select: {
          id: true,
          version: true,
          status: true,
          description: true,
        },
      },
      _count: {
        select: {
          competencies: true,
          roleProfiles: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getIndustryTemplateById(id: string): Promise<FullIndustryTemplate | null> {
  const template = await prisma.industryTemplate.findUnique({
    where: { id },
    include: {
      frameworkVersion: {
        include: {
          categories: {
            orderBy: { name: 'asc' },
            include: {
              children: {
                orderBy: { name: 'asc' },
                include: {
                  competencies: {
                    orderBy: { name: 'asc' },
                    include: {
                      levels: {
                        orderBy: { level: 'asc' },
                      },
                    },
                  },
                },
              },
              competencies: {
                orderBy: { name: 'asc' },
                include: {
                  levels: {
                    orderBy: { level: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
      competencies: {
        include: {
          frameworkCompetency: {
            include: {
              category: true,
              levels: {
                orderBy: { level: 'asc' },
              },
            },
          },
        },
        orderBy: {
          frameworkCompetency: {
            name: 'asc',
          },
        },
      },
      roleProfiles: {
        include: {
          requirements: {
            include: {
              frameworkCompetency: {
                include: {
                  category: true,
                  levels: {
                    orderBy: { level: 'asc' },
                  },
                },
              },
            },
            orderBy: {
              frameworkCompetency: {
                name: 'asc',
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      },
    },
  });

  if (!template) return null;

  const rootCategories = template.frameworkVersion.categories.filter((cat) => !cat.parentId);

  return {
    ...template,
    frameworkVersion: {
      ...template.frameworkVersion,
      categories: rootCategories,
    },
  } as unknown as FullIndustryTemplate;
}

export async function createIndustryTemplate(
  data: {
    name: string;
    description?: string;
    frameworkVersionId: string;
    competencyIds: string[];
  },
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<IndustryTemplate> {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error('Template name is required.');
  }

  const framework = await prisma.frameworkVersion.findUnique({
    where: { id: data.frameworkVersionId },
    include: {
      categories: {
        include: {
          competencies: true,
        },
      },
    },
  });

  if (!framework) {
    throw new Error('Framework version not found.');
  }

  if (framework.status !== FrameworkStatus.PUBLISHED) {
    throw new Error('Cannot create industry template: Target framework must be in PUBLISHED status.');
  }

  const existing = await prisma.industryTemplate.findUnique({
    where: { name: trimmedName },
  });

  if (existing) {
    throw new Error(`An industry template with the name '${trimmedName}' already exists.`);
  }

  const validCompetencyIds = new Set(
    framework.categories.flatMap((cat) => cat.competencies.map((c) => c.id))
  );

  const invalidCompetency = data.competencyIds.find((id) => !validCompetencyIds.has(id));
  if (invalidCompetency) {
    throw new Error('One or more selected competencies do not belong to the selected framework version.');
  }

  return prisma.$transaction(async (tx) => {
    const template = await tx.industryTemplate.create({
      data: {
        name: trimmedName,
        description: data.description?.trim() || null,
        frameworkVersionId: data.frameworkVersionId,
        isActive: true,
      },
    });

    if (data.competencyIds.length > 0) {
      const uniqueCompIds = Array.from(new Set(data.competencyIds));
      await tx.industryTemplateCompetency.createMany({
        data: uniqueCompIds.map((compId) => ({
          industryTemplateId: template.id,
          frameworkCompetencyId: compId,
        })),
      });
    }

    await logAuditEvent({
      tx,
      action: AuditAction.INDUSTRY_TEMPLATE_CREATE,
      entityType: 'IndustryTemplate',
      entityId: template.id,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: template.name,
        frameworkVersionId: template.frameworkVersionId,
        competencyCount: data.competencyIds.length,
      },
    });

    return template;
  });
}

export async function updateIndustryTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
  },
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<IndustryTemplate> {
  const template = await prisma.industryTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new Error('Industry template not found.');
  }

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new Error('Template name cannot be empty.');
    }

    if (trimmedName !== template.name) {
      const existing = await prisma.industryTemplate.findUnique({
        where: { name: trimmedName },
      });
      if (existing) {
        throw new Error(`An industry template with the name '${trimmedName}' already exists.`);
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.industryTemplate.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description.trim() || null : undefined,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.INDUSTRY_TEMPLATE_UPDATE,
      entityType: 'IndustryTemplate',
      entityId: updated.id,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
        changes: data,
      },
    });

    return updated;
  });
}

export async function toggleIndustryTemplateActive(
  id: string,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<IndustryTemplate> {
  const template = await prisma.industryTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new Error('Industry template not found.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.industryTemplate.update({
      where: { id },
      data: {
        isActive: !template.isActive,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.INDUSTRY_TEMPLATE_UPDATE,
      entityType: 'IndustryTemplate',
      entityId: updated.id,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        name: updated.name,
        isActive: updated.isActive,
      },
    });

    return updated;
  });
}

export async function deleteIndustryTemplate(id: string): Promise<IndustryTemplate> {
  const template = await prisma.industryTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new Error('Industry template not found.');
  }

  return prisma.industryTemplate.delete({
    where: { id },
  });
}

export async function addTemplateCompetency(
  industryTemplateId: string,
  frameworkCompetencyId: string,
  weight: number = 100
) {
  const template = await prisma.industryTemplate.findUnique({
    where: { id: industryTemplateId },
  });

  if (!template) {
    throw new Error('Industry template not found.');
  }

  const competency = await prisma.frameworkCompetency.findUnique({
    where: { id: frameworkCompetencyId },
    include: {
      category: true,
    },
  });

  if (!competency || competency.category.frameworkVersionId !== template.frameworkVersionId) {
    throw new Error('Competency does not belong to this industry template’s framework version.');
  }

  if (weight <= 0) {
    throw new Error('Competency weight must be a positive integer.');
  }

  const existing = await prisma.industryTemplateCompetency.findUnique({
    where: {
      industryTemplateId_frameworkCompetencyId: {
        industryTemplateId,
        frameworkCompetencyId,
      },
    },
  });

  if (existing) {
    throw new Error(`Competency '${competency.name}' is already included in this template.`);
  }

  return prisma.industryTemplateCompetency.create({
    data: {
      industryTemplateId,
      frameworkCompetencyId,
      weight,
    },
  });
}

export async function updateTemplateCompetencyWeight(
  industryTemplateId: string,
  frameworkCompetencyId: string,
  weight: number
) {
  if (weight <= 0) {
    throw new Error('Competency weight must be a positive integer.');
  }

  return prisma.industryTemplateCompetency.update({
    where: {
      industryTemplateId_frameworkCompetencyId: {
        industryTemplateId,
        frameworkCompetencyId,
      },
    },
    data: { weight },
  });
}

export async function removeTemplateCompetency(
  industryTemplateId: string,
  frameworkCompetencyId: string
) {
  const template = await prisma.industryTemplate.findUnique({
    where: { id: industryTemplateId },
    include: {
      roleProfiles: true,
    },
  });

  if (!template) {
    throw new Error('Industry template not found.');
  }

  return prisma.$transaction(async (tx) => {
    const roleProfileIds = template.roleProfiles.map((r) => r.id);
    if (roleProfileIds.length > 0) {
      await tx.templateRequirement.deleteMany({
        where: {
          templateRoleProfileId: { in: roleProfileIds },
          frameworkCompetencyId,
        },
      });
    }

    return tx.industryTemplateCompetency.delete({
      where: {
        industryTemplateId_frameworkCompetencyId: {
          industryTemplateId,
          frameworkCompetencyId,
        },
      },
    });
  });
}

export async function createTemplateRoleProfile(
  industryTemplateId: string,
  data: {
    name: string;
    description?: string;
    requirements: {
      frameworkCompetencyId: string;
      targetLevel: number;
    }[];
  }
): Promise<TemplateRoleProfile> {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error('Role profile name is required.');
  }

  const template = await prisma.industryTemplate.findUnique({
    where: { id: industryTemplateId },
    include: {
      competencies: true,
    },
  });

  if (!template) {
    throw new Error('Industry template not found.');
  }

  const includedCompIds = new Set(template.competencies.map((c) => c.frameworkCompetencyId));

  const seenCompIds = new Set<string>();
  for (const req of data.requirements) {
    if (seenCompIds.has(req.frameworkCompetencyId)) {
      throw new Error('Duplicate competency requirement found in role profile.');
    }
    seenCompIds.add(req.frameworkCompetencyId);
  }

  for (const req of data.requirements) {
    if (!includedCompIds.has(req.frameworkCompetencyId)) {
      throw new Error('All role requirements must reference competencies included in this industry template.');
    }

    const actualLevel = await prisma.frameworkLevel.findUnique({
      where: {
        frameworkCompetencyId_level: {
          frameworkCompetencyId: req.frameworkCompetencyId,
          level: req.targetLevel,
        },
      },
    });

    if (!actualLevel) {
      throw new Error(`Target level ${req.targetLevel} is not a valid level descriptor for this competency.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const roleProfile = await tx.templateRoleProfile.create({
      data: {
        industryTemplateId,
        name: trimmedName,
        description: data.description?.trim() || null,
      },
    });

    if (data.requirements.length > 0) {
      await tx.templateRequirement.createMany({
        data: data.requirements.map((req) => ({
          templateRoleProfileId: roleProfile.id,
          frameworkCompetencyId: req.frameworkCompetencyId,
          targetLevel: req.targetLevel,
        })),
      });
    }

    return roleProfile;
  });
}

export async function updateTemplateRoleProfile(
  id: string,
  data: {
    name?: string;
    description?: string;
    requirements?: {
      frameworkCompetencyId: string;
      targetLevel: number;
    }[];
  }
): Promise<TemplateRoleProfile> {
  const roleProfile = await prisma.templateRoleProfile.findUnique({
    where: { id },
    include: {
      industryTemplate: {
        include: {
          competencies: true,
        },
      },
    },
  });

  if (!roleProfile) {
    throw new Error('Template role profile not found.');
  }

  const includedCompIds = new Set(
    roleProfile.industryTemplate.competencies.map((c) => c.frameworkCompetencyId)
  );

  if (data.requirements) {
    const seenCompIds = new Set<string>();
    for (const req of data.requirements) {
      if (seenCompIds.has(req.frameworkCompetencyId)) {
        throw new Error('Duplicate competency requirement found in role profile.');
      }
      seenCompIds.add(req.frameworkCompetencyId);

      if (!includedCompIds.has(req.frameworkCompetencyId)) {
        throw new Error('All role requirements must reference competencies included in this industry template.');
      }

      const actualLevel = await prisma.frameworkLevel.findUnique({
        where: {
          frameworkCompetencyId_level: {
            frameworkCompetencyId: req.frameworkCompetencyId,
            level: req.targetLevel,
          },
        },
      });

      if (!actualLevel) {
        throw new Error(`Target level ${req.targetLevel} is not a valid level descriptor for this competency.`);
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.templateRoleProfile.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description.trim() || null : undefined,
      },
    });

    if (data.requirements !== undefined) {
      await tx.templateRequirement.deleteMany({
        where: { templateRoleProfileId: id },
      });

      if (data.requirements.length > 0) {
        await tx.templateRequirement.createMany({
          data: data.requirements.map((req) => ({
            templateRoleProfileId: id,
            frameworkCompetencyId: req.frameworkCompetencyId,
            targetLevel: req.targetLevel,
          })),
        });
      }
    }

    return updated;
  });
}

export async function deleteTemplateRoleProfile(id: string): Promise<TemplateRoleProfile> {
  const roleProfile = await prisma.templateRoleProfile.findUnique({
    where: { id },
  });

  if (!roleProfile) {
    throw new Error('Template role profile not found.');
  }

  return prisma.templateRoleProfile.delete({
    where: { id },
  });
}
