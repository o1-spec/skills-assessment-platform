import { prisma } from '@/lib/db';
import { NotificationType, NotificationChannel, AuditAction, UserRole } from '@prisma/client';
import { logAuditEvent, AuditActorContext } from './audit';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

export const ALLOWED_TEMPLATE_VARIABLES = [
  'userName',
  'organizationName',
  'campaignName',
  'deadline',
  'roleName',
  'frameworkVersion',
  'overdueDays',
  'actionUrl',
] as const;

export type TemplateVariable = (typeof ALLOWED_TEMPLATE_VARIABLES)[number];

export interface NotificationTemplateDefinition {
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title?: string;
  body: string;
}

export const DEFAULT_NOTIFICATION_TEMPLATES: Record<
  string,
  NotificationTemplateDefinition
> = {
  [`${NotificationType.CAMPAIGN_ASSIGNED}_${NotificationChannel.IN_APP}`]: {
    type: NotificationType.CAMPAIGN_ASSIGNED,
    channel: NotificationChannel.IN_APP,
    title: 'New Assessment Assigned',
    body: 'You have been enrolled in the assessment campaign "{{campaignName}}". Deadline: {{deadline}}.',
  },
  [`${NotificationType.CAMPAIGN_ASSIGNED}_${NotificationChannel.EMAIL}`]: {
    type: NotificationType.CAMPAIGN_ASSIGNED,
    channel: NotificationChannel.EMAIL,
    subject: 'Action Required: You have been enrolled in {{campaignName}}',
    body: 'Hello {{userName}},\n\nYou have been assigned to complete the skills assessment for "{{campaignName}}" at {{organizationName}}.\n\nDeadline: {{deadline}}.\n\nPlease complete your assessment at: {{actionUrl}}',
  },

  [`${NotificationType.ASSESSMENT_DUE_REMINDER}_${NotificationChannel.IN_APP}`]: {
    type: NotificationType.ASSESSMENT_DUE_REMINDER,
    channel: NotificationChannel.IN_APP,
    title: 'Assessment Deadline Approaching',
    body: 'Your assessment for campaign "{{campaignName}}" is due on {{deadline}}.',
  },
  [`${NotificationType.ASSESSMENT_DUE_REMINDER}_${NotificationChannel.EMAIL}`]: {
    type: NotificationType.ASSESSMENT_DUE_REMINDER,
    channel: NotificationChannel.EMAIL,
    subject: 'Reminder: Assessment for {{campaignName}} is due soon',
    body: 'Hello {{userName}},\n\nThis is a reminder that your assessment for "{{campaignName}}" is due on {{deadline}}.\n\nPlease complete and submit your assessment at: {{actionUrl}}',
  },

  [`${NotificationType.ASSESSMENT_SUBMITTED_FOR_REVIEW}_${NotificationChannel.IN_APP}`]: {
    type: NotificationType.ASSESSMENT_SUBMITTED_FOR_REVIEW,
    channel: NotificationChannel.IN_APP,
    title: 'Manager Review Required',
    body: 'An assessment has been submitted in "{{campaignName}}" requiring your manager corroboration.',
  },
  [`${NotificationType.ASSESSMENT_SUBMITTED_FOR_REVIEW}_${NotificationChannel.EMAIL}`]: {
    type: NotificationType.ASSESSMENT_SUBMITTED_FOR_REVIEW,
    channel: NotificationChannel.EMAIL,
    subject: 'Review Required: Assessment submitted in {{campaignName}}',
    body: 'Hello {{userName}},\n\nA team member has submitted their self-assessment in "{{campaignName}}". Please review and complete your manager ratings.\n\nReview link: {{actionUrl}}',
  },

  [`${NotificationType.CORROBORATION_OVERDUE}_${NotificationChannel.IN_APP}`]: {
    type: NotificationType.CORROBORATION_OVERDUE,
    channel: NotificationChannel.IN_APP,
    title: 'Corroboration Review Overdue',
    body: 'A manager review in "{{campaignName}}" is overdue by {{overdueDays}} business days.',
  },
  [`${NotificationType.CORROBORATION_OVERDUE}_${NotificationChannel.EMAIL}`]: {
    type: NotificationType.CORROBORATION_OVERDUE,
    channel: NotificationChannel.EMAIL,
    subject: 'Overdue: Manager review in {{campaignName}}',
    body: 'Hello {{userName}},\n\nThe manager corroboration review in "{{campaignName}}" is currently overdue by {{overdueDays}} business days.\n\nPlease complete the pending evaluation at: {{actionUrl}}',
  },

  [`${NotificationType.ASSESSMENT_COMPLETED}_${NotificationChannel.IN_APP}`]: {
    type: NotificationType.ASSESSMENT_COMPLETED,
    channel: NotificationChannel.IN_APP,
    title: 'Assessment Completed',
    body: 'Your assessment for "{{campaignName}}" has been fully corroborated and finalized.',
  },
  [`${NotificationType.ASSESSMENT_COMPLETED}_${NotificationChannel.EMAIL}`]: {
    type: NotificationType.ASSESSMENT_COMPLETED,
    channel: NotificationChannel.EMAIL,
    subject: 'Your assessment for {{campaignName}} is complete',
    body: 'Hello {{userName}},\n\nYour skills assessment for "{{campaignName}}" has been corroborated by your manager and finalized.\n\nView your results and gap analysis at: {{actionUrl}}',
  },

  [`${NotificationType.FRAMEWORK_VERSION_AVAILABLE}_${NotificationChannel.IN_APP}`]: {
    type: NotificationType.FRAMEWORK_VERSION_AVAILABLE,
    channel: NotificationChannel.IN_APP,
    title: 'New Framework Version Available',
    body: 'Framework version {{frameworkVersion}} has been published. Review and adopt it to keep your skills library current.',
  },
  [`${NotificationType.FRAMEWORK_VERSION_AVAILABLE}_${NotificationChannel.EMAIL}`]: {
    type: NotificationType.FRAMEWORK_VERSION_AVAILABLE,
    channel: NotificationChannel.EMAIL,
    subject: 'New Framework Version {{frameworkVersion}} Available',
    body: 'Hello {{userName}},\n\nA new competency framework version ({{frameworkVersion}}) is now available for {{organizationName}}.\n\nReview and adopt the updated framework at: {{actionUrl}}',
  },
};

export function validateTemplateVariables(text?: string | null): void {
  if (!text) return;

  const matches = text.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return;

  for (const match of matches) {
    const varName = match.slice(2, -2).trim();
    if (!ALLOWED_TEMPLATE_VARIABLES.includes(varName as TemplateVariable)) {
      throw new Error(
        `Invalid template variable "${match}". Allowed variables are: ${ALLOWED_TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(', ')}`
      );
    }
  }
}

export function renderTemplate(text: string, variables: Record<string, string | number | null | undefined>): string {
  if (!text) return '';

  return text.replace(/\{\{([^}]+)\}\}/g, (_, rawVar) => {
    const varName = rawVar.trim();
    const val = variables[varName];
    if (val === undefined || val === null) {
      return '';
    }
    return String(val);
  });
}

export async function getNotificationTemplate(
  type: NotificationType,
  channel: NotificationChannel
): Promise<NotificationTemplateDefinition & { isCustom: boolean }> {
  try {
    const custom = await prisma.notificationTemplate.findUnique({
      where: {
        type_channel: { type, channel },
      },
    });

    if (custom && custom.isActive && custom.body.trim().length > 0) {
      return {
        type: custom.type,
        channel: custom.channel,
        subject: custom.subject || undefined,
        title: custom.title || undefined,
        body: custom.body,
        isCustom: true,
      };
    }
  } catch (err: unknown) {
    console.error('[NotificationEngine:Template] Failed to fetch custom template, using fallback:', err);
  }

  const defaultTpl =
    DEFAULT_NOTIFICATION_TEMPLATES[`${type}_${channel}`] || {
      type,
      channel,
      title: 'Notification',
      subject: 'Notification from Skills Assessment Platform',
      body: '{{message}}',
    };

  return {
    ...defaultTpl,
    isCustom: false,
  };
}

export async function getAllNotificationTemplates() {
  const customTemplates = await prisma.notificationTemplate.findMany();
  const customMap = new Map(customTemplates.map((t) => [`${t.type}_${t.channel}`, t]));

  const allTypes = Object.values(NotificationType);
  const allChannels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

  const results = [];
  for (const type of allTypes) {
    for (const channel of allChannels) {
      const key = `${type}_${channel}` as const;
      const custom = customMap.get(key);
      const defaultTpl = DEFAULT_NOTIFICATION_TEMPLATES[key];

      results.push({
        type,
        channel,
        subject: custom?.subject || defaultTpl?.subject || null,
        title: custom?.title || defaultTpl?.title || null,
        body: custom?.body || defaultTpl?.body || '',
        isCustom: !!(custom && custom.isActive),
        isActive: custom ? custom.isActive : true,
        updatedAt: custom?.updatedAt || null,
      });
    }
  }

  return results;
}

export async function updateNotificationTemplate(
  actorId: string,
  input: {
    type: NotificationType;
    channel: NotificationChannel;
    subject?: string | null;
    title?: string | null;
    body: string;
  },
  actorContext?: AuditActorContext
) {
  if (!input.body || !input.body.trim()) {
    throw new Error('Template body cannot be empty.');
  }

  validateTemplateVariables(input.subject);
  validateTemplateVariables(input.title);
  validateTemplateVariables(input.body);

  const updated = await prisma.notificationTemplate.upsert({
    where: {
      type_channel: { type: input.type, channel: input.channel },
    },
    create: {
      type: input.type,
      channel: input.channel,
      subject: input.subject?.trim() || null,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      isActive: true,
    },
    update: {
      subject: input.subject?.trim() || null,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      isActive: true,
    },
  });

  await logAuditEvent({
    tenantId: null,
    actorId,
    actorRole: UserRole.PLATFORM_ADMIN,
    action: AuditAction.NOTIFICATION_TEMPLATE_UPDATE,
    resourceType: 'NotificationTemplate',
    resourceId: updated.id,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      type: input.type,
      channel: input.channel,
      subject: input.subject,
      title: input.title,
    },
  });

  return updated;
}

export async function resetNotificationTemplate(
  actorId: string,
  type: NotificationType,
  channel: NotificationChannel,
  actorContext?: AuditActorContext
) {
  const existing = await prisma.notificationTemplate.findUnique({
    where: {
      type_channel: { type, channel },
    },
  });

  if (existing) {
    await prisma.notificationTemplate.delete({
      where: { id: existing.id },
    });

    await logAuditEvent({
      tenantId: null,
      actorId,
      actorRole: UserRole.PLATFORM_ADMIN,
      action: AuditAction.NOTIFICATION_TEMPLATE_RESET,
      resourceType: 'NotificationTemplate',
      resourceId: existing.id,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        type,
        channel,
      },
    });
  }

  return { success: true };
}
