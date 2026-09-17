'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';

const emptySubscribe = () => () => {};

export function StaffOnboardingTour() {
  const [userDismissed, setUserDismissed] = useState(false);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isStoredDismissed = isClient && typeof window !== 'undefined'
    ? localStorage.getItem('skillsiq_staff_onboarding_dismissed') === 'true'
    : false;

  const dismissed = userDismissed || isStoredDismissed;

  const handleDismiss = () => {
    localStorage.setItem('skillsiq_staff_onboarding_dismissed', 'true');
    setUserDismissed(true);
  };

  if (!isClient || dismissed) {
    return null;
  }

  const steps = [
    {
      number: '01',
      title: 'Complete Self-Rating',
      desc: 'Evaluate each competency from Level 1 (Foundational) to Level 5 (Mastery) based on your real experience.',
    },
    {
      number: '02',
      title: 'Provide Context & Evidence',
      desc: 'Write notes explaining your rating and attach supporting proof (documents, URLs, or certifications).',
    },
    {
      number: '03',
      title: 'Submit for Manager Review',
      desc: 'Save drafts as you go. Once submitted, your manager corroborates your ratings to finalize your verified skills profile.',
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/80 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Staff Quick Start
              </span>
              <span className="text-[11px] text-neutral-400">&bull; 3-Step Walkthrough</span>
            </div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight mt-0.5">
              How Assessments Work at SkillsIQ
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
        {steps.map((s) => (
          <div key={s.number} className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60">
            <div className="text-xs font-mono font-bold text-emerald-700">{s.number}</div>
            <h3 className="text-xs font-bold text-neutral-900 mt-1">{s.title}</h3>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-neutral-500">
        <span>Tip: You can update your self-evaluation any time before final submission.</span>
        <div className="flex items-center gap-4">
          <Link
            href="/staff/skills"
            className="font-semibold text-emerald-700 hover:underline"
          >
            Explore Skills Profile &rarr;
          </Link>
          <Link
            href="/staff/career-paths"
            className="font-semibold text-neutral-700 hover:underline"
          >
            View Career Paths &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
