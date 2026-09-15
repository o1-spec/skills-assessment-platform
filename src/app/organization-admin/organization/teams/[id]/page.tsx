import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { getTeamByIdForTenant, getDepartmentsForTenant } from '@/services/organization-structure';
import { prisma } from '@/lib/db';
import TeamDetailView from './team-detail-view';

export const metadata = {
  title: 'Team Details | Skills Assessment Platform',
};

interface TeamDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;
  const { id } = await params;

  const [team, departments, managers, allUsers] = await Promise.all([
    getTeamByIdForTenant(tenantId, id),
    getDepartmentsForTenant(tenantId),
    prisma.user.findMany({
      where: { tenantId, role: 'MANAGER', isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!team) notFound();

  return (
    <TeamDetailView
      team={team}
      departments={departments.map((d) => ({ id: d.id, name: d.name, isActive: d.isActive }))}
      managers={managers}
      allUsers={allUsers}
    />
  );
}
