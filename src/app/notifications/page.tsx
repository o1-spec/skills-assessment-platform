import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { getCurrentUser, getRoleDashboardPath } from '@/lib/auth';
import { getNotificationsForUser } from '@/services/notifications';
import { prisma } from '@/lib/db';
import {
  AppShell,
  NavItem,
  ORG_ADMIN_NAV,
  PLATFORM_ADMIN_NAV,
  MANAGER_NAV,
  STAFF_NAV,
  SUPPORT_NAV,
} from '@/components/app';
import { SupportImpersonationBanner } from '@/components/layout/support-impersonation-banner';
import { NotificationsView } from './notifications-view';

export const metadata = {
  title: 'Notifications | Skills Assessment Platform',
  description: 'View and manage your account and workflow notifications.',
};

function getNavForRole(role: UserRole): NavItem[] {
  switch (role) {
    case UserRole.PLATFORM_ADMIN:
      return PLATFORM_ADMIN_NAV;
    case UserRole.ORGANIZATION_ADMIN:
      return ORG_ADMIN_NAV;
    case UserRole.MANAGER:
      return MANAGER_NAV;
    case UserRole.STAFF:
      return STAFF_NAV;
    case UserRole.SUPPORT:
      return SUPPORT_NAV;
    default:
      return [];
  }
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const dashboardHref = getRoleDashboardPath(user.role);
  const result = await getNotificationsForUser(user.id, user.tenantId, { limit: 50 });

  let tenantName: string | null = null;
  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });
    tenantName = tenant?.name || null;
  }

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
    <AppShell
      role={user.role}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      tenantName={tenantName}
      items={getNavForRole(user.role)}
      banner={<SupportImpersonationBanner />}
    >
      <NotificationsView
        initialNotifications={serializedNotifications}
        initialTotal={result.total}
        initialUnreadCount={result.unreadCount}
        dashboardHref={dashboardHref}
      />
    </AppShell>
  );
}
