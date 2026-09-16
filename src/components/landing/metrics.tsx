import React from 'react';

export function LandingMetrics() {
  const metrics = [
    {
      stat: '100%',
      label: 'Multi-Tenant Logical Isolation',
      detail: 'Mandatory tenantId query scoping and boundary guards across all 43 tables.',
    },
    {
      stat: '5',
      label: 'Dedicated Role Portals',
      detail: 'Tailored workspaces for Platform Admin, Org Admin, Manager, Staff, and Support.',
    },
    {
      stat: '840 / 840',
      label: 'Automated Integration Tests',
      detail: '100% passing across 22 comprehensive backend test suites covering all workflows.',
    },
    {
      stat: '0-Leak',
      label: 'Tamper-Evident Audit Trail',
      detail: 'Sensitive parameter scrubbing (passwords, tokens) before append-only logging.',
    },
  ];

  return (
    <section id="trust" className="py-20 bg-[#faf9f6] border-t border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Architectural Guarantees
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mt-2.5">
            Engineered for enterprise scale & mathematical rigor
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base mt-3.5 leading-relaxed">
            Built from first principles on PostgreSQL and Next.js 16 to ensure high throughput, zero cross-tenant leakage, and reproducible evaluations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-stone-200 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between"
            >
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-mono">
                  {item.stat}
                </div>
                <h3 className="text-sm font-semibold text-neutral-800 mt-2">
                  {item.label}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mt-3 pt-3 border-t border-stone-100 leading-relaxed">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
