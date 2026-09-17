import { ReactNode } from 'react';
import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { AppShell, NavItem } from '@/components/app';
import { SupportImpersonationBanner } from '@/components/layout/support-impersonation-banner';

export const SUPPORT_NAV: NavItem[] = [
  {
    label: 'Troubleshooting Sessions',
    href: '/support',
    exact: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

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
