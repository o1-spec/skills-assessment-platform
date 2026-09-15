import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getManagersForTenant, getPublishedRoleProfilesForUserAssignment, getTenantSeatUsage } from '@/services/users';
import { InviteUserForm } from './invite-user-form';

export const dynamic = 'force-dynamic';

export default async function InviteUserPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const [managers, roleProfiles, seatUsage] = await Promise.all([
    getManagersForTenant(tenantId),
    getPublishedRoleProfilesForUserAssignment(tenantId),
    getTenantSeatUsage(tenantId),
  ]);

  return (
    <InviteUserForm
      managers={managers}
      roleProfiles={roleProfiles}
      seatUsage={seatUsage}
    />
  );
}
