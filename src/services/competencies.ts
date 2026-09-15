import { prisma } from '@/lib/db';
import { Competency, CompetencyLevel } from '@prisma/client';

export type CompetencyWithLevels = Competency & {
  levels: CompetencyLevel[];
};

/**
 * Retrieves all competencies belonging to the specified tenant,
 * including all ordered competency level descriptors.
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
    },
    orderBy: [
      { type: 'asc' },
      { name: 'asc' },
    ],
  });
}
