import { prisma } from '@/lib/db';
import { AuditAction, UserRole } from '@prisma/client';
import { logAuditEvent, AuditActorContext } from './audit';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

export interface TenantNotificationSettingsDTO {
  id?: string;
  tenantId: string;
  assessmentReminderDays: string;
  parsedReminderDays: number[];
  corroborationOverdueBusinessDays: number;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  isCustom: boolean;
}

export const DEFAULT_TENANT_NOTIFICATION_SETTINGS: Omit<
  TenantNotificationSettingsDTO,
  'id' | 'tenantId' | 'isCustom'
> = {
  assessmentReminderDays: '3,1',
  parsedReminderDays: [3, 1],
  corroborationOverdueBusinessDays: 5,
  emailEnabled: true,
  inAppEnabled: true,
};

/**
 * Parses and sanitizes a string or array of reminder offsets.
 * Deduplicates and sorts in descending order (e.g. "1, 3, 1" -> [3, 1]).
 * Enforces positive integers between 1 and 365, max 10 offsets.
 */
export function normalizeReminderDays(input: string | number[]): {
  normalizedString: string;
  parsedArray: number[];
} {
  let numbers: number[] = [];

  if (Array.isArray(input)) {
    numbers = input.map((n) => Math.floor(Number(n)));
  } else if (typeof input === 'string') {
    numbers = input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => parseInt(s, 10));
  }

  const validNumbers = numbers.filter((n) => !isNaN(n) && n > 0 && n <= 365);

  if (validNumbers.length === 0) {
    throw new Error('At least one valid reminder day (1-365) is required.');
  }

  if (validNumbers.length > 10) {
    throw new Error('Maximum of 10 reminder day offsets allowed.');
  }

  // Deduplicate and sort descending
  const uniqueDescending = Array.from(new Set(validNumbers)).sort((a, b) => b - a);

  return {
    normalizedString: uniqueDescending.join(','),
    parsedArray: uniqueDescending,
  };
}

/**
 * Returns notification settings for the given tenant, or system defaults if not customized.
 */
export async function getTenantNotificationSettings(
  tenantId: string
): Promise<TenantNotificationSettingsDTO> {
  if (!tenantId) {
    throw new Error('Tenant ID is required.');
  }

  try {
    const settings = await prisma.tenantNotificationSettings.findUnique({
      where: { tenantId },
    });

    if (settings) {
      const { parsedArray } = normalizeReminderDays(settings.assessmentReminderDays);
      return {
        id: settings.id,
        tenantId: settings.tenantId,
        assessmentReminderDays: settings.assessmentReminderDays,
        parsedReminderDays: parsedArray,
        corroborationOverdueBusinessDays: settings.corroborationOverdueBusinessDays,
        emailEnabled: settings.emailEnabled,
        inAppEnabled: settings.inAppEnabled,
        isCustom: true,
      };
    }
  } catch (err: unknown) {
    console.error('[NotificationEngine:Settings] Failed to fetch tenant settings, using defaults:', err);
  }

  return {
    tenantId,
    ...DEFAULT_TENANT_NOTIFICATION_SETTINGS,
    isCustom: false,
  };
}

/**
 * Updates notification settings for a specific tenant.
 * Audits TENANT_NOTIFICATION_SETTINGS_UPDATE.
 */
export async function updateTenantNotificationSettings(
  tenantId: string,
  actorId: string,
  data: {
    assessmentReminderDays?: string | number[];
    corroborationOverdueBusinessDays?: number;
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
  },
  actorContext?: AuditActorContext
): Promise<TenantNotificationSettingsDTO> {
  if (!tenantId) throw new Error('Tenant ID is required.');

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Organization not found.');

  const updateData: {
    assessmentReminderDays?: string;
    corroborationOverdueBusinessDays?: number;
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
  } = {};

  if (data.assessmentReminderDays !== undefined) {
    const { normalizedString } = normalizeReminderDays(data.assessmentReminderDays);
    updateData.assessmentReminderDays = normalizedString;
  }

  if (data.corroborationOverdueBusinessDays !== undefined) {
    const days = Math.floor(Number(data.corroborationOverdueBusinessDays));
    if (isNaN(days) || days < 1 || days > 60) {
      throw new Error('Corroboration overdue business days must be between 1 and 60.');
    }
    updateData.corroborationOverdueBusinessDays = days;
  }

  if (data.emailEnabled !== undefined) {
    updateData.emailEnabled = Boolean(data.emailEnabled);
  }

  if (data.inAppEnabled !== undefined) {
    updateData.inAppEnabled = Boolean(data.inAppEnabled);
  }

  const saved = await prisma.tenantNotificationSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      assessmentReminderDays: updateData.assessmentReminderDays ?? DEFAULT_TENANT_NOTIFICATION_SETTINGS.assessmentReminderDays,
      corroborationOverdueBusinessDays:
        updateData.corroborationOverdueBusinessDays ?? DEFAULT_TENANT_NOTIFICATION_SETTINGS.corroborationOverdueBusinessDays,
      emailEnabled: updateData.emailEnabled ?? DEFAULT_TENANT_NOTIFICATION_SETTINGS.emailEnabled,
      inAppEnabled: updateData.inAppEnabled ?? DEFAULT_TENANT_NOTIFICATION_SETTINGS.inAppEnabled,
    },
    update: updateData,
  });

  await logAuditEvent({
    tenantId,
    actorId,
    actorRole: UserRole.ORGANIZATION_ADMIN,
    action: AuditAction.TENANT_NOTIFICATION_SETTINGS_UPDATE,
    resourceType: 'TenantNotificationSettings',
    resourceId: saved.id,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      assessmentReminderDays: saved.assessmentReminderDays,
      corroborationOverdueBusinessDays: saved.corroborationOverdueBusinessDays,
      emailEnabled: saved.emailEnabled,
      inAppEnabled: saved.inAppEnabled,
    },
  });

  const { parsedArray } = normalizeReminderDays(saved.assessmentReminderDays);

  return {
    id: saved.id,
    tenantId: saved.tenantId,
    assessmentReminderDays: saved.assessmentReminderDays,
    parsedReminderDays: parsedArray,
    corroborationOverdueBusinessDays: saved.corroborationOverdueBusinessDays,
    emailEnabled: saved.emailEnabled,
    inAppEnabled: saved.inAppEnabled,
    isCustom: true,
  };
}
