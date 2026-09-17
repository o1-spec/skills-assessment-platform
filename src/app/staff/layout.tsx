import { ReactNode } from 'react';
import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { AppShell, STAFF_NAV } from '@/components/app';
import { SupportImpersonationBanner } from '@/components/layout/support-impersonation-banner';

export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    redirect(getRoleDashboardPath(user.role));
  }

  return (
    <AppShell
      role={UserRole.STAFF}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      tenantName={user.tenant?.name}
      items={STAFF_NAV}
      banner={<SupportImpersonationBanner />}
    >
      {children}
    </AppShell>
  );
}
