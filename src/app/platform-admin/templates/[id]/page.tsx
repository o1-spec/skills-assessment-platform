import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getIndustryTemplateById } from '@/services/industry-templates';
import { TemplateDetailView } from './template-detail-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IndustryTemplateDetailPage({ params }: PageProps) {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const { id } = await params;

  const template = await getIndustryTemplateById(id);
  if (!template) {
    notFound();
  }

  return <TemplateDetailView template={template} />;
}
