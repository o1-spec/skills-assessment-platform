import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getUsersForTenant, getPendingInvitationsForTenant, getTenantSeatUsage } from '@/services/users';
import { UsersDirectoryView } from './users-directory-view';

export const dynamic = 'force-dynamic';

export default async function OrganizationUsersPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const [users, pendingInvitations, seatUsage] = await Promise.all([
    getUsersForTenant(tenantId),
    getPendingInvitationsForTenant(tenantId),
    getTenantSeatUsage(tenantId),
  ]);

  return (
    <UsersDirectoryView
      initialUsers={users}
      initialPendingInvitations={pendingInvitations}
      seatUsage={seatUsage}
      currentUserId={user.id}
    />
  );
}
