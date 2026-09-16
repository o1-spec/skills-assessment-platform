import { requireRole } from '@/lib/auth/guards';
import { UserRole, AuditAction } from '@prisma/client';
import { PlatformAdminNav } from '@/components/layout/platform-admin-nav';
import { getAuditLogsForPlatformAdmin } from '@/services/audit';
import { prisma } from '@/lib/db';
import { PlatformAdminAuditView } from './audit-view';

export const metadata = {
  title: 'Audit Logs | Platform Admin',
  description: 'Global immutable audit trail and security monitoring for platform and tenant mutations.',
};

interface PlatformAdminAuditPageProps {
  searchParams: Promise<{
    tenantId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function PlatformAdminAuditPage({ searchParams }: PlatformAdminAuditPageProps) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const resolvedParams = await searchParams;

  const page = parseInt(resolvedParams.page || '1', 10) || 1;
  const pageSize = parseInt(resolvedParams.pageSize || '25', 10) || 25;

  let actionFilter: AuditAction | undefined = undefined;
  if (resolvedParams.action && Object.values(AuditAction).includes(resolvedParams.action as AuditAction)) {
    actionFilter = resolvedParams.action as AuditAction;
  }

  const startDate = resolvedParams.from ? new Date(resolvedParams.from) : undefined;
  const endDate = resolvedParams.to ? new Date(resolvedParams.to) : undefined;

  const [auditData, tenants] = await Promise.all([
    getAuditLogsForPlatformAdmin({
      tenantId: resolvedParams.tenantId || undefined,
      action: actionFilter,
      entityType: resolvedParams.entityType || undefined,
      startDate,
      endDate,
      page,
      pageSize,
    }),
    prisma.tenant.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PlatformAdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PlatformAdminAuditView
          initialData={auditData}
          tenants={tenants}
          availableActions={Object.values(AuditAction)}
          currentFilters={{
            tenantId: resolvedParams.tenantId || '',
            action: resolvedParams.action || '',
            entityType: resolvedParams.entityType || '',
            from: resolvedParams.from || '',
            to: resolvedParams.to || '',
            page,
            pageSize,
          }}
        />
      </main>
    </div>
  );
}
