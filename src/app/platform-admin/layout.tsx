import { ReactNode } from 'react';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { AppShell, PLATFORM_ADMIN_NAV } from '@/components/app';
import { SupportImpersonationBanner } from '@/components/layout/support-impersonation-banner';

export default async function PlatformAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(UserRole.PLATFORM_ADMIN);

  return (
    <AppShell
      role={UserRole.PLATFORM_ADMIN}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      items={PLATFORM_ADMIN_NAV}
      banner={<SupportImpersonationBanner />}
    >
      {children}
    </AppShell>
  );
}
