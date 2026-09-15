import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  getUserByIdForTenant,
  getManagersForTenant,
  getPublishedRoleProfilesForUserAssignment,
} from '@/services/users';
import { UserDetailView } from './user-detail-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationUserDetailPage({ params }: PageProps) {
  const currentUser = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = currentUser.tenantId!;
  const { id } = await params;

  const targetUser = await getUserByIdForTenant(tenantId, id);
  if (!targetUser) {
    notFound();
  }

  const [managers, roleProfiles, teams, userMemberships] = await Promise.all([
    getManagersForTenant(tenantId, targetUser.id),
    getPublishedRoleProfilesForUserAssignment(tenantId),
    prisma.team.findMany({
      where: { tenantId },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.teamMembership.findMany({
      where: { userId: targetUser.id, team: { tenantId } },
      select: { teamId: true },
    }),
  ]);

  const initialTeamIds = userMemberships.map((m) => m.teamId);

  return (
    <UserDetailView
      targetUser={targetUser}
      managers={managers}
      roleProfiles={roleProfiles}
      teams={teams}
      initialTeamIds={initialTeamIds}
      currentUserId={currentUser.id}
    />
  );
}
