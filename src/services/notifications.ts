import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import {
  Notification,
  NotificationType,
  NotificationEmailStatus,
  AssessmentStatus,
  CampaignStatus,
  TenantStatus,
  UserRole,
} from '@prisma/client';

export interface CreateNotificationInput {
  tenantId?: string | null;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  dedupeKey?: string | null;
  emailSubject?: string;
  emailHtml?: string;
  emailText?: string;
}

export interface NotificationListItem extends Notification {
  recipient: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface GetNotificationsOptions {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Validates that an href is a safe, internal application path.
 * Disallows external URLs, protocols, protocol-relative URLs, or javascript schemes.
 */
export function sanitizeNotificationHref(href?: string | null): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes(':')
  ) {
    return trimmed;
  }
  return null;
}

/**
 * Atomically creates a Notification row with optional deduplication.
 * Dispatches an email via the server email abstraction.
 * If email fails, the in-app notification remains intact with emailStatus = FAILED.
 */
export async function createAndDispatchNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  // 1. Check recipient user and tenant
  const recipient = await prisma.user.findUnique({
    where: { id: input.recipientId },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          status: true,
          name: true,
        },
      },
    },
  });

  if (!recipient) {
    throw new Error(`Recipient user not found: ${input.recipientId}`);
  }

  const tenantId = input.tenantId !== undefined ? input.tenantId : recipient.tenantId;
  const safeHref = sanitizeNotificationHref(input.href);

  // 2. If dedupeKey supplied, check if notification already exists
  if (input.dedupeKey) {
    const existing = await prisma.notification.findUnique({
      where: { dedupeKey: input.dedupeKey },
    });
    if (existing) {
      return existing;
    }
  }

  // 3. Create persistent Notification record
  let notification: Notification;
  try {
    notification = await prisma.notification.create({
      data: {
        tenantId,
        recipientId: recipient.id,
        type: input.type,
        title: input.title.trim(),
        message: input.message.trim(),
        href: safeHref,
        resourceType: input.resourceType || null,
        resourceId: input.resourceId || null,
        dedupeKey: input.dedupeKey || null,
        emailStatus: NotificationEmailStatus.PENDING,
      },
    });
  } catch (createErr: unknown) {
    // Catch unique constraint race condition on dedupeKey gracefully
    if (
      input.dedupeKey &&
      typeof createErr === 'object' &&
      createErr !== null &&
      'code' in createErr &&
      (createErr as { code: string }).code === 'P2002'
    ) {
      const existing = await prisma.notification.findUnique({
        where: { dedupeKey: input.dedupeKey },
      });
      if (existing) return existing;
    }
    throw createErr;
  }

  // 4. Attempt email delivery safely without throwing or rolling back
  try {
    const emailSubject = input.emailSubject || input.title;
    const emailText = input.emailText || `${input.title}\n\n${input.message}${safeHref ? `\n\nLink: ${safeHref}` : ''}`;
    const emailHtml = input.emailHtml || `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <h2 style="color: #111827; margin-bottom: 16px;">${escapeHtml(input.title)}</h2>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">${escapeHtml(input.message)}</p>
        ${safeHref ? `<p><a href="${safeHref}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Details</a></p>` : ''}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px 0;" />
        <p style="font-size: 12px; color: #6b7280;">Skills Assessment Platform Notification</p>
      </div>
    `;

    const sendResult = await sendEmail({
      to: recipient.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    const emailStatus =
      sendResult.status === 'SENT'
        ? NotificationEmailStatus.SENT
        : sendResult.status === 'SKIPPED'
        ? NotificationEmailStatus.SKIPPED
        : NotificationEmailStatus.FAILED;

    const boundedError = sendResult.error
      ? sendResult.error.substring(0, 255)
      : null;

    notification = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        emailStatus,
        emailSentAt: sendResult.status === 'SENT' ? new Date() : null,
        emailError: boundedError,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown email dispatch error';
    const boundedError = errorMsg.substring(0, 255);

    notification = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        emailStatus: NotificationEmailStatus.FAILED,
        emailError: boundedError,
      },
    });
  }

  return notification;
}

/**
 * Retrieves notifications for an authenticated user with strict recipient verification.
 */
export async function getNotificationsForUser(
  userId: string,
  tenantId?: string | null,
  options?: GetNotificationsOptions
): Promise<{ notifications: NotificationListItem[]; total: number; unreadCount: number }> {
  if (!userId) {
    return { notifications: [], total: 0, unreadCount: 0 };
  }

  const whereClause: {
    recipientId: string;
    tenantId?: string | null;
    readAt?: null;
  } = {
    recipientId: userId,
  };

  if (tenantId !== undefined) {
    whereClause.tenantId = tenantId;
  }

  if (options?.unreadOnly) {
    whereClause.readAt = null;
  }

  const take = Math.min(Math.max(options?.limit ?? 20, 1), 50);
  const skip = Math.max(options?.offset ?? 0, 0);

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: whereClause,
      include: {
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
      skip,
    }),
    prisma.notification.count({
      where: whereClause,
    }),
    prisma.notification.count({
      where: {
        recipientId: userId,
        ...(tenantId !== undefined ? { tenantId } : {}),
        readAt: null,
      },
    }),
  ]);

  return { notifications, total, unreadCount };
}

/**
 * Returns the unread notification count for an authenticated user.
 */
export async function getUnreadNotificationCount(
  userId: string,
  tenantId?: string | null
): Promise<number> {
  if (!userId) return 0;

  return prisma.notification.count({
    where: {
      recipientId: userId,
      ...(tenantId !== undefined ? { tenantId } : {}),
      readAt: null,
    },
  });
}

/**
 * Marks a single notification as read.
 * Strictly verifies that recipientId matches the authenticated userId.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<Notification> {
  if (!notificationId || !userId) {
    throw new Error('Notification ID and authenticated user ID are required.');
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId: userId,
    },
  });

  if (!notification) {
    throw new Error('Notification not found or access denied.');
  }

  if (notification.readAt) {
    return notification; // Already read
  }

  return prisma.notification.update({
    where: { id: notification.id },
    data: { readAt: new Date() },
  });
}

/**
 * Marks all unread notifications as read for the authenticated user.
 */
export async function markAllNotificationsRead(
  userId: string,
  tenantId?: string | null
): Promise<number> {
  if (!userId) return 0;

  const result = await prisma.notification.updateMany({
    where: {
      recipientId: userId,
      ...(tenantId !== undefined ? { tenantId } : {}),
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

// ---------------------------------------------------------------------------
// AUTOMATED REMINDER SERVICES & HELPERS
// ---------------------------------------------------------------------------

/**
 * Calculates how many business days (weekdays: Monday-Friday) have passed
 * strictly between startDate and endDate.
 */
export function calculateBusinessDaysPassed(startDate: Date, endDate: Date): number {
  if (endDate.getTime() <= startDate.getTime()) return 0;

  let count = 0;
  const current = new Date(startDate);
  // Advance to the beginning of next day to start counting
  current.setDate(current.getDate() + 1);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current.getTime() <= end.getTime()) {
    const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Parses configurable reminder days (e.g. "3,1" -> [3, 1]).
 */
export function getAssessmentReminderDays(): number[] {
  const envValue = process.env.ASSESSMENT_REMINDER_DAYS;
  if (!envValue || !envValue.trim()) {
    return [3, 1];
  }
  const parsed = envValue
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
  return parsed.length > 0 ? parsed : [3, 1];
}

/**
 * Parses configurable corroboration overdue business days threshold (default: 5).
 */
export function getCorroborationOverdueBusinessDays(): number {
  const envValue = process.env.CORROBORATION_OVERDUE_BUSINESS_DAYS;
  if (!envValue || !envValue.trim()) {
    return 5;
  }
  const parsed = parseInt(envValue.trim(), 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : 5;
}

export interface ReminderJobResult {
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Runs upcoming-deadline assessment reminder notifications.
 * Identifies active campaigns where deadline matches configured threshold (e.g. 3 or 1 days away),
 * excludes submitted/completed assessments, inactive staff, and suspended tenants.
 * Creates ASSESSMENT_DUE_REMINDER with dedupeKey.
 */
export async function runAssessmentReminderNotifications(
  options?: { now?: Date; reminderDays?: number[] }
): Promise<ReminderJobResult> {
  const now = options?.now || new Date();
  const reminderDays = options?.reminderDays || getAssessmentReminderDays();
  const result: ReminderJobResult = { processed: 0, created: 0, skipped: 0, errors: [] };

  for (const daysThreshold of reminderDays) {
    // Find active campaigns whose deadline is roughly `daysThreshold` days ahead
    // Window: from (daysThreshold - 1) days to (daysThreshold) days, or calendar day match
    const lowerBound = new Date(now.getTime() + (daysThreshold - 1) * 24 * 60 * 60 * 1000);
    const upperBound = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const assessments = await prisma.assessment.findMany({
      where: {
        status: { in: [AssessmentStatus.NOT_STARTED, AssessmentStatus.DRAFT] },
        campaign: {
          status: CampaignStatus.ACTIVE,
          deadline: {
            gt: lowerBound,
            lte: upperBound,
          },
          tenant: {
            status: { not: TenantStatus.SUSPENDED },
          },
        },
        user: {
          isActive: true,
        },
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            deadline: true,
            tenantId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    for (const assessment of assessments) {
      result.processed++;
      const dedupeKey = `assessment-due:${assessment.id}:${daysThreshold}`;

      // Check if already sent
      const existing = await prisma.notification.findUnique({
        where: { dedupeKey },
      });

      if (existing) {
        result.skipped++;
        continue;
      }

      try {
        const formattedDeadline = new Date(assessment.campaign.deadline).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        await createAndDispatchNotification({
          tenantId: assessment.campaign.tenantId,
          recipientId: assessment.user.id,
          type: NotificationType.ASSESSMENT_DUE_REMINDER,
          title: `Assessment Deadline Reminder: ${assessment.campaign.name}`,
          message: `Your assessment for "${assessment.campaign.name}" is due in ${daysThreshold} day${daysThreshold > 1 ? 's' : ''} on ${formattedDeadline}. Please complete and submit your self-assessment.`,
          href: `/staff/assessments/${assessment.id}`,
          resourceType: 'Assessment',
          resourceId: assessment.id,
          dedupeKey,
        });

        result.created++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Failed to send reminder for assessment ${assessment.id}: ${msg}`);
      }
    }
  }

  return result;
}

/**
 * Runs overdue corroboration reminders for managers.
 * Identifies assessments in PENDING_CORROBORATION whose submission date exceeds
 * the configured business-days threshold (default: 5 business days).
 * Excludes completed assessments, inactive managers, and suspended tenants.
 * Creates CORROBORATION_OVERDUE with dedupeKey.
 */
export async function runCorroborationReminderNotifications(
  options?: { now?: Date; thresholdBusinessDays?: number }
): Promise<ReminderJobResult> {
  const now = options?.now || new Date();
  const threshold = options?.thresholdBusinessDays || getCorroborationOverdueBusinessDays();
  const result: ReminderJobResult = { processed: 0, created: 0, skipped: 0, errors: [] };

  const pendingAssessments = await prisma.assessment.findMany({
    where: {
      status: AssessmentStatus.PENDING_CORROBORATION,
      campaign: {
        requiresCorroboration: true,
        tenant: {
          status: { not: TenantStatus.SUSPENDED },
        },
      },
      user: {
        isActive: true,
        managerId: { not: null },
        manager: {
          isActive: true,
        },
      },
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          tenantId: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              tenantId: true,
            },
          },
        },
      },
    },
  });

  for (const assessment of pendingAssessments) {
    if (!assessment.user.managerId || !assessment.user.manager) {
      continue;
    }

    const submissionDate = assessment.submittedAt || assessment.updatedAt;
    const businessDaysPassed = calculateBusinessDaysPassed(submissionDate, now);

    if (businessDaysPassed < threshold) {
      continue;
    }

    result.processed++;
    const dedupeKey = `reminder:overdue-corrob:${assessment.id}:threshold:${threshold}`;

    const existing = await prisma.notification.findUnique({
      where: { dedupeKey },
    });

    if (existing) {
      result.skipped++;
      continue;
    }

    try {
      await createAndDispatchNotification({
        tenantId: assessment.campaign.tenantId,
        recipientId: assessment.user.manager.id,
        type: NotificationType.CORROBORATION_OVERDUE,
        title: `Overdue Corroboration: ${assessment.user.name}`,
        message: `The assessment review for ${assessment.user.name} (${assessment.campaign.name}) is now ${businessDaysPassed} business days overdue. Please submit your corroboration.`,
        href: `/manager/corroborations/${assessment.id}`,
        resourceType: 'Assessment',
        resourceId: assessment.id,
        dedupeKey,
      });

      result.created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Failed to send overdue corroboration notification for assessment ${assessment.id}: ${msg}`);
    }
  }

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
