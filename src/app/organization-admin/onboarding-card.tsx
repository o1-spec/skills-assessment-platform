'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrgAdminOnboardingProps {
  tenantName: string;
  hasRoleProfiles: boolean;
  hasCampaigns: boolean;
  hasUsers: boolean;
  hasFramework: boolean;
}

export function OrgAdminOnboardingCard({
  tenantName,
  hasRoleProfiles,
  hasCampaigns,
  hasUsers,
  hasFramework,
}: OrgAdminOnboardingProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('skillsiq_orgadmin_onboarding_dismissed') === 'true';
    setDismissed(isDismissed);
    setIsLoaded(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('skillsiq_orgadmin_onboarding_dismissed', 'true');
    setDismissed(true);
  };

  const steps = [
    {
      id: 'profile',
      title: 'Configure Organization Profile',
      desc: 'Verify organization branding, address, and notification rules.',
      href: '/organization-admin/organization',
      done: true,
    },
    {
      id: 'framework',
      title: 'Adopt Skills Framework',
      desc: 'Import industry standard competencies or build customized libraries.',
      href: '/organization-admin/skills',
      done: hasFramework,
    },
    {
      id: 'users',
      title: 'Invite Team & Structure Departments',
      desc: 'Onboard managers and staff members to populate your organizational directory.',
      href: '/organization-admin/users',
      done: hasUsers,
    },
    {
      id: 'roles',
      title: 'Define Role Profiles & Target Levels',
      desc: 'Map required competencies (L1-L5) for critical job roles.',
      href: '/organization-admin/roles',
      done: hasRoleProfiles,
    },
    {
      id: 'campaign',
      title: 'Launch First Assessment Campaign',
      desc: 'Trigger self-evaluations and manager corroborations across teams.',
      href: '/organization-admin/campaigns/new',
      done: hasCampaigns,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (!isLoaded || dismissed) {
    return null;
  }

  return (
    <div className="bg-linear-to-br from-stone-900 via-neutral-900 to-stone-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-neutral-800/80 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Setup Guide
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                {tenantName} Quick Launch
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1.5 tracking-tight">
              Welcome to SkillsIQ Organization Setup
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Follow these core milestones to configure your skills framework, onboard employees, and begin capability analysis.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-400">
                {completedCount} of {steps.length} Complete
              </div>
              <div className="w-32 bg-neutral-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer border border-neutral-700/60"
            >
              Dismiss
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
          {steps.map((step, idx) => (
            <Link
              key={step.id}
              href={step.href}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group ${step.done
                  ? 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700'
                  : 'bg-neutral-900/90 border-neutral-700/70 hover:border-emerald-500/50 hover:bg-neutral-800/80'
                }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Step {idx + 1}
                  </span>
                  {step.done ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      Done
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-800 text-neutral-300 border border-neutral-700">
                      Pending
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-white mt-2 group-hover:text-emerald-400 transition-colors">
                  {step.title}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] font-semibold text-neutral-400 group-hover:text-white">
                <span>{step.done ? 'Review Settings' : 'Configure Now'}</span>
                <span className="text-stone-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
