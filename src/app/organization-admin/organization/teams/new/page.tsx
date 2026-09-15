import { requireRole } from '@/lib/auth/guards';
import { getDepartmentsForTenant } from '@/services/organization-structure';
import { prisma } from '@/lib/db';
import NewTeamForm from './new-team-form';

export const metadata = { title: 'New Team' };

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ departmentId?: string }>;
}) {
  const { departmentId } = await searchParams;
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  const [departments, managers] = await Promise.all([
    getDepartmentsForTenant(tenantId),
    prisma.user.findMany({
      where: { tenantId, role: 'MANAGER', isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <NewTeamForm
      departments={departments.filter((d) => d.isActive)}
      managers={managers}
      defaultDepartmentId={departmentId}
    />
  );
}
