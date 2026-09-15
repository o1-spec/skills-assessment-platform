import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { getDepartmentByIdForTenant } from '@/services/organization-structure';
import DepartmentDetailView from './department-detail-view';

export const metadata = { title: 'Department Detail' };

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  const dept = await getDepartmentByIdForTenant(tenantId, id);
  if (!dept) notFound();

  return <DepartmentDetailView department={dept} />;
}
