import { prisma } from '../src/lib/db';
import {
  normalizeReminderDays,
  getTenantNotificationSettings,
  updateTenantNotificationSettings,
} from '../src/services/tenant-notification-settings';
import { createAndDispatchNotification } from '../src/services/notifications';
import { AuditAction, NotificationType, NotificationEmailStatus } from '@prisma/client';

async function run() {
  console.log('=== Running Organization Notification Settings Test Suite ===');

  // 1. Normalization tests
  const norm1 = normalizeReminderDays('1, 5, 3, 1');
  if (norm1.normalizedString !== '5,3,1' || norm1.parsedArray[0] !== 5) {
    throw new Error(`Normalization failed for string input: ${norm1.normalizedString}`);
  }

  const norm2 = normalizeReminderDays([1, 7, 3]);
  if (norm2.normalizedString !== '7,3,1') {
    throw new Error(`Normalization failed for array input: ${norm2.normalizedString}`);
  }
  console.log('✔ Normalization and deduplication verified');

  // 2. Fetch active tenant and org admin
  const orgAdmin = await prisma.user.findFirst({
    where: {
      role: 'ORGANIZATION_ADMIN',
      tenantId: { not: null },
      tenant: { status: 'ACTIVE' },
    },
    include: { tenant: true },
  });
  if (!orgAdmin || !orgAdmin.tenant) {
    throw new Error('Active tenant with organization admin not found');
  }
  const tenant = orgAdmin.tenant;

  // 3. Defaults check
  const initial = await getTenantNotificationSettings(tenant.id);
  console.log('Initial settings:', initial);

  // 4. Update settings
  const updated = await updateTenantNotificationSettings(tenant.id, orgAdmin.id, {
    assessmentReminderDays: '10, 5, 2',
    corroborationOverdueBusinessDays: 7,
    emailEnabled: false,
    inAppEnabled: true,
  });

  if (updated.assessmentReminderDays !== '10,5,2') {
    throw new Error('assessmentReminderDays was not updated correctly');
  }
  if (updated.corroborationOverdueBusinessDays !== 7) {
    throw new Error('corroborationOverdueBusinessDays was not updated correctly');
  }
  if (updated.emailEnabled !== false) {
    throw new Error('emailEnabled was not updated to false');
  }
  console.log('✔ Successfully updated tenant notification settings');

  // 5. Verify audit log
  const audit = await prisma.auditLog.findFirst({
    where: {
      action: AuditAction.TENANT_NOTIFICATION_SETTINGS_UPDATE,
      tenantId: tenant.id,
      actorId: orgAdmin.id,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!audit) {
    throw new Error('Expected TENANT_NOTIFICATION_SETTINGS_UPDATE audit log');
  }
  console.log('✔ Audit log verified for tenant notification settings');

  // 6. Test email suppression when emailEnabled is false
  const notif = await createAndDispatchNotification({
    tenantId: tenant.id,
    recipientId: orgAdmin.id,
    type: NotificationType.ASSESSMENT_DUE_REMINDER,
    title: 'Test Email Suppression',
    message: 'Testing email suppression when tenant disabled email',
    dedupeKey: `test:email-suppression:${Date.now()}`,
  });

  if (notif.emailStatus !== NotificationEmailStatus.SKIPPED) {
    throw new Error(`Expected emailStatus SKIPPED when emailEnabled=false, got: ${notif.emailStatus}`);
  }
  console.log('✔ Email dispatch correctly skipped when emailEnabled is false');

  // Clean up: restore emailEnabled to true
  await updateTenantNotificationSettings(tenant.id, orgAdmin.id, {
    assessmentReminderDays: '3, 1',
    corroborationOverdueBusinessDays: 5,
    emailEnabled: true,
    inAppEnabled: true,
  });
  console.log('✔ Restored default settings for tenant');

  console.log('✔ Organization Notification Settings tests passed successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Organization Notification Settings test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
