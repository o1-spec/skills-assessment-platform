import { ReactNode } from 'react';
import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { AppShell, NavItem } from '@/components/app';
import { SupportImpersonationBanner } from '@/components/layout/support-impersonation-banner';

export const MANAGER_NAV: NavItem[] = [
  {
    label: 'Team Dashboard',
    href: '/manager',
    exact: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Corroborations',
    href: '/manager/corroborations',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.MANAGER) {
    redirect(getRoleDashboardPath(user.role));
  }

  return (
    <AppShell
      role={UserRole.MANAGER}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      tenantName={user.tenant?.name}
      items={MANAGER_NAV}
      banner={<SupportImpersonationBanner />}
    >
      {children}
    </AppShell>
  );
}
