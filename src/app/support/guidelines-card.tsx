'use client';

import { useState, useEffect } from 'react';

export function SupportGuidelinesCard() {
  const [dismissed, setDismissed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('skillsiq_support_guidelines_dismissed') === 'true';
    setDismissed(isDismissed);
    setIsLoaded(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('skillsiq_support_guidelines_dismissed', 'true');
    setDismissed(true);
  };

  if (!isLoaded || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50/60 rounded-3xl p-6 shadow-xs border border-amber-200/80 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-200/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100/80 border border-amber-300/80 flex items-center justify-center text-amber-900 font-bold">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Support Protocol Guide
              </span>
              <span className="text-[11px] text-amber-700">&bull; Scoped Impersonation & Audit</span>
            </div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight mt-0.5">
              Troubleshooting Guidelines & Compliance
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-xl border border-amber-200 bg-white/80 hover:bg-white transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          Dismiss
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="p-4 rounded-2xl bg-white/80 border border-amber-200/70">
          <div className="text-xs font-bold text-neutral-900">1. Mandatory Ticket Reference</div>
          <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
            Every impersonation session requires an authorized support ticket reference or reason before entering the customer tenant.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 border border-amber-200/70">
          <div className="text-xs font-bold text-neutral-900">2. Tamper-Evident Audit Logging</div>
          <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
            All operations executed under customer impersonation are indelibly tagged with your support identity, client IP, and timestamp.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 border border-amber-200/70">
          <div className="text-xs font-bold text-neutral-900">3. Immediate Session Termination</div>
          <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
            Exit troubleshooting mode immediately once the investigation is concluded using the persistent header action banner.
          </p>
        </div>
      </div>
    </div>
  );
}
