import React from 'react';

export function AuthBrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-[#faf9f6] border-r border-stone-200/80 overflow-hidden min-h-160">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-linear-to-tr from-emerald-100/50 via-teal-50/60 to-purple-100/40 blur-3xl rounded-full pointer-events-none -z-10" />

      <div className="space-y-6 max-w-lg z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-neutral-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Workforce Skills Intelligence</span>
        </div>

        <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-neutral-900 leading-[1.18]">
          Measure capability with evidence,{' '}
          <span className="text-neutral-500 font-normal">not assumptions.</span>
        </h2>

        <p className="text-sm xl:text-base text-neutral-600 leading-relaxed">
          SkillsIQ helps organizations define role expectations, assess workforce capabilities,
          identify gaps, and support transparent career development.
        </p>
      </div>

      <div className="space-y-3.5 my-10 max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-stone-200 shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-sm">
              🎯
            </div>
            <div>
              <div className="font-semibold text-neutral-900">Campaign Launched</div>
              <div className="text-neutral-500">Acme Q3 Engineering Cycle</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            94% enrolled
          </span>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700 text-sm">
              📊
            </div>
            <div>
              <div className="font-semibold text-neutral-900">Gap Analysis Ready</div>
              <div className="text-neutral-500">Multi-Competency Delta Matrix</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-stone-100 text-stone-800 border border-stone-200/80">
            12 development gaps
          </span>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700 text-sm">
              🧭
            </div>
            <div>
              <div className="font-semibold text-neutral-900">Career Progression</div>
              <div className="text-neutral-500">Track: IC Engineering</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-stone-100 text-stone-800 border border-stone-200/80">
            Backend → Senior
          </span>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-stone-200 shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-sm">
              ✍️
            </div>
            <div>
              <div className="font-semibold text-neutral-900">Manager Review</div>
              <div className="text-neutral-500">Audited Corroboration Queue</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            3 pending
          </span>
        </div>
      </div>

      <div className="pt-6 border-t border-stone-200/80 flex items-center justify-between text-xs text-neutral-500 z-10">
        <span>SFIA 1.0 Aligned</span>
        <span>•</span>
        <span>Row-Level Tenant Isolation</span>
        <span>•</span>
        <span>Audit-Ready Logging</span>
      </div>
    </div>
  );
}
