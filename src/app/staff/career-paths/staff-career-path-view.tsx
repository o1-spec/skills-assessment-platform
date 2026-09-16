'use client';

import Link from 'next/link';
import { CompetencyType, RoleProfile } from '@prisma/client';
import { StaffCareerPathViewData, StaffCareerProgressionStatus } from '@/services/career-paths';

interface StaffCareerPathViewProps {
  userHasRoleProfile: boolean;
  userRoleProfile: Pick<RoleProfile, 'id' | 'name' | 'description'> | null;
  availablePaths: Array<{ id: string; name: string; description: string | null }>;
  selectedPathData: StaffCareerPathViewData | null;
}

export function StaffCareerPathView({
  userHasRoleProfile,
  userRoleProfile,
  availablePaths,
  selectedPathData,
}: StaffCareerPathViewProps) {
  if (!userHasRoleProfile || !userRoleProfile) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center shadow-xs">
        <div className="mx-auto w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 border border-amber-200/60">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-neutral-900">No Role Profile Assigned</h2>
        <p className="mt-2 text-sm text-stone-500 max-w-md mx-auto">
          No role profile is currently assigned to your account. Career progression pathways are mapped to your active job role. Please contact your organization administrator to assign your role.
        </p>
      </div>
    );
  }

  if (!selectedPathData && availablePaths.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Your Assigned Role</span>
            <h2 className="text-lg font-bold text-neutral-900 mt-0.5">{userRoleProfile.name}</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 mb-4 border border-stone-200/60">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No Published Career Paths</h2>
          <p className="mt-2 text-sm text-stone-500 max-w-md mx-auto">
            Your organization has not published any career progression tracks yet.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedPathData) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Your Assigned Role</span>
            <h2 className="text-lg font-bold text-neutral-900 mt-0.5">{userRoleProfile.name}</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-8 shadow-xs space-y-4">
          <div className="rounded-xl bg-stone-100 border border-stone-200 p-4 text-sm text-stone-800 font-medium">
            No published career path currently includes your role ({userRoleProfile.name}).
          </div>

          <h3 className="text-sm font-bold text-neutral-900 pt-2">Explore Other Published Career Paths:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availablePaths.map((p) => (
              <Link
                key={p.id}
                href={`/staff/career-paths?pathId=${p.id}`}
                className="p-5 rounded-xl border border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50 transition-colors"
              >
                <div className="font-bold text-sm text-neutral-900">{p.name}</div>
                {p.description && (
                  <div className="text-xs text-stone-500 mt-1 line-clamp-2">{p.description}</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isRoleInCurrentPath = selectedPathData.currentRoleIndex !== -1;
  const isHighestStep = isRoleInCurrentPath && !selectedPathData.nextRole;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            Your Assigned Role
          </span>
          <h2 className="text-xl font-bold text-neutral-900 mt-1">{userRoleProfile.name}</h2>
          {userRoleProfile.description && (
            <p className="text-xs text-stone-500 mt-1 max-w-xl leading-relaxed">{userRoleProfile.description}</p>
          )}
        </div>

        {availablePaths.length > 1 && (
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-medium text-stone-500">Path:</span>
            <div className="flex flex-wrap gap-1.5">
              {availablePaths.map((p) => (
                <Link
                  key={p.id}
                  href={`/staff/career-paths?pathId=${p.id}`}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    p.id === selectedPathData.careerPath.id
                      ? 'bg-neutral-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200/60'
                  }`}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{selectedPathData.careerPath.name}</h1>
        {selectedPathData.careerPath.description && (
          <p className="text-sm text-stone-600">{selectedPathData.careerPath.description}</p>
        )}
      </div>

      {!isRoleInCurrentPath && (
        <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-4 text-xs font-medium text-amber-800">
          Note: Your assigned role ({userRoleProfile.name}) is not part of this pathway. You are currently browsing this path for career exploration.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-neutral-900">Career Pathway Sequence</h2>

        <div className="flex flex-col md:flex-row items-stretch gap-4 pt-2">
          {selectedPathData.steps.map((step, idx) => {
            let cardStyle = 'border-stone-200/80 bg-stone-50/50 text-stone-700';
            let badgeText = `Step ${idx + 1}`;
            let badgeStyle = 'bg-stone-200 text-stone-700';

            if (step.isCurrentRole) {
              cardStyle = 'border-neutral-900 bg-white ring-2 ring-neutral-900 shadow-xs';
              badgeText = 'You Are Here';
              badgeStyle = 'bg-neutral-900 text-white';
            } else if (step.isNextRole) {
              cardStyle = 'border-emerald-500 bg-emerald-50/30 shadow-xs';
              badgeText = 'Next Milestone';
              badgeStyle = 'bg-emerald-600 text-white';
            } else if (step.isPastRole) {
              cardStyle = 'border-stone-200/60 bg-stone-50/30 opacity-75';
              badgeText = 'Completed';
              badgeStyle = 'bg-stone-300 text-stone-800';
            }

            return (
              <div key={step.roleProfile.id} className="flex-1 flex flex-col items-center relative">
                <div className={`w-full p-5 rounded-xl border transition-all space-y-2 ${cardStyle}`}>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${badgeStyle}`}>
                      {badgeText}
                    </span>
                    <span className="text-[11px] text-stone-400 font-semibold">
                      Step {idx + 1}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      {step.roleProfile.name}
                    </h3>
                    {step.roleProfile.isArchived && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Archived Role
                      </span>
                    )}
                    {step.roleProfile.description && (
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                        {step.roleProfile.description}
                      </p>
                    )}
                  </div>
                </div>

                {idx < selectedPathData.steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center rounded-full bg-white border border-stone-200 text-stone-400 text-xs">
                    &rarr;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isRoleInCurrentPath && isHighestStep && (
        <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-6 text-center text-emerald-900 shadow-xs">
          <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-base font-bold">Highest Step Achieved</h3>
          <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto font-medium">
            You are currently in the highest defined role profile on this career pathway ({userRoleProfile.name}).
          </p>
        </div>
      )}

      {isRoleInCurrentPath && selectedPathData.nextRole && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden space-y-0">
          <div className="bg-stone-50/70 px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 bg-stone-200 px-2 py-0.5 rounded-md">
                Next Role Target
              </span>
              <h3 className="text-lg font-bold text-neutral-900 mt-1">
                Progression to {selectedPathData.nextRole.name}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Target competency levels compared with your latest completed verified assessment ratings.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-stone-100">
              <thead className="bg-stone-50/50 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Competency</th>
                  <th scope="col" className="px-6 py-3.5">Type</th>
                  <th scope="col" className="px-6 py-3.5">Your Current Verified Level</th>
                  <th scope="col" className="px-6 py-3.5">Target Level ({selectedPathData.nextRole.name})</th>
                  <th scope="col" className="px-6 py-3.5">Skill Gap</th>
                  <th scope="col" className="px-6 py-3.5">Readiness Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {selectedPathData.progressionItems.map((item) => (
                  <tr key={item.competencyId} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">
                      {item.competencyName}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200/60"
                      >
                        {item.competencyType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.currentVerifiedLevel !== null ? (
                        <span className="font-bold text-neutral-900">
                          Level {item.currentVerifiedLevel}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400 italic">Not Assessed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900">
                      Level {item.nextRoleTargetLevel}
                    </td>
                    <td className="px-6 py-4">
                      {renderGap(item.gap, item.status)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function renderGap(gap: number | null, status: StaffCareerProgressionStatus) {
  if (status === 'NOT_ASSESSED' || gap === null) {
    return <span className="text-xs text-stone-400">—</span>;
  }
  if (gap === 0) {
    return <span className="text-xs font-semibold text-emerald-700">0 (Target Met)</span>;
  }
  if (gap > 0) {
    return (
      <span className="text-xs font-semibold text-amber-700">
        -{gap} level{gap > 1 ? 's' : ''} required
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-stone-800">
      +{Math.abs(gap)} level{Math.abs(gap) > 1 ? 's' : ''} ahead
    </span>
  );
}

function renderStatusBadge(status: StaffCareerProgressionStatus) {
  switch (status) {
    case 'NOT_ASSESSED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200/60">
          NOT ASSESSED
        </span>
      );
    case 'MEETS_TARGET':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          READY / MEETS TARGET
        </span>
      );
    case 'DEVELOPMENT_NEEDED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
          DEVELOPMENT NEEDED
        </span>
      );
    case 'EXCEEDS_TARGET':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200/60">
          EXCEEDS TARGET
        </span>
      );
  }
}
