import { requireRole } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { PlatformAdminNav } from '@/components/layout/platform-admin-nav';
import { getTenantsForPlatformAdmin } from '@/services/tenants';
import { TenantsDirectoryView } from './tenants-directory-view';

export const metadata = {
  title: 'Organizations Directory | Platform Admin',
  description: 'Manage platform organizations, tenant lifecycle, seat quotas, and provisioning.',
};

export default async function TenantsPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const tenants = await getTenantsForPlatformAdmin();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PlatformAdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TenantsDirectoryView initialTenants={tenants} />
      </main>
    </div>
  );
}
