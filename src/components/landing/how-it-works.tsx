import React from 'react';

export function LandingHowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Configure Framework & Taxonomy',
      description:
        'Adopt curated industry templates (Technology SaaS, FinTech, Healthcare) or create custom technical and behavioral competencies with tailored weightings.',
    },
    {
      step: '02',
      title: 'Define Role Profiles & Launch',
      description:
        'Establish benchmark target levels for every role profile. Launch scoped campaigns (Org, Team, or Individual) with deadline windows and automated reminders.',
    },
    {
      step: '03',
      title: 'Assess, Upload Evidence & Review',
      description:
        'Staff evaluate competencies against clear level descriptors with written evidence and work sample uploads. Direct managers corroborate ratings with audited rationales.',
    },
    {
      step: '04',
      title: 'Analyze Gaps & Accelerate Growth',
      description:
        'Access immediate gap analysis scoring, generate Excel workbooks, map step-by-step career path progression, and assign targeted learning resources.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white border-t border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            End-to-End Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mt-2.5">
            How the platform works in 4 simple steps
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base mt-3.5 leading-relaxed">
            From framework configuration to promotion readiness, every step is structured, repeatable, and audit-ready.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((item, index) => (
            <div
              key={item.step}
              className="p-6 rounded-2xl border border-stone-200 bg-[#faf9f6]/40 hover:bg-[#faf9f6] transition-all flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-2xl font-bold text-neutral-300 group-hover:text-neutral-900 transition-colors">
                    {item.step}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-xs font-bold text-neutral-700 shadow-2xs">
                    {index + 1}
                  </div>
                </div>

                <h3 className="text-base font-semibold text-neutral-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-stone-200/60 flex items-center gap-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Phase {item.step} Complete
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
