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
  // Scenario 1: Staff has no role profile assigned
  if (!userHasRoleProfile || !userRoleProfile) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900">No Role Profile Assigned</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          No role profile is currently assigned to your account. Career progression pathways are mapped to your active job role. Please contact your organization administrator to assign your role.
        </p>
      </div>
    );
  }

  // Scenario 2: No published paths exist at all
  if (!selectedPathData && availablePaths.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Assigned Role</span>
            <h2 className="text-lg font-bold text-gray-900">{userRoleProfile.name}</h2>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">No Published Career Paths</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Your organization has not published any career progression tracks yet.
          </p>
        </div>
      </div>
    );
  }

  // Scenario 3: Published paths exist, but none currently selected/found
  if (!selectedPathData) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Assigned Role</span>
            <h2 className="text-lg font-bold text-gray-900">{userRoleProfile.name}</h2>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-2xs space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
            No published career path currently includes your role ({userRoleProfile.name}).
          </div>

          <h3 className="text-sm font-bold text-gray-900 pt-2">Explore Other Published Career Paths:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availablePaths.map((p) => (
              <Link
                key={p.id}
                href={`/staff/career-paths?pathId=${p.id}`}
                className="p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-colors"
              >
                <div className="font-semibold text-sm text-gray-900">{p.name}</div>
                {p.description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</div>
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
      {/* Top Banner: User Assigned Role & Path Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Your Assigned Role
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-0.5">{userRoleProfile.name}</h2>
          {userRoleProfile.description && (
            <p className="text-xs text-gray-500 mt-1 max-w-xl">{userRoleProfile.description}</p>
          )}
        </div>

        {availablePaths.length > 1 && (
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-medium text-gray-500">Path:</span>
            <div className="flex flex-wrap gap-1.5">
              {availablePaths.map((p) => (
                <Link
                  key={p.id}
                  href={`/staff/career-paths?pathId=${p.id}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    p.id === selectedPathData.careerPath.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Path Title & Description */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">{selectedPathData.careerPath.name}</h1>
        {selectedPathData.careerPath.description && (
          <p className="text-sm text-gray-600">{selectedPathData.careerPath.description}</p>
        )}
      </div>

      {!isRoleInCurrentPath && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
          Note: Your assigned role ({userRoleProfile.name}) is not part of this pathway. You are currently browsing this path for career exploration.
        </div>
      )}

      {/* Progression Steps Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-gray-900">Career Pathway Sequence</h2>

        <div className="flex flex-col md:flex-row items-stretch gap-4 pt-2">
          {selectedPathData.steps.map((step, idx) => {
            let cardStyle = 'border-gray-200 bg-gray-50/70 text-gray-700';
            let badgeText = `Step ${idx + 1}`;
            let badgeStyle = 'bg-gray-200 text-gray-700';

            if (step.isCurrentRole) {
              cardStyle = 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500 shadow-xs';
              badgeText = 'You Are Here';
              badgeStyle = 'bg-indigo-600 text-white';
            } else if (step.isNextRole) {
              cardStyle = 'border-emerald-500 bg-emerald-50/30 shadow-xs';
              badgeText = 'Next Milestone';
              badgeStyle = 'bg-emerald-600 text-white';
            } else if (step.isPastRole) {
              cardStyle = 'border-gray-200 bg-gray-50/50 opacity-75';
              badgeText = 'Completed';
              badgeStyle = 'bg-gray-300 text-gray-800';
            }

            return (
              <div key={step.roleProfile.id} className="flex-1 flex flex-col items-center relative">
                <div className={`w-full p-4 rounded-xl border transition-all space-y-2 ${cardStyle}`}>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${badgeStyle}`}>
                      {badgeText}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      Step {idx + 1}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {step.roleProfile.name}
                    </h3>
                    {step.roleProfile.isArchived && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Archived Role
                      </span>
                    )}
                    {step.roleProfile.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {step.roleProfile.description}
                      </p>
                    )}
                  </div>
                </div>

                {idx < selectedPathData.steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 text-xs">
                    &rarr;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Role Progression & Verified Level Comparison */}
      {isRoleInCurrentPath && isHighestStep && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-emerald-900 shadow-2xs">
          <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-base font-bold">Highest Step Achieved</h3>
          <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
            You are currently in the highest defined role profile on this career pathway ({userRoleProfile.name}).
          </p>
        </div>
      )}

      {isRoleInCurrentPath && selectedPathData.nextRole && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden space-y-0">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                Next Role Target
              </span>
              <h3 className="text-lg font-bold text-gray-900 mt-1">
                Progression to {selectedPathData.nextRole.name}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Target competency levels compared with your latest completed verified assessment ratings.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3">Competency</th>
                  <th scope="col" className="px-6 py-3">Type</th>
                  <th scope="col" className="px-6 py-3">Your Current Verified Level</th>
                  <th scope="col" className="px-6 py-3">Target Level ({selectedPathData.nextRole.name})</th>
                  <th scope="col" className="px-6 py-3">Skill Gap</th>
                  <th scope="col" className="px-6 py-3">Readiness Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {selectedPathData.progressionItems.map((item) => (
                  <tr key={item.competencyId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-gray-900">
                      {item.competencyName}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.competencyType === CompetencyType.TECHNICAL
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {item.competencyType}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      {item.currentVerifiedLevel !== null ? (
                        <span className="font-semibold text-gray-900">
                          Level {item.currentVerifiedLevel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not Assessed</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-gray-900">
                      Level {item.nextRoleTargetLevel}
                    </td>
                    <td className="px-6 py-3.5">
                      {renderGap(item.gap, item.status)}
                    </td>
                    <td className="px-6 py-3.5">
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
    return <span className="text-xs text-gray-400">—</span>;
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
  // gap < 0 (exceeds target)
  return (
    <span className="text-xs font-semibold text-purple-700">
      +{Math.abs(gap)} level{Math.abs(gap) > 1 ? 's' : ''} ahead
    </span>
  );
}

function renderStatusBadge(status: StaffCareerProgressionStatus) {
  switch (status) {
    case 'NOT_ASSESSED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          NOT ASSESSED
        </span>
      );
    case 'MEETS_TARGET':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          READY / MEETS TARGET
        </span>
      );
    case 'DEVELOPMENT_NEEDED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          DEVELOPMENT NEEDED
        </span>
      );
    case 'EXCEEDS_TARGET':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          EXCEEDS TARGET
        </span>
      );
  }
}
