import { prisma } from '@/lib/db';
import { CompetencyType, FrameworkStatus, FrameworkVersion, FrameworkCategory, FrameworkCompetency, FrameworkLevel } from '@prisma/client';

export type FrameworkVersionWithStats = FrameworkVersion & {
  _count: {
    categories: number;
    adoptions: number;
  };
  competencyCount: number;
};

export type FullFrameworkCategory = FrameworkCategory & {
  children: (FrameworkCategory & {
    competencies: (FrameworkCompetency & {
      levels: FrameworkLevel[];
    })[];
  })[];
  competencies: (FrameworkCompetency & {
    levels: FrameworkLevel[];
  })[];
};

export type FullFrameworkVersion = FrameworkVersion & {
  categories: FullFrameworkCategory[];
  allCategories: FrameworkCategory[];
};

/**
 * Retrieves all framework versions with summary statistics.
 */
export async function getFrameworkVersions(): Promise<FrameworkVersionWithStats[]> {
  const versions = await prisma.frameworkVersion.findMany({
    include: {
      _count: {
        select: {
          categories: true,
          adoptions: true,
        },
      },
      categories: {
        include: {
          _count: {
            select: {
              competencies: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return versions.map((v) => {
    const competencyCount = v.categories.reduce((sum, cat) => sum + cat._count.competencies, 0);
    return {
      ...v,
      competencyCount,
    };
  });
}

/**
 * Retrieves a framework version by ID with full category, competency, and level hierarchy.
 */
export async function getFrameworkVersionById(id: string): Promise<FullFrameworkVersion | null> {
  const version = await prisma.frameworkVersion.findUnique({
    where: { id },
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
  });

  if (!version) return null;

  // Root categories only in the tree
  const rootCategories = version.categories.filter((cat) => !cat.parentId) as FullFrameworkCategory[];
  const allCategories = version.categories;

  return {
    ...version,
    categories: rootCategories,
    allCategories,
  };
}

/**
 * Creates a new framework version draft.
 */
export async function createFrameworkDraft(data: {
  version: string;
  description?: string;
}): Promise<FrameworkVersion> {
  const existing = await prisma.frameworkVersion.findUnique({
    where: { version: data.version.trim() },
  });

  if (existing) {
    throw new Error(`Framework version '${data.version.trim()}' already exists.`);
  }

  return prisma.frameworkVersion.create({
    data: {
      version: data.version.trim(),
      description: data.description?.trim() || null,
      status: FrameworkStatus.DRAFT,
      publishedAt: null,
    },
  });
}

/**
 * Creates a category in a draft framework version.
 */
export async function createFrameworkCategory(
  frameworkVersionId: string,
  data: {
    name: string;
    description?: string;
    type: CompetencyType;
    parentId?: string | null;
  }
): Promise<FrameworkCategory> {
  const framework = await prisma.frameworkVersion.findUnique({
    where: { id: frameworkVersionId },
  });

  if (!framework) {
    throw new Error('Framework version not found.');
  }

  // Published framework immutability enforcement
  if (framework.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot add category: Published frameworks are immutable.');
  }

  if (data.parentId) {
    const parent = await prisma.frameworkCategory.findUnique({
      where: { id: data.parentId },
    });

    if (!parent) {
      throw new Error('Parent category not found.');
    }

    if (parent.frameworkVersionId !== frameworkVersionId) {
      throw new Error('Parent category does not belong to this framework version.');
    }

    if (parent.type !== data.type) {
      throw new Error(`Category type mismatch: Parent is ${parent.type}, child cannot be ${data.type}.`);
    }

    if (parent.parentId !== null) {
      throw new Error('Hierarchical nesting is limited to Category -> Subcategory (2 levels).');
    }
  }

  return prisma.frameworkCategory.create({
    data: {
      frameworkVersionId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      type: data.type,
      parentId: data.parentId || null,
    },
  });
}

/**
 * Updates an existing framework category.
 */
export async function updateFrameworkCategory(
  id: string,
  data: {
    name?: string;
    description?: string;
  }
): Promise<FrameworkCategory> {
  const category = await prisma.frameworkCategory.findUnique({
    where: { id },
    include: { frameworkVersion: true },
  });

  if (!category) {
    throw new Error('Category not found.');
  }

  // Published framework immutability enforcement
  if (category.frameworkVersion.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot update category: Published frameworks are immutable.');
  }

  return prisma.frameworkCategory.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      description: data.description !== undefined ? data.description.trim() || null : undefined,
    },
  });
}

/**
 * Deletes an existing framework category (Safe delete behavior).
 */
export async function deleteFrameworkCategory(id: string): Promise<FrameworkCategory> {
  const category = await prisma.frameworkCategory.findUnique({
    where: { id },
    include: {
      frameworkVersion: true,
      children: true,
      competencies: true,
    },
  });

  if (!category) {
    throw new Error('Category not found.');
  }

  // Published framework immutability enforcement
  if (category.frameworkVersion.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot delete category: Published frameworks are immutable.');
  }

  if (category.children.length > 0 || category.competencies.length > 0) {
    throw new Error('Cannot delete category: Category contains subcategories or competencies. Remove child items first.');
  }

  return prisma.frameworkCategory.delete({
    where: { id },
  });
}

/**
 * Creates a competency in a draft framework version.
 */
export async function createFrameworkCompetency(
  frameworkVersionId: string,
  data: {
    categoryId: string;
    name: string;
    description: string;
  }
): Promise<FrameworkCompetency> {
  const framework = await prisma.frameworkVersion.findUnique({
    where: { id: frameworkVersionId },
  });

  if (!framework) {
    throw new Error('Framework version not found.');
  }

  // Published framework immutability enforcement
  if (framework.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot create competency: Published frameworks are immutable.');
  }

  const category = await prisma.frameworkCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category || category.frameworkVersionId !== frameworkVersionId) {
    throw new Error('Selected category does not belong to this framework version.');
  }

  return prisma.frameworkCompetency.create({
    data: {
      categoryId: data.categoryId,
      name: data.name.trim(),
      description: data.description.trim(),
    },
  });
}

/**
 * Updates an existing framework competency.
 */
export async function updateFrameworkCompetency(
  id: string,
  data: {
    name?: string;
    description?: string;
    categoryId?: string;
  }
): Promise<FrameworkCompetency> {
  const competency = await prisma.frameworkCompetency.findUnique({
    where: { id },
    include: {
      category: {
        include: { frameworkVersion: true },
      },
    },
  });

  if (!competency) {
    throw new Error('Competency not found.');
  }

  // Published framework immutability enforcement
  if (competency.category.frameworkVersion.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot update competency: Published frameworks are immutable.');
  }

  if (data.categoryId && data.categoryId !== competency.categoryId) {
    const newCategory = await prisma.frameworkCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!newCategory || newCategory.frameworkVersionId !== competency.category.frameworkVersionId) {
      throw new Error('Target category does not belong to the same framework version.');
    }
  }

  return prisma.frameworkCompetency.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      description: data.description !== undefined ? data.description.trim() : undefined,
      categoryId: data.categoryId || undefined,
    },
  });
}

/**
 * Deletes an existing framework competency in a draft framework.
 */
export async function deleteFrameworkCompetency(id: string): Promise<FrameworkCompetency> {
  const competency = await prisma.frameworkCompetency.findUnique({
    where: { id },
    include: {
      category: {
        include: { frameworkVersion: true },
      },
    },
  });

  if (!competency) {
    throw new Error('Competency not found.');
  }

  // Published framework immutability enforcement
  if (competency.category.frameworkVersion.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot delete competency: Published frameworks are immutable.');
  }

  return prisma.frameworkCompetency.delete({
    where: { id },
  });
}

/**
 * Creates a level descriptor for a competency in a draft framework.
 */
export async function createFrameworkLevel(
  frameworkVersionId: string,
  data: {
    frameworkCompetencyId: string;
    level: number;
    description: string;
    evidencePrompt?: string;
  }
): Promise<FrameworkLevel> {
  const framework = await prisma.frameworkVersion.findUnique({
    where: { id: frameworkVersionId },
  });

  if (!framework) {
    throw new Error('Framework version not found.');
  }

  // Published framework immutability enforcement
  if (framework.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot add level: Published frameworks are immutable.');
  }

  const competency = await prisma.frameworkCompetency.findUnique({
    where: { id: data.frameworkCompetencyId },
    include: { category: true },
  });

  if (!competency || competency.category.frameworkVersionId !== frameworkVersionId) {
    throw new Error('Competency does not belong to this framework version.');
  }

  if (data.level <= 0) {
    throw new Error('Level must be a positive integer.');
  }

  const existingLevel = await prisma.frameworkLevel.findUnique({
    where: {
      frameworkCompetencyId_level: {
        frameworkCompetencyId: data.frameworkCompetencyId,
        level: data.level,
      },
    },
  });

  if (existingLevel) {
    throw new Error(`Level ${data.level} already exists for competency '${competency.name}'.`);
  }

  return prisma.frameworkLevel.create({
    data: {
      frameworkCompetencyId: data.frameworkCompetencyId,
      level: data.level,
      description: data.description.trim(),
      evidencePrompt: data.evidencePrompt?.trim() || null,
    },
  });
}

/**
 * Updates an existing framework level descriptor.
 */
export async function updateFrameworkLevel(
  id: string,
  data: {
    level?: number;
    description?: string;
    evidencePrompt?: string;
  }
): Promise<FrameworkLevel> {
  const levelRecord = await prisma.frameworkLevel.findUnique({
    where: { id },
    include: {
      frameworkCompetency: {
        include: {
          category: {
            include: { frameworkVersion: true },
          },
        },
      },
    },
  });

  if (!levelRecord) {
    throw new Error('Level descriptor not found.');
  }

  // Published framework immutability enforcement
  if (levelRecord.frameworkCompetency.category.frameworkVersion.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot update level: Published frameworks are immutable.');
  }

  if (data.level !== undefined && data.level !== levelRecord.level) {
    if (data.level <= 0) {
      throw new Error('Level must be a positive integer.');
    }

    const existingLevel = await prisma.frameworkLevel.findUnique({
      where: {
        frameworkCompetencyId_level: {
          frameworkCompetencyId: levelRecord.frameworkCompetencyId,
          level: data.level,
        },
      },
    });

    if (existingLevel) {
      throw new Error(`Level ${data.level} already exists for this competency.`);
    }
  }

  return prisma.frameworkLevel.update({
    where: { id },
    data: {
      level: data.level !== undefined ? data.level : undefined,
      description: data.description !== undefined ? data.description.trim() : undefined,
      evidencePrompt: data.evidencePrompt !== undefined ? data.evidencePrompt.trim() || null : undefined,
    },
  });
}

/**
 * Deletes a framework level descriptor in a draft framework.
 */
export async function deleteFrameworkLevel(id: string): Promise<FrameworkLevel> {
  const levelRecord = await prisma.frameworkLevel.findUnique({
    where: { id },
    include: {
      frameworkCompetency: {
        include: {
          category: {
            include: { frameworkVersion: true },
          },
        },
      },
    },
  });

  if (!levelRecord) {
    throw new Error('Level descriptor not found.');
  }

  // Published framework immutability enforcement
  if (levelRecord.frameworkCompetency.category.frameworkVersion.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot delete level: Published frameworks are immutable.');
  }

  return prisma.frameworkLevel.delete({
    where: { id },
  });
}

/**
 * Atomically publishes a draft framework version after comprehensive validation.
 */
export async function publishFrameworkVersion(id: string): Promise<FrameworkVersion> {
  const framework = await prisma.frameworkVersion.findUnique({
    where: { id },
    include: {
      categories: {
        include: {
          competencies: {
            include: {
              levels: true,
            },
          },
        },
      },
    },
  });

  if (!framework) {
    throw new Error('Framework version not found.');
  }

  if (framework.status !== FrameworkStatus.DRAFT) {
    throw new Error('Cannot publish framework: Only DRAFT frameworks can be published.');
  }

  // Flatten all competencies across root and subcategories
  const allCompetencies = framework.categories.flatMap((cat) => cat.competencies);

  // Validation Rule 1: At least 1 competency must exist
  if (allCompetencies.length === 0) {
    throw new Error('Cannot publish framework: At least one competency is required before publishing.');
  }

  // Validation Rule 2: Every competency must have at least 1 level
  for (const comp of allCompetencies) {
    if (comp.levels.length === 0) {
      throw new Error(`Cannot publish framework: Competency '${comp.name}' must have at least one level descriptor.`);
    }

    // Validation Rule 3: Every level must have a non-empty description
    for (const lvl of comp.levels) {
      if (!lvl.description || lvl.description.trim().length === 0) {
        throw new Error(`Cannot publish framework: Level ${lvl.level} of competency '${comp.name}' has an empty description.`);
      }
    }
  }

  return prisma.frameworkVersion.update({
    where: { id },
    data: {
      status: FrameworkStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });
}

/**
 * Copies an entire published framework into a new DRAFT version.
 */
export async function createDraftFromPublishedVersion(
  sourceVersionId: string,
  newVersion: string,
  newDescription?: string
): Promise<FrameworkVersion> {
  const source = await prisma.frameworkVersion.findUnique({
    where: { id: sourceVersionId },
    include: {
      categories: {
        include: {
          competencies: {
            include: {
              levels: true,
            },
          },
        },
      },
    },
  });

  if (!source) {
    throw new Error('Source framework version not found.');
  }

  if (source.status !== FrameworkStatus.PUBLISHED) {
    throw new Error('Cannot clone version: Source framework must be in PUBLISHED status.');
  }

  const existing = await prisma.frameworkVersion.findUnique({
    where: { version: newVersion.trim() },
  });

  if (existing) {
    throw new Error(`Framework version '${newVersion.trim()}' already exists.`);
  }

  // Perform full deep copy in a transaction with extended timeout for latency
  return prisma.$transaction(async (tx) => {
    const draft = await tx.frameworkVersion.create({
      data: {
        version: newVersion.trim(),
        description: newDescription?.trim() || source.description,
        status: FrameworkStatus.DRAFT,
        publishedAt: null,
      },
    });

    // Map old category ID -> new category ID
    const categoryIdMap = new Map<string, string>();

    // 1. Copy root categories first
    const rootCategories = source.categories.filter((cat) => !cat.parentId);
    for (const rootCat of rootCategories) {
      const newRootCat = await tx.frameworkCategory.create({
        data: {
          frameworkVersionId: draft.id,
          name: rootCat.name,
          description: rootCat.description,
          type: rootCat.type,
          parentId: null,
        },
      });
      categoryIdMap.set(rootCat.id, newRootCat.id);

      // Copy direct competencies of root category
      for (const comp of rootCat.competencies) {
        const newComp = await tx.frameworkCompetency.create({
          data: {
            categoryId: newRootCat.id,
            name: comp.name,
            description: comp.description,
          },
        });

        for (const lvl of comp.levels) {
          await tx.frameworkLevel.create({
            data: {
              frameworkCompetencyId: newComp.id,
              level: lvl.level,
              description: lvl.description,
              evidencePrompt: lvl.evidencePrompt,
            },
          });
        }
      }
    }

    // 2. Copy subcategories
    const subCategories = source.categories.filter((cat) => cat.parentId);
    for (const subCat of subCategories) {
      const newParentId = subCat.parentId ? categoryIdMap.get(subCat.parentId) : null;
      const newSubCat = await tx.frameworkCategory.create({
        data: {
          frameworkVersionId: draft.id,
          name: subCat.name,
          description: subCat.description,
          type: subCat.type,
          parentId: newParentId,
        },
      });
      categoryIdMap.set(subCat.id, newSubCat.id);

      // Copy competencies of subcategory
      for (const comp of subCat.competencies) {
        const newComp = await tx.frameworkCompetency.create({
          data: {
            categoryId: newSubCat.id,
            name: comp.name,
            description: comp.description,
          },
        });

        for (const lvl of comp.levels) {
          await tx.frameworkLevel.create({
            data: {
              frameworkCompetencyId: newComp.id,
              level: lvl.level,
              description: lvl.description,
              evidencePrompt: lvl.evidencePrompt,
            },
          });
        }
      }
    }

    return draft;
  }, {
    timeout: 30000,
    maxWait: 10000,
  });
}
