import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
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

  const [managers, roleProfiles] = await Promise.all([
    getManagersForTenant(tenantId, targetUser.id),
    getPublishedRoleProfilesForUserAssignment(tenantId),
  ]);

  return (
    <UserDetailView
      targetUser={targetUser}
      managers={managers}
      roleProfiles={roleProfiles}
      currentUserId={currentUser.id}
    />
  );
}
