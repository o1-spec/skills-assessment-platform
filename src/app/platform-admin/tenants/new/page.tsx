import { requireRole } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { PlatformAdminNav } from '@/components/layout/platform-admin-nav';
import { getActiveSubscriptionPlans } from '@/services/plans';
import { ProvisionTenantForm } from './provision-tenant-form';

export const metadata = {
  title: 'Provision Organization | Platform Admin',
  description: 'Provision a new organization, assign subscription plan, and invite initial Organization Admin.',
};

export default async function ProvisionTenantPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const activePlans = await getActiveSubscriptionPlans();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PlatformAdminNav />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProvisionTenantForm activePlans={activePlans} />
      </main>
    </div>
  );
}
