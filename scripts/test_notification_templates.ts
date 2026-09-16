import { prisma } from '../src/lib/db';
import {
  validateTemplateVariables,
  renderTemplate,
  getNotificationTemplate,
  updateNotificationTemplate,
  resetNotificationTemplate,
  getAllNotificationTemplates,
} from '../src/services/notification-templates';
import { NotificationType, NotificationChannel, AuditAction, UserRole } from '@prisma/client';

async function run() {
  console.log('=== Running Notification Templates Test Suite ===');

  const admin = await prisma.user.findFirst({
    where: { role: UserRole.PLATFORM_ADMIN },
  });
  if (!admin) {
    throw new Error('Platform admin user not found');
  }

  // 1. Variable whitelist validation
  validateTemplateVariables('Hello {{userName}}, campaign {{campaignName}} due on {{deadline}}');
  console.log('✔ Whitelisted variables validated successfully');

  try {
    validateTemplateVariables('Hello {{maliciousPayload}}');
    throw new Error('Should have rejected non-whitelisted variable');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('Invalid template variable')) {
      throw new Error(`Unexpected error: ${msg}`);
    }
    console.log('✔ Correctly rejected non-whitelisted placeholder');
  }

  // 2. Variable rendering
  const rendered = renderTemplate('Hi {{userName}}, welcome to {{organizationName}}!', {
    userName: 'Sarah',
    organizationName: 'Acme Corp',
  });
  if (rendered !== 'Hi Sarah, welcome to Acme Corp!') {
    throw new Error(`Unexpected rendered text: ${rendered}`);
  }
  console.log('✔ Rendered template correctly:', rendered);

  // 3. Fallback to default
  const defaultTpl = await getNotificationTemplate(
    NotificationType.CAMPAIGN_ASSIGNED,
    NotificationChannel.IN_APP
  );
  console.log('Default template resolved (isCustom:', defaultTpl.isCustom, ')');

  // 4. Update template
  const customBody = 'Custom notice for {{userName}}: You have been enrolled in {{campaignName}}!';
  const updated = await updateNotificationTemplate(admin.id, {
    type: NotificationType.CAMPAIGN_ASSIGNED,
    channel: NotificationChannel.IN_APP,
    title: 'Custom Enrollment Notice',
    body: customBody,
  });

  if (updated.body !== customBody) {
    throw new Error('Updated template body does not match');
  }

  const reloaded = await getNotificationTemplate(
    NotificationType.CAMPAIGN_ASSIGNED,
    NotificationChannel.IN_APP
  );
  if (!reloaded.isCustom || reloaded.body !== customBody) {
    throw new Error('Custom template not retrieved after update');
  }
  console.log('✔ Successfully saved custom notification template');

  // 5. Verify audit log for update
  const auditUpdate = await prisma.auditLog.findFirst({
    where: {
      action: AuditAction.NOTIFICATION_TEMPLATE_UPDATE,
      actorId: admin.id,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!auditUpdate) {
    throw new Error('Audit log for NOTIFICATION_TEMPLATE_UPDATE not found');
  }
  console.log('✔ Audit log verified for template update');

  // 6. Reset template back to default
  await resetNotificationTemplate(
    admin.id,
    NotificationType.CAMPAIGN_ASSIGNED,
    NotificationChannel.IN_APP
  );

  const afterReset = await getNotificationTemplate(
    NotificationType.CAMPAIGN_ASSIGNED,
    NotificationChannel.IN_APP
  );
  if (afterReset.isCustom) {
    throw new Error('Template should not be custom after reset');
  }
  console.log('✔ Successfully reset template back to system default');

  // 7. Verify audit log for reset
  const auditReset = await prisma.auditLog.findFirst({
    where: {
      action: AuditAction.NOTIFICATION_TEMPLATE_RESET,
      actorId: admin.id,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!auditReset) {
    throw new Error('Audit log for NOTIFICATION_TEMPLATE_RESET not found');
  }
  console.log('✔ Audit log verified for template reset');

  // 8. List all templates
  const allTemplates = await getAllNotificationTemplates();
  if (allTemplates.length === 0) {
    throw new Error('getAllNotificationTemplates returned empty list');
  }
  console.log(`✔ Verified all ${allTemplates.length} system notification templates`);

  console.log('✔ Notification Templates tests passed successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Notification Templates test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
