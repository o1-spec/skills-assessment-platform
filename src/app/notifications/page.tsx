import { redirect } from 'next/navigation';
import { getCurrentUser, getRoleDashboardPath } from '@/lib/auth';
import { getNotificationsForUser } from '@/services/notifications';
import { NotificationsView } from './notifications-view';

export const metadata = {
  title: 'Notifications | Skills Assessment Platform',
  description: 'View and manage your account and workflow notifications.',
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const dashboardHref = getRoleDashboardPath(user.role);
  const result = await getNotificationsForUser(user.id, user.tenantId, { limit: 50 });

  const serializedNotifications = result.notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    href: n.href,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
    type: n.type,
  }));

  return (
    <NotificationsView
      initialNotifications={serializedNotifications}
      initialTotal={result.total}
      initialUnreadCount={result.unreadCount}
      dashboardHref={dashboardHref}
      userName={user.name}
    />
  );
}
