import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { getTenantByIdForPlatformAdmin } from '@/services/tenants';
import { getActiveSubscriptionPlans } from '@/services/plans';
import { TenantDetailView } from './tenant-detail-view';

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Organization Detail | Platform Admin',
  description: 'View organization details, adjust subscription plan, and manage tenant status.',
};

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const { id } = await params;

  const [tenant, activePlans] = await Promise.all([
    getTenantByIdForPlatformAdmin(id),
    getActiveSubscriptionPlans(),
  ]);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <TenantDetailView tenant={tenant} activePlans={activePlans} />
    </div>
  );
}
