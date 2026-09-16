import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limitParam = parseInt(searchParams.get('limit') || '20', 10);
  const offsetParam = parseInt(searchParams.get('offset') || '0', 10);

  const result = await getNotificationsForUser(user.id, user.tenantId, {
    unreadOnly,
    limit: isNaN(limitParam) ? 20 : limitParam,
    offset: isNaN(offsetParam) ? 0 : offsetParam,
  });

  return NextResponse.json({
    notifications: result.notifications,
    total: result.total,
    unreadCount: result.unreadCount,
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.markAll === true) {
      const updatedCount = await markAllNotificationsRead(user.id, user.tenantId);
      const unreadCount = await getUnreadNotificationCount(user.id, user.tenantId);
      return NextResponse.json({ success: true, updatedCount, unreadCount });
    }

    if (body.notificationId && typeof body.notificationId === 'string') {
      const updated = await markNotificationRead(body.notificationId, user.id);
      const unreadCount = await getUnreadNotificationCount(user.id, user.tenantId);
      return NextResponse.json({ success: true, notification: updated, unreadCount });
    }

    return NextResponse.json(
      { error: 'Invalid request. Specify notificationId or markAll: true' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update notification';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
