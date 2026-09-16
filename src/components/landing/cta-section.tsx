import React from 'react';
import Link from 'next/link';

export function LandingCTA() {
  return (
    <section className="py-20 bg-white border-t border-stone-200/80 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-neutral-900 text-white p-8 sm:p-12 md:p-16 overflow-hidden shadow-2xl text-center">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-800 text-emerald-400 border border-neutral-700 mb-5">
              <span>✦</span>
              <span>Ready for Evaluation & Deployment</span>
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Start building a more skill-aware organization
            </h2>

            <p className="mt-4 text-sm sm:text-base text-neutral-300 leading-relaxed max-w-xl mx-auto">
              Empower your teams with transparent progression, defensible benchmarking, and evidence-based talent capability intelligence.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold text-neutral-900 bg-white rounded-full hover:bg-neutral-100 transition-all shadow-md active:scale-[0.98]"
              >
                <span>Get started with Demo</span>
                <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-medium text-white border border-neutral-700 bg-neutral-800/80 rounded-full hover:bg-neutral-800 transition-all"
              >
                <span>Sign in to Workspace</span>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>Pre-seeded with Canonical SFIA 1.0</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>5 Preconfigured Demo Accounts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>Production-Ready Next.js 16</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
