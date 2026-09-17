import { ReactNode } from 'react';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { AppShell, ORG_ADMIN_NAV } from '@/components/app';
import { SupportImpersonationBanner } from '@/components/layout/support-impersonation-banner';

export default async function OrganizationAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);

  return (
    <AppShell
      role={UserRole.ORGANIZATION_ADMIN}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      tenantName={user.tenant?.name}
      items={ORG_ADMIN_NAV}
      banner={<SupportImpersonationBanner />}
    >
      {children}
    </AppShell>
  );
}
