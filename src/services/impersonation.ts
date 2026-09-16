import { prisma } from '@/lib/db';
import { UserRole, AuditAction, TenantStatus } from '@prisma/client';
import { logAuditEvent, AuditActorContext } from './audit';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

export interface ImpersonationSessionData {
  realActorId: string;
  realActorRole: UserRole;
  impersonatedTenantId: string;
  impersonatedTenantName: string;
  impersonatedTenantSlug: string;
  reason: string;
  startedAt: string;
}

function assertCanImpersonate(role: UserRole): void {
  if (role !== UserRole.SUPPORT && role !== UserRole.PLATFORM_ADMIN) {
    throw new Error(
      `Access denied: Role "${role}" is not authorized to initiate support impersonation sessions.`
    );
  }
}

export async function startSupportImpersonation(
  actorId: string,
  actorRole: UserRole,
  tenantId: string,
  reason: string,
  actorContext?: AuditActorContext
): Promise<ImpersonationSessionData> {
  assertCanImpersonate(actorRole);

  const trimmedReason = reason?.trim();
  if (!trimmedReason || trimmedReason.length < 5) {
    throw new Error(
      'A valid, descriptive reason (minimum 5 characters) is required to access tenant support mode.'
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, status: true },
  });

  if (!tenant) {
    throw new Error('Target organization not found.');
  }

  if (tenant.status === TenantStatus.ARCHIVED) {
    throw new Error('Cannot impersonate an archived organization.');
  }

  const startedAt = new Date().toISOString();

  await logAuditEvent({
    tenantId: tenant.id,
    actorId,
    actorRole,
    action: AuditAction.SUPPORT_IMPERSONATION_START,
    resourceType: 'Tenant',
    resourceId: tenant.id,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      realActorId: actorId,
      realActorRole: actorRole,
      targetTenantId: tenant.id,
      targetTenantName: tenant.name,
      reason: trimmedReason,
      startedAt,
    },
  });

  return {
    realActorId: actorId,
    realActorRole: actorRole,
    impersonatedTenantId: tenant.id,
    impersonatedTenantName: tenant.name,
    impersonatedTenantSlug: tenant.slug,
    reason: trimmedReason,
    startedAt,
  };
}

export async function endSupportImpersonation(
  actorId: string,
  actorRole: UserRole,
  tenantId: string,
  actorContext?: AuditActorContext
): Promise<{ success: boolean; redirectPath: string }> {
  assertCanImpersonate(actorRole);

  await logAuditEvent({
    tenantId,
    actorId,
    actorRole,
    action: AuditAction.SUPPORT_IMPERSONATION_END,
    resourceType: 'Tenant',
    resourceId: tenantId,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      realActorId: actorId,
      realActorRole: actorRole,
      targetTenantId: tenantId,
      endedAt: new Date().toISOString(),
    },
  });

  const redirectPath = actorRole === UserRole.SUPPORT ? '/support' : '/platform-admin';
  return { success: true, redirectPath };
}

export function assertNotImpersonating(
  isImpersonating?: boolean,
  actionDescription = 'This operation'
): void {
  if (isImpersonating) {
    throw new Error(
      `Permission denied: ${actionDescription} cannot be performed while in Support Impersonation Mode.`
    );
  }
}
