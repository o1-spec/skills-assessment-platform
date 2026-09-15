import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getManagersForTenant, getPublishedRoleProfilesForUserAssignment, getTenantSeatUsage } from '@/services/users';
import { InviteUserForm } from './invite-user-form';

export const dynamic = 'force-dynamic';

export default async function InviteUserPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const [managers, roleProfiles, seatUsage, teams] = await Promise.all([
    getManagersForTenant(tenantId),
    getPublishedRoleProfilesForUserAssignment(tenantId),
    getTenantSeatUsage(tenantId),
    prisma.team.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <InviteUserForm
      managers={managers}
      roleProfiles={roleProfiles}
      seatUsage={seatUsage}
      teams={teams}
    />
  );
}
