'use client';

import React, { useState } from 'react';
import { UserRole } from '@prisma/client';
import { AppSidebar, NavItem } from './app-sidebar';
import { AppHeader } from './app-header';

interface AppShellProps {
  role: UserRole;
  user: {
    name?: string | null;
    email: string;
    role: UserRole;
  };
  tenantName?: string | null;
  items: NavItem[];
  banner?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  role,
  user,
  tenantName,
  items,
  banner,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-neutral-900 flex selection:bg-neutral-900 selection:text-white">
      <AppSidebar
        role={role}
        user={user}
        tenantName={tenantName}
        items={items}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {banner}

        <AppHeader
          role={role}
          user={user}
          tenantName={tenantName}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
