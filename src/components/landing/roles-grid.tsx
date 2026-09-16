import React from 'react';
import Link from 'next/link';

export function LandingRolesGrid() {
  const roles = [
    {
      role: 'Platform Admin',
      badge: 'SaaS Operator',
      demoEmail: 'platform@skills.test',
      description:
        'Controls canonical framework taxonomies, freezes immutable versions, manages starter industry templates, provisions client tenants, and oversees the global security audit trail.',
      features: [
        'Canonical SFIA 1.0 Framework & Level Authoring',
        'Industry Template Packaging (Tech, FinTech, Health)',
        'Tiered Subscription Plans & Seat Limit Caps',
        'Cross-Tenant Usage Analytics & Global Audit Viewer',
      ],
      portalLink: '/platform-admin',
    },
    {
      role: 'Organization Admin',
      badge: 'Talent & HR Leader',
      demoEmail: 'admin@acme.test',
      description:
        'Designs organizational role profiles, sets benchmark competency levels, launches scoped assessment campaigns, schedules automated capability reports, and exports genuine .xlsx workbooks.',
      features: [
        'Role Profile Builder with Technical/Behavioral Targets',
        'Campaign Lifecycle Scheduling & Opening Windows',
        'Bulk CSV Employee Import with Auto-Onboarding',
        'Scheduled Reporting Engine & Multi-Sheet Excel Exports',
      ],
      portalLink: '/organization-admin',
    },
    {
      role: 'Team Manager',
      badge: 'Engineering Lead',
      demoEmail: 'manager@acme.test',
      description:
        'Reviews direct reports’ submitted evaluations, examines attached work samples, enforces mandatory justifications when adjusting ratings, and inspects the team capability heatmap.',
      features: [
        'Corroboration Review Queue with Real-Time Badging',
        'Justification Rule Enforcement on Rating Discrepancy',
        'Interactive Team Competency Matrix Heatmap',
        'Capability Deficiencies & Mentorship Guidance',
      ],
      portalLink: '/manager',
    },
    {
      role: 'Staff Member',
      badge: 'Employee / Engineer',
      demoEmail: 'staff@acme.test',
      description:
        'Completes self-assessments against descriptive level criteria, uploads private evidence artifacts, tracks personal skill history, and maps directional career growth.',
      features: [
        'Evidence-Based Self-Evaluations (Levels 1–5+)',
        'Private Cloud Evidence Attachment Uploads',
        'Personal Verified Skills Profile & Radar Comparison',
        'Career Path Progression Ladders & Learning Links',
      ],
      portalLink: '/staff',
    },
  ];

  return (
    <section id="roles" className="py-20 bg-[#faf9f6] border-t border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Multi-Portal Experience
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mt-2.5">
            Engineered specifically for every role
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base mt-3.5 leading-relaxed">
            Strict row-level multi-tenant isolation and role guards ensure that every stakeholder gets a focused, distraction-free workspace.
          </p>
        </div>

        {/* 4 Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {roles.map((item) => (
            <div
              key={item.role}
              className="p-6 sm:p-7 rounded-2xl bg-white border border-stone-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:border-stone-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-neutral-900">
                    {item.role}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-stone-100 text-neutral-700 border border-stone-200">
                    {item.badge}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-5">
                  {item.description}
                </p>

                <div className="space-y-2 pt-4 border-t border-stone-100">
                  <div className="text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
                    Key Workflows
                  </div>
                  {item.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-neutral-600">
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo Login Quick-Fill Prompt */}
              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                <div className="text-neutral-500 font-mono">
                  Demo: <span className="font-semibold text-neutral-800">{item.demoEmail}</span>
                </div>
                <Link
                  href="/login"
                  className="font-semibold text-neutral-900 hover:text-neutral-700 hover:underline flex items-center gap-1"
                >
                  <span>Test portal</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
