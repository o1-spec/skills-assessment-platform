import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { UserRole } from '@prisma/client';
import { PlatformAdminNav } from '@/components/layout/platform-admin-nav';
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PlatformAdminNav />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TenantDetailView tenant={tenant} activePlans={activePlans} />
      </main>
    </div>
  );
}
