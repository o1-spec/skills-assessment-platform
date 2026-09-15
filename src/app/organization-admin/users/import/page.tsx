import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { ImportView } from './import-view';

export const metadata = {
  title: 'Bulk CSV User Import | Skills Assessment Platform',
};

export default async function UserImportPage() {
  await requireRole(UserRole.ORGANIZATION_ADMIN);

  return <ImportView />;
}
