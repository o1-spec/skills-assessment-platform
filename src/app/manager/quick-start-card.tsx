'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function ManagerQuickStartCard() {
  const [dismissed, setDismissed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('skillsiq_manager_onboarding_dismissed') === 'true';
    setDismissed(isDismissed);
    setIsLoaded(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('skillsiq_manager_onboarding_dismissed', 'true');
    setDismissed(true);
  };

  if (!isLoaded || dismissed) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/80 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-neutral-800 font-bold">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Manager Overview
              </span>
              <span className="text-[11px] text-neutral-400">&bull; Team Oversight Guide</span>
            </div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight mt-0.5">
              Team Skills Verification & Capability Matrix
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
          <div className="text-xs font-bold text-neutral-900">1. Corroboration Queue</div>
          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
            Review self-evaluations submitted by your direct reports. Agree with their self-rating or adjust with verified ratings and corroboration notes.
          </p>
          <div className="mt-2.5">
            <Link href="/manager/corroborations" className="text-[11px] font-semibold text-emerald-700 hover:underline">
              Go to Corroborations &rarr;
            </Link>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60">
          <div className="text-xs font-bold text-neutral-900">2. Team Capability Heatmap</div>
          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
            Inspect competency distributions across all direct reports. Identify team strengths, coverage ratios, and skill clusters.
          </p>
          <div className="mt-2.5">
            <Link href="/manager/direct-reports" className="text-[11px] font-semibold text-emerald-700 hover:underline">
              View Direct Reports &rarr;
            </Link>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60">
          <div className="text-xs font-bold text-neutral-900">3. Target Level Deficits</div>
          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
            Spot gaps where verified team ratings are below role profile targets to guide career coaching, 1-on-1s, and targeted training.
          </p>
        </div>
      </div>
    </div>
  );
}
