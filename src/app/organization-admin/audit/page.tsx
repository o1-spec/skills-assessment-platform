import { requireRole } from '@/lib/auth/guards';
import { UserRole, AuditAction } from '@prisma/client';
import { getAuditLogsForTenant } from '@/services/audit';
import { OrgAdminAuditView } from './audit-view';

export const metadata = {
  title: 'Audit Trail | Organization Admin',
  description: 'Immutable historical record of sensitive organization events, configuration changes, and assessments.',
};

interface OrgAdminAuditPageProps {
  searchParams: Promise<{
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function OrgAdminAuditPage({ searchParams }: OrgAdminAuditPageProps) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId;

  if (!tenantId) {
    throw new Error('Authenticated user has no active organization.');
  }

  const resolvedParams = await searchParams;

  const page = parseInt(resolvedParams.page || '1', 10) || 1;
  const pageSize = parseInt(resolvedParams.pageSize || '25', 10) || 25;

  let actionFilter: AuditAction | undefined = undefined;
  if (resolvedParams.action && Object.values(AuditAction).includes(resolvedParams.action as AuditAction)) {
    actionFilter = resolvedParams.action as AuditAction;
  }

  const startDate = resolvedParams.from ? new Date(resolvedParams.from) : undefined;
  const endDate = resolvedParams.to ? new Date(resolvedParams.to) : undefined;

  const auditData = await getAuditLogsForTenant(tenantId, {
    action: actionFilter,
    entityType: resolvedParams.entityType || undefined,
    startDate,
    endDate,
    page,
    pageSize,
  });

  return (
    <OrgAdminAuditView
      initialData={auditData}
      availableActions={Object.values(AuditAction)}
      currentFilters={{
        action: resolvedParams.action || '',
        entityType: resolvedParams.entityType || '',
        from: resolvedParams.from || '',
        to: resolvedParams.to || '',
        page,
        pageSize,
      }}
    />
  );
}
