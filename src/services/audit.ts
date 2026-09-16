import { prisma } from '@/lib/db';
import { AuditAction, AuditLog, Prisma, UserRole } from '@prisma/client';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

export { AuditAction };

/**
 * Audit actor context passed from authenticated actions.
 */
export interface AuditActorContext {
  actorId?: string | null;
  actorRole?: UserRole | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Parameters for recording an audit event.
 */
export interface LogAuditEventParams {
  tx?: Prisma.TransactionClient;
  tenantId?: string | null;
  actorId?: string | null;
  actorRole?: UserRole | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Deliberate, bounded check for sensitive keys that must NEVER be persisted in audit details.
 * Prevents over-broad substring matching (e.g. matching "file" inside "roleProfileId").
 */
export function isSensitiveKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;

  const lower = key.toLowerCase();
  const normalized = lower.replace(/[-_]/g, '');

  // 1. Explicit allowlist for ordinary identifiers that might contain substrings like 'file' or 'content'
  if (
    normalized.endsWith('profileid') ||
    normalized.includes('roleprofile') ||
    normalized === 'profileid' ||
    normalized === 'filename' ||
    normalized === 'resourceid' ||
    normalized === 'frameworkversionid' ||
    normalized === 'competencyid' ||
    normalized === 'tenantid' ||
    normalized === 'actorid' ||
    normalized === 'userid' ||
    normalized === 'careerpathid'
  ) {
    return false;
  }

  // 2. Passwords: password, passwordHash, currentPassword, newPassword, confirmPassword
  if (normalized.includes('password')) return true;

  // 3. Tokens: token, rawToken, tokenHash, invitationToken, sessionToken, accessToken, refreshToken
  if (normalized.includes('token')) return true;

  // 4. Secrets: secret, authSecret, clientSecret, cronSecret
  if (normalized.includes('secret')) return true;

  // 5. Authorization: authorization, authorizationHeader, bearer
  if (normalized.includes('authorization') || normalized.includes('bearer')) return true;

  // 6. Cookies: cookie, sessionCookie
  if (normalized.includes('cookie')) return true;

  // 7. API / Service Keys: apiKey, serviceRoleKey, serviceKey, resendApiKey
  if (
    normalized.includes('apikey') ||
    normalized.includes('servicerolekey') ||
    normalized.includes('servicekey')
  ) {
    return true;
  }

  // 8. Database / Connection Strings: databaseUrl, connectionString
  if (normalized.includes('databaseurl') || normalized.includes('connectionstring')) return true;

  // 9. Specific file payload/body contents (NOT filenames or profiles):
  if (
    normalized.includes('filecontent') ||
    normalized.includes('attachmentcontent') ||
    normalized.includes('rawfile') ||
    normalized.includes('filebytes') ||
    normalized.includes('dataurl') ||
    normalized.includes('base64') ||
    normalized.includes('fileblob')
  ) {
    return true;
  }

  return false;
}

/**
 * Recursively scrubs sensitive values from an audit details object.
 */
export function sanitizeAuditDetails(data: unknown): unknown {
  if (data === null || data === undefined) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditDetails(item));
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        // Redact / scrub sensitive field completely
        continue;
      }

      // Truncate excessively long strings (e.g. evidence text) to max 500 chars in audit logs
      if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = `${value.substring(0, 500)}... [truncated]`;
      } else {
        sanitized[key] = sanitizeAuditDetails(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Records an immutable AuditLog entry.
 * Can be executed inside an existing Prisma transaction via params.tx.
 */
export async function logAuditEvent(params: LogAuditEventParams): Promise<AuditLog> {
  const db = params.tx || prisma;
  
  let detailsObj: Record<string, unknown> | null = null;
  if (params.details && typeof params.details === 'object' && !Array.isArray(params.details)) {
    detailsObj = { ...(params.details as Record<string, unknown>) };
  }

  let resolvedActorId: string | null = null;
  let resolvedActorRole: UserRole | null = (params.actorRole as UserRole) || null;

  if (params.actorId) {
    try {
      const actorUser = await db.user.findUnique({
        where: { id: params.actorId },
        select: { id: true, role: true },
      });
      if (actorUser) {
        resolvedActorId = actorUser.id;
        if (!resolvedActorRole) {
          resolvedActorRole = actorUser.role;
        }
      } else {
        if (!detailsObj) detailsObj = {};
        detailsObj.unlinkedActor = params.actorId;
      }
    } catch {
      if (!detailsObj) detailsObj = {};
      detailsObj.unlinkedActor = params.actorId;
    }
  }

  const sanitizedDetails = detailsObj || params.details 
    ? (sanitizeAuditDetails(detailsObj || params.details) as Prisma.InputJsonValue) 
    : Prisma.DbNull;

  const resourceType = params.resourceType || params.entityType || 'UNKNOWN';
  const resourceId = params.resourceId || params.entityId || '';

  return db.auditLog.create({
    data: {
      tenantId: params.tenantId || null,
      actorId: resolvedActorId,
      actorRole: resolvedActorRole,
      action: params.action,
      resourceType,
      resourceId,
      details: sanitizedDetails,
      ipAddress: params.ipAddress ? params.ipAddress.substring(0, 100) : null,
      userAgent: params.userAgent ? params.userAgent.substring(0, 255) : null,
    },
  });
}

export interface AuditLogItem extends AuditLog {
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export type AuditLogWithRelations = AuditLogItem;

export interface PaginatedAuditLogs {
  logs: AuditLogItem[];
  total: number;
  totalCount: number;
  page: number;
  limit: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Platform Admin global audit query.
 * Cross-tenant, sorted newest first (createdAt DESC), paginated (default 50).
 */
export async function getAuditLogsForPlatformAdmin(options: {
  page?: number;
  limit?: number;
  pageSize?: number;
  action?: AuditAction;
  tenantId?: string;
  actorId?: string;
  entityType?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<PaginatedAuditLogs> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.pageSize || options.limit || 50));
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (options.action) {
    where.action = options.action;
  }

  if (options.tenantId) {
    where.tenantId = options.tenantId;
  }

  if (options.actorId) {
    where.actorId = options.actorId;
  }

  const resType = options.resourceType || options.entityType;
  if (resType) {
    where.resourceType = { contains: resType, mode: 'insensitive' };
  }

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
  ]);

  return {
    logs,
    total,
    totalCount: total,
    page,
    limit,
    pageSize: limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Organization Admin tenant-scoped audit query.
 * Strictly derives tenantId from caller session. Cross-tenant logs are inaccessible.
 */
export async function getAuditLogsForTenant(
  tenantId: string,
  options: {
    page?: number;
    limit?: number;
    pageSize?: number;
    action?: AuditAction;
    actorId?: string;
    entityType?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<PaginatedAuditLogs> {
  if (!tenantId) {
    throw new Error('Tenant ID is required for organization audit query.');
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.pageSize || options.limit || 50));
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {
    tenantId,
  };

  if (options.action) {
    where.action = options.action;
  }

  if (options.actorId) {
    where.actorId = options.actorId;
  }

  const resType = options.resourceType || options.entityType;
  if (resType) {
    where.resourceType = { contains: resType, mode: 'insensitive' };
  }

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
  ]);

  return {
    logs,
    total,
    totalCount: total,
    page,
    limit,
    pageSize: limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Helper to extract client IP and userAgent from request headers.
 */
export function extractClientRequestContext(headersObj: Headers | Record<string, string | string[] | undefined>): {
  ipAddress?: string;
  userAgent?: string;
} {
  const getHeader = (name: string): string | undefined => {
    if ('get' in headersObj && typeof headersObj.get === 'function') {
      return headersObj.get(name) || undefined;
    }
    const val = (headersObj as Record<string, string | string[] | undefined>)[name] ||
      (headersObj as Record<string, string | string[] | undefined>)[name.toLowerCase()];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const forwarded = getHeader('x-forwarded-for');
  const realIp = getHeader('x-real-ip');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : realIp;
  const userAgent = getHeader('user-agent');

  return {
    ipAddress: ipAddress ? ipAddress.substring(0, 100) : undefined,
    userAgent: userAgent ? userAgent.substring(0, 255) : undefined,
  };
}
