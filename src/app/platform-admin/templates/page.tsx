import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getIndustryTemplates } from '@/services/industry-templates';
import { TemplatesDirectoryView } from './templates-directory-view';

export const dynamic = 'force-dynamic';

export default async function IndustryTemplatesPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const templates = await getIndustryTemplates();

  return <TemplatesDirectoryView initialTemplates={templates} />;
}
