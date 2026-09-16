import { requireRole } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { getSubscriptionPlans } from '@/services/plans';
import { PlansDirectoryView } from './plans-directory-view';

export const metadata = {
  title: 'Subscription Plans | Platform Admin',
  description: 'Manage platform subscription tiers, seat limits, and active plans.',
};

export default async function SubscriptionPlansPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const plans = await getSubscriptionPlans();

  return <PlansDirectoryView initialPlans={plans} />;
}
