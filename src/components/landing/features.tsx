import React from 'react';

export function LandingFeatures() {
  const features = [
    {
      id: 'assessments',
      badge: 'Evidence-Backed',
      title: 'Structured Skill Assessments',
      description:
        'Run comprehensive self-assessments mapped against descriptive 5-level SFIA criteria. Staff back up ratings with written rationales and verified file attachments.',
      icon: (
        <svg className="w-5 h-5 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'roles',
      badge: 'Defensible Benchmarks',
      title: 'Role Profile Benchmarks',
      description:
        'Author standardized role profiles with explicit proficiency targets for both technical and behavioral competencies across every seniority tier.',
      icon: (
        <svg className="w-5 h-5 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'gap-analysis',
      badge: 'Mathematical Scrutiny',
      title: 'Instant Gap Analysis',
      description:
        'Automatically calculate employee proficiency deltas against role requirements. Uncover critical skill deficiencies, role readiness, and team capability heatmaps.',
      icon: (
        <svg className="w-5 h-5 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'career-growth',
      badge: 'Transparent Mobility',
      title: 'Career Paths & Learning',
      description:
        'Connect assessment outcomes to directional advancement ladders. View exact milestone deltas required for promotion alongside targeted learning resources.',
      icon: (
        <svg className="w-5 h-5 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" className="py-20 bg-white border-t border-stone-200/80 scroll-mt-16 sm:scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Core Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mt-2.5">
            Everything you need to run skills assessments at scale
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base mt-3.5 leading-relaxed">
            Eliminate subjective reviews and gut feeling. Transform talent management into a structured, evidence-based discipline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="p-6 rounded-2xl border border-stone-200/90 bg-[#faf9f6]/60 hover:bg-[#faf9f6] hover:border-stone-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 shadow-2xs flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-stone-100 text-neutral-600 border border-stone-200/60">
                    {feature.badge}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-neutral-900">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-stone-200/60 flex items-center gap-1.5 text-xs font-semibold text-neutral-900 group cursor-pointer">
                <span>Explore capability</span>
                <svg className="w-3.5 h-3.5 text-neutral-500 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
