import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getTenantCompetencyById } from '@/services/competencies';
import { CustomSkillDetail } from './custom-skill-detail';

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;
  const { id } = await params;

  const competency = await getTenantCompetencyById(tenantId, id);
  if (!competency) {
    notFound();
  }

  return <CustomSkillDetail competency={competency} />;
}
