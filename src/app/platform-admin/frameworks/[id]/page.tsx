import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getFrameworkVersionById } from '@/services/frameworks';
import { FrameworkEditor } from './framework-editor';

export default async function FrameworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const { id } = await params;

  const framework = await getFrameworkVersionById(id);
  if (!framework) {
    notFound();
  }

  return <FrameworkEditor framework={framework} />;
}
