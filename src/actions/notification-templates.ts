'use server';

import { getCurrentUser } from '@/lib/auth/service';
import {
  updateNotificationTemplate,
  resetNotificationTemplate,
} from '@/services/notification-templates';
import { UserRole, NotificationType, NotificationChannel } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function updateNotificationTemplateAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.PLATFORM_ADMIN) {
    throw new Error('Unauthorized: Platform Administrator access required.');
  }

  const type = formData.get('type') as NotificationType;
  const channel = formData.get('channel') as NotificationChannel;
  const subject = formData.get('subject')?.toString() || null;
  const title = formData.get('title')?.toString() || null;
  const body = formData.get('body')?.toString();

  if (!type || !channel || !body) {
    throw new Error('Type, channel, and body are required.');
  }

  await updateNotificationTemplate(user.id, {
    type,
    channel,
    subject,
    title,
    body,
  });

  revalidatePath('/platform-admin/notification-templates');
}

export async function resetNotificationTemplateAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.PLATFORM_ADMIN) {
    throw new Error('Unauthorized: Platform Administrator access required.');
  }

  const type = formData.get('type') as NotificationType;
  const channel = formData.get('channel') as NotificationChannel;

  if (!type || !channel) {
    throw new Error('Type and channel are required.');
  }

  await resetNotificationTemplate(user.id, type, channel);

  revalidatePath('/platform-admin/notification-templates');
}
