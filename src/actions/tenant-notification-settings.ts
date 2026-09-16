'use server';

import { getCurrentUser } from '@/lib/auth/service';
import { updateTenantNotificationSettings } from '@/services/tenant-notification-settings';
import { UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function updateTenantNotificationSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const isImpersonatingOrgAdmin =
    Boolean(user.impersonation?.isImpersonating) &&
    (user.role === UserRole.SUPPORT || user.role === UserRole.PLATFORM_ADMIN);

  if (user.role !== UserRole.ORGANIZATION_ADMIN && !isImpersonatingOrgAdmin) {
    throw new Error('Unauthorized: Organization Administrator access required.');
  }

  const tenantId = user.tenantId;
  if (!tenantId) {
    throw new Error('Tenant context is required.');
  }

  const assessmentReminderDays = formData.get('assessmentReminderDays')?.toString();
  const corroborationDaysRaw = formData.get('corroborationOverdueBusinessDays')?.toString();
  const emailEnabled = formData.get('emailEnabled') === 'true' || formData.get('emailEnabled') === 'on';
  const inAppEnabled = formData.get('inAppEnabled') === 'true' || formData.get('inAppEnabled') === 'on';

  const corroborationOverdueBusinessDays = corroborationDaysRaw
    ? parseInt(corroborationDaysRaw, 10)
    : undefined;

  await updateTenantNotificationSettings(tenantId, user.id, {
    assessmentReminderDays,
    corroborationOverdueBusinessDays,
    emailEnabled,
    inAppEnabled,
  });

  revalidatePath('/organization-admin/organization');
  return { success: true };
}
