import { requireRole } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
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
    <div className="max-w-4xl mx-auto">
      <ProvisionTenantForm activePlans={activePlans} />
    </div>
  );
}
