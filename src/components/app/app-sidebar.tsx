'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { ConfirmDialog } from './confirm-dialog';

export interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  badge?: string | number;
  icon: React.ReactNode;
}

interface AppSidebarProps {
  role: UserRole;
  user: {
    name?: string | null;
    email: string;
    role: UserRole;
  };
  tenantName?: string | null;
  items: NavItem[];
  isOpen?: boolean;
  onClose?: () => void;
}

const ROLE_LABELS: Record<UserRole, { label: string; badgeBg: string; badgeText: string }> = {
  PLATFORM_ADMIN: { label: 'Platform Admin', badgeBg: 'bg-neutral-900', badgeText: 'text-white' },
  SUPPORT: { label: 'Support Agent', badgeBg: 'bg-stone-100 border border-stone-200/80', badgeText: 'text-stone-700' },
  ORGANIZATION_ADMIN: { label: 'Organization Admin', badgeBg: 'bg-stone-100 border border-stone-200/80', badgeText: 'text-stone-800' },
  MANAGER: { label: 'Team Manager', badgeBg: 'bg-stone-100 border border-stone-200/80', badgeText: 'text-stone-800' },
  STAFF: { label: 'Staff Member', badgeBg: 'bg-emerald-50 border border-emerald-200/80', badgeText: 'text-emerald-800' },
};

export function AppSidebar({
  role,
  user,
  tenantName,
  items,
  isOpen = false,
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const roleConfig = ROLE_LABELS[role] || { label: role, badgeBg: 'bg-stone-100', badgeText: 'text-stone-800' };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement>(null);

  const initials = user.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-stone-200/80 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 px-5 border-b border-stone-100 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center text-white shadow-2xs group-hover:bg-neutral-800 transition-colors">
                <svg
                  className="w-3.5 h-3.5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <span className="font-bold text-neutral-900 tracking-tight text-base">
                SkillsIQ
              </span>
            </Link>

            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleConfig.badgeBg} ${roleConfig.badgeText}`}>
              {roleConfig.label}
            </span>
          </div>

          {tenantName && (
            <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/50 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-stone-200 text-stone-700 flex items-center justify-center text-[10px] font-bold">
                {tenantName.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-neutral-700 truncate">
                {tenantName}
              </span>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-950 font-semibold shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-emerald-700' : 'text-stone-400 group-hover:text-neutral-700'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-emerald-200/80 text-emerald-900'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-stone-100 bg-stone-50/40">
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
              <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="truncate text-left">
                  <div className="text-xs font-semibold text-neutral-900 truncate">
                    {user.name || user.email.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate font-mono">
                    {user.email}
                  </div>
                </div>
              </div>

              <form ref={logoutFormRef} action="/api/auth/logout" method="POST" className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          logoutFormRef.current?.submit();
        }}
        title="Sign Out of SkillsIQ"
        description="Are you sure you want to end your current session? Any unsaved changes in active forms will not be retained."
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        variant="danger"
      />
    </>
  );
}
