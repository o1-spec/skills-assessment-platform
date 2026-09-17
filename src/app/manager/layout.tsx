import { ReactNode } from 'react';
import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { AppShell, MANAGER_NAV } from '@/components/app';
import { SupportImpersonationBanner } from '@/components/layout/support-impersonation-banner';

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
