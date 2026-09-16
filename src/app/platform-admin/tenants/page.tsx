import { requireRole } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { getTenantsForPlatformAdmin } from '@/services/tenants';
import { TenantsDirectoryView } from './tenants-directory-view';

export const metadata = {
  title: 'Organizations Directory | Platform Admin',
  description: 'Manage platform organizations, tenant lifecycle, seat quotas, and provisioning.',
};

export default async function TenantsPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const tenants = await getTenantsForPlatformAdmin();

  return <TenantsDirectoryView initialTenants={tenants} />;
}
