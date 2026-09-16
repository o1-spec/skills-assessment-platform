import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getCareerPathById } from '@/services/career-paths';
import { CareerPathDetailView } from './career-path-detail-view';

export default async function CareerPathDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;
  const { id } = await params;

  const careerPath = await getCareerPathById(id, tenantId);
  if (!careerPath) {
    notFound();
  }

  return <CareerPathDetailView careerPath={careerPath} />;
}
