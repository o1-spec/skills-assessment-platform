import { requireRole } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { PlatformAdminNav } from '@/components/layout/platform-admin-nav';
import { getSubscriptionPlans } from '@/services/plans';
import { PlansDirectoryView } from './plans-directory-view';

export const metadata = {
  title: 'Subscription Plans | Platform Admin',
  description: 'Manage platform subscription tiers, seat limits, and active plans.',
};

export default async function SubscriptionPlansPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const plans = await getSubscriptionPlans();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PlatformAdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PlansDirectoryView initialPlans={plans} />
      </main>
    </div>
  );
}
