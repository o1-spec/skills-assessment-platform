import { prisma } from '@/lib/db';
import { FrameworkStatus, TenantFrameworkAdoption, FrameworkVersion } from '@prisma/client';

export type ActiveTenantAdoptionWithVersion = TenantFrameworkAdoption & {
  frameworkVersion: FrameworkVersion & {
    _count: {
      categories: number;
    };
    categories: {
      _count: {
        competencies: number;
      };
    }[];
  };
  competencyCount: number;
};

export type AvailablePublishedFramework = FrameworkVersion & {
  isActiveForTenant: boolean;
  adoptedAt: Date | null;
  competencyCount: number;
};

/**
 * Retrieves the currently active framework adoption for a tenant.
 */
export async function getActiveFrameworkAdoptionForTenant(
  tenantId: string
): Promise<ActiveTenantAdoptionWithVersion | null> {
  if (!tenantId) return null;

  const adoption = await prisma.tenantFrameworkAdoption.findFirst({
    where: {
      tenantId,
      isActive: true,
    },
    include: {
      frameworkVersion: {
        include: {
          _count: {
            select: { categories: true },
          },
          categories: {
            include: {
              _count: {
                select: { competencies: true },
              },
            },
          },
        },
      },
    },
  });

  if (!adoption) return null;

  const competencyCount = adoption.frameworkVersion.categories.reduce(
    (sum, cat) => sum + cat._count.competencies,
    0
  );

  return {
    ...adoption,
    competencyCount,
  };
}

/**
 * Retrieves all published canonical frameworks, highlighting any active/past adoption by the tenant.
 */
export async function getAvailablePublishedFrameworksForTenant(
  tenantId: string
): Promise<AvailablePublishedFramework[]> {
  if (!tenantId) return [];

  const [publishedVersions, tenantAdoptions] = await Promise.all([
    prisma.frameworkVersion.findMany({
      where: {
        status: FrameworkStatus.PUBLISHED,
      },
      include: {
        categories: {
          include: {
            _count: {
              select: { competencies: true },
            },
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
    }),
    prisma.tenantFrameworkAdoption.findMany({
      where: {
        tenantId,
      },
    }),
  ]);

  const adoptionMap = new Map(tenantAdoptions.map((a) => [a.frameworkVersionId, a]));

  return publishedVersions.map((v) => {
    const adoption = adoptionMap.get(v.id);
    const competencyCount = v.categories.reduce((sum, cat) => sum + cat._count.competencies, 0);

    return {
      ...v,
      isActiveForTenant: !!adoption?.isActive,
      adoptedAt: adoption?.adoptedAt || null,
      competencyCount,
    };
  });
}

/**
 * Adopts a published framework version for a tenant.
 * - Deactivates prior framework adoptions and operational canonical competencies of prior versions
 * - Creates/Reactivates operational competency & level records for the newly adopted version
 * - Idempotent: Does not create duplicate competency records if already adopted
 * - Preserves existing historical competencies used in past role profiles/campaigns
 */
export async function adoptFrameworkVersion(
  tenantId: string,
  frameworkVersionId: string
): Promise<TenantFrameworkAdoption> {
  if (!tenantId) {
    throw new Error('Tenant ID is required.');
  }

  // 1. Verify target framework is published
  const framework = await prisma.frameworkVersion.findUnique({
    where: { id: frameworkVersionId },
    include: {
      categories: {
        include: {
          competencies: {
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

  if (!framework) {
    throw new Error('Framework version not found.');
  }

  if (framework.status !== FrameworkStatus.PUBLISHED) {
    throw new Error('Cannot adopt unpublished framework: Framework must be in PUBLISHED status.');
  }

  // 2. Perform atomic adoption transaction
  return prisma.$transaction(async (tx) => {
    // 2a. Deactivate existing active adoption records
    await tx.tenantFrameworkAdoption.updateMany({
      where: {
        tenantId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // 2b. Upsert new adoption record
    const adoption = await tx.tenantFrameworkAdoption.upsert({
      where: {
        tenantId_frameworkVersionId: {
          tenantId,
          frameworkVersionId,
        },
      },
      update: {
        isActive: true,
        adoptedAt: new Date(),
      },
      create: {
        tenantId,
        frameworkVersionId,
        isActive: true,
        adoptedAt: new Date(),
      },
    });

    // 2c. Deactivate operational canonical competencies belonging to other framework versions
    const allCanonicalCompetenciesOfOtherVersions = await tx.competency.findMany({
      where: {
        tenantId,
        isCustom: false,
        frameworkCompetencyId: { not: null },
        frameworkCompetency: {
          category: {
            frameworkVersionId: { not: frameworkVersionId },
          },
        },
      },
      select: { id: true },
    });

    if (allCanonicalCompetenciesOfOtherVersions.length > 0) {
      await tx.competency.updateMany({
        where: {
          id: { in: allCanonicalCompetenciesOfOtherVersions.map((c) => c.id) },
        },
        data: {
          isActive: false,
        },
      });
    }

    // 2d. Snapshot/Create or Reactivate competencies and levels for the adopted version
    const allFrameworkCompetencies = framework.categories.flatMap((cat) => cat.competencies);

    for (const fwComp of allFrameworkCompetencies) {
      let tenantComp = await tx.competency.findUnique({
        where: {
          tenantId_frameworkCompetencyId: {
            tenantId,
            frameworkCompetencyId: fwComp.id,
          },
        },
      });

      if (!tenantComp) {
        // Create new operational snapshot
        tenantComp = await tx.competency.create({
          data: {
            tenantId,
            name: fwComp.name,
            description: fwComp.description,
            type: framework.categories.find((c) => c.id === fwComp.categoryId)?.type || 'TECHNICAL',
            frameworkCompetencyId: fwComp.id,
            isCustom: false,
            isActive: true,
          },
        });

        // Copy levels exactly
        for (const lvl of fwComp.levels) {
          await tx.competencyLevel.create({
            data: {
              competencyId: tenantComp.id,
              level: lvl.level,
              description: lvl.description,
              evidencePrompt: lvl.evidencePrompt,
            },
          });
        }
      } else {
        // Reactivate existing snapshot without overwriting historical modifications
        await tx.competency.update({
          where: { id: tenantComp.id },
          data: {
            isActive: true,
          },
        });
      }
    }

    return adoption;
  }, {
    timeout: 30000,
    maxWait: 10000,
  });
}
