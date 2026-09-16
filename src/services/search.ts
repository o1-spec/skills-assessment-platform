import { prisma } from '@/lib/db';
import { UserRole, RoleProfileStatus } from '@prisma/client';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string | null;
  type: 'competency' | 'role' | 'person';
  href: string;
  statusBadge?: string | null;
}

export interface SearchResultsGrouped {
  query: string;
  competencies: SearchResultItem[];
  roles: SearchResultItem[];
  people: SearchResultItem[];
  totalMatches: number;
}

export async function searchTenantEntities(
  tenantId: string,
  userRole: UserRole,
  query: string,
  options?: {
    limitPerCategory?: number;
    actorUserId?: string;
  }
): Promise<SearchResultsGrouped> {
  if (!tenantId) {
    throw new Error('Tenant ID is required for in-tenant search.');
  }

  const trimmedQuery = query?.trim() || '';
  if (trimmedQuery.length < 2) {
    return {
      query: trimmedQuery,
      competencies: [],
      roles: [],
      people: [],
      totalMatches: 0,
    };
  }

  const limit = Math.min(Math.max(1, options?.limitPerCategory || 5), 20);

  const competenciesPromise = prisma.competency.findMany({
    where: {
      tenantId,
      name: { contains: trimmedQuery, mode: 'insensitive' },
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      isActive: true,
    },
    take: limit,
    orderBy: { name: 'asc' },
  });

  const rolesPromise = prisma.roleProfile.findMany({
    where: {
      tenantId,
      name: { contains: trimmedQuery, mode: 'insensitive' },
      ...(userRole === UserRole.ORGANIZATION_ADMIN ? {} : { status: RoleProfileStatus.PUBLISHED }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
    },
    take: limit,
    orderBy: { name: 'asc' },
  });

  let peoplePromise: Promise<
    Array<{ id: string; name: string; email: string; role: UserRole; isActive: boolean }>
  > = Promise.resolve([]);

  if (userRole === UserRole.ORGANIZATION_ADMIN) {
    peoplePromise = prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: trimmedQuery, mode: 'insensitive' } },
          { email: { contains: trimmedQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  } else if (userRole === UserRole.MANAGER && options?.actorUserId) {
    peoplePromise = prisma.user.findMany({
      where: {
        tenantId,
        managerId: options.actorUserId,
        isActive: true,
        OR: [
          { name: { contains: trimmedQuery, mode: 'insensitive' } },
          { email: { contains: trimmedQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  const [competencies, roles, people] = await Promise.all([
    competenciesPromise,
    rolesPromise,
    peoplePromise,
  ]);

  const competencyResults: SearchResultItem[] = competencies.map((c) => ({
    id: c.id,
    title: c.name,
    subtitle: c.description,
    type: 'competency',
    href: `/organization-admin/skills/${c.id}`,
    statusBadge: c.isActive ? null : 'Inactive',
  }));

  const roleResults: SearchResultItem[] = roles.map((r) => ({
    id: r.id,
    title: r.name,
    subtitle: r.description,
    type: 'role',
    href: `/organization-admin/roles/${r.id}`,
    statusBadge: r.status,
  }));

  const peopleResults: SearchResultItem[] = people.map((u) => ({
    id: u.id,
    title: u.name,
    subtitle: u.email,
    type: 'person',
    href:
      userRole === UserRole.ORGANIZATION_ADMIN
        ? `/organization-admin/users/${u.id}`
        : `/manager/direct-reports/${u.id}`,
    statusBadge: u.role,
  }));

  return {
    query: trimmedQuery,
    competencies: competencyResults,
    roles: roleResults,
    people: peopleResults,
    totalMatches: competencyResults.length + roleResults.length + peopleResults.length,
  };
}
