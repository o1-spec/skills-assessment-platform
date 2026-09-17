'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';

const emptySubscribe = () => () => {};

export function PlatformAdminQuickStartCard() {
  const [userDismissed, setUserDismissed] = useState(false);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isStoredDismissed = isClient && typeof window !== 'undefined'
    ? localStorage.getItem('skillsiq_platform_onboarding_dismissed') === 'true'
    : false;

  const dismissed = userDismissed || isStoredDismissed;

  const handleDismiss = () => {
    localStorage.setItem('skillsiq_platform_onboarding_dismissed', 'true');
    setUserDismissed(true);
  };

  if (!isClient || dismissed) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/80 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 flex items-center justify-center text-white font-bold">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Platform Admin Quick Start
              </span>
              <span className="text-[11px] text-neutral-400">&bull; Multi-Tenant Control Plane</span>
            </div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight mt-0.5">
              SaaS Operations & Tenant Lifecycle Management
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          Dismiss
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60">
          <div className="text-xs font-bold text-neutral-900">1. Provision New Organization</div>
          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
            Create tenant instances, set user seat caps, enforce plan limits, and invite primary Organization Admins.
          </p>
          <div className="mt-2.5">
            <Link href="/platform-admin/tenants/new" className="text-[11px] font-semibold text-neutral-900 hover:underline">
              Provision Tenant &rarr;
            </Link>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60">
          <div className="text-xs font-bold text-neutral-900">2. Canonical Frameworks</div>
          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
            Author and publish master global competency frameworks that customer tenants can adopt or tailor.
          </p>
          <div className="mt-2.5">
            <Link href="/platform-admin/frameworks" className="text-[11px] font-semibold text-neutral-900 hover:underline">
              Manage Frameworks &rarr;
            </Link>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60">
          <div className="text-xs font-bold text-neutral-900">3. Platform Audit Logs</div>
          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
            Inspect platform-wide immutable security logs, role upgrades, tenant creation, and impersonation history.
          </p>
          <div className="mt-2.5">
            <Link href="/platform-admin/audit" className="text-[11px] font-semibold text-neutral-900 hover:underline">
              View Audit Trail &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
