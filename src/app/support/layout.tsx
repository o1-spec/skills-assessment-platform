import { ReactNode } from 'react';
import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { AppShell, SUPPORT_NAV } from '@/components/app';
import { SupportImpersonationBanner } from '@/components/layout/support-impersonation-banner';

export default async function SupportLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(UserRole.SUPPORT);
  if (!user) redirect('/login');

  return (
    <AppShell
      role={UserRole.SUPPORT}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      items={SUPPORT_NAV}
      banner={<SupportImpersonationBanner />}
    >
      {children}
    </AppShell>
  );
}
