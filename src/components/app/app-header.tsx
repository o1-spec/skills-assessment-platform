'use client';

import React from 'react';
import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { NotificationBell } from '@/components/notifications';

interface AppHeaderProps {
  role: UserRole;
  user: {
    name?: string | null;
    email: string;
    role: UserRole;
  };
  tenantName?: string | null;
  onOpenMobileMenu?: () => void;
}

export function AppHeader({
  role,
  user,
  tenantName,
  onOpenMobileMenu,
}: AppHeaderProps) {
  const isOrgAdmin = role === UserRole.ORGANIZATION_ADMIN;

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#faf9f6]/95 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl border border-stone-200 text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors"
          aria-label="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-neutral-800 truncate">
            {tenantName ? tenantName : 'SkillsIQ Workspace'}
          </span>
          {tenantName && (
            <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-200/60 text-stone-600">
              Enterprise Tenant
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isOrgAdmin && (
          <Link
            href="/organization-admin/search"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200/80 bg-white text-xs text-neutral-500 hover:text-neutral-800 hover:border-stone-300 transition-colors shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search people & skills...</span>
            <kbd className="text-[10px] font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 text-stone-500">
              ⌘K
            </kbd>
          </Link>
        )}

        {role !== UserRole.PLATFORM_ADMIN && role !== UserRole.SUPPORT && (
          <NotificationBell />
        )}

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-stone-200/80">
          <div className="text-right">
            <div className="text-xs font-semibold text-neutral-900 leading-tight">
              {user.name || user.email.split('@')[0]}
            </div>
            <div className="text-[10px] text-neutral-500 capitalize">
              {role.toLowerCase().replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
