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

/**
 * Searches across competencies, role profiles, and people within a single tenant boundary.
 *
 * Security & Isolation:
 * - tenantId is strictly required and sourced from authenticated session.
 * - Results are always filtered by tenantId.
 * - People results are role-bounded:
 *   - ORGANIZATION_ADMIN: searches all active tenant users
 *   - MANAGER: searches only direct reports
 *   - STAFF: receives 0 people results
 */
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

  // 1. Search Competencies in tenant
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

  // 2. Search Role Profiles in tenant (Org Admin sees drafts + published; others see published)
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

  // 3. Search People in tenant with role-awareness
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
