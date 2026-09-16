'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CareerPathStatus, CompetencyType } from '@prisma/client';
import { CareerPathDetail } from '@/services/career-paths';
import { publishCareerPathAction } from '@/actions/career-paths';

interface CareerPathDetailViewProps {
  careerPath: CareerPathDetail;
}

export function CareerPathDetailView({ careerPath }: CareerPathDetailViewProps) {
  const router = useRouter();
  const isPublished = careerPath.status === CareerPathStatus.PUBLISHED;

  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePublish = async () => {
    if (
      !confirm(
        `Are you sure you want to publish "${careerPath.name}"? Once published, the path becomes visible to staff members and its structural progression is locked to ensure historical integrity.`
      )
    ) {
      return;
    }

    setError(null);
    setIsPublishing(true);

    try {
      const res = await publishCareerPathAction(careerPath.id);
      if (!res.success) {
        setError(res.error || 'Failed to publish career path.');
      } else {
        setSuccess('Career path published successfully! It is now visible to eligible staff members.');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred while publishing.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
            <Link href="/organization-admin/career-paths" className="hover:text-gray-700">
              Career Paths
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{careerPath.name}</span>
          </div>

          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{careerPath.name}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isPublished
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {careerPath.status}
            </span>
          </div>

          {careerPath.description && (
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">{careerPath.description}</p>
          )}
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {!isPublished && (
            <>
              <Link
                href={`/organization-admin/career-paths/${careerPath.id}/edit`}
                className="px-3.5 py-2 border border-gray-300 shadow-2xs text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Edit Steps
              </Link>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-4 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isPublishing ? 'Publishing...' : 'Publish Career Path'}
              </button>
            </>
          )}
          {isPublished && (
            <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
              Published &amp; Locked for Staff
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Career Path Steps Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-gray-900">Progression Track</h2>
        <div className="flex flex-col md:flex-row items-stretch gap-4 pt-2">
          {careerPath.steps.map((step, idx) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative">
              <div className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">
                    {step.roleProfile.requirements.length} Skills
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

              {idx < careerPath.steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 text-xs">
                  &rarr;
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Adjacent Role Transitions & Deltas */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Role Transitions &amp; Skill Deltas</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Derived skill additions and level increases between each adjacent step in the pathway.
          </p>
        </div>

        {careerPath.transitions.map((trans, tIdx) => (
          <div
            key={`${trans.sourceRole.id}-${trans.targetRole.id}`}
            className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden"
          >
            {/* Transition Header */}
            <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    Transition {tIdx + 1}
                  </span>
                  <h3 className="text-base font-bold text-gray-900">
                    {trans.sourceRole.name} &rarr; {trans.targetRole.name}
                  </h3>
                </div>

                {/* Summary Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    +{trans.newSkillsCount} New Skills
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    +{trans.levelIncreasesCount} Level Increases
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {trans.technicalDeltasCount} Technical / {trans.behavioralDeltasCount} Behavioral
                  </span>
                </div>
              </div>
            </div>

            {/* Delta Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3">Competency</th>
                    <th scope="col" className="px-6 py-3">Type</th>
                    <th scope="col" className="px-6 py-3">Current Target ({trans.sourceRole.name})</th>
                    <th scope="col" className="px-6 py-3">Next Target ({trans.targetRole.name})</th>
                    <th scope="col" className="px-6 py-3">Progression Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {trans.deltas.map((delta) => {
                    return (
                      <tr key={delta.competencyId} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-gray-900">
                          {delta.competencyName}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              delta.competencyType === CompetencyType.TECHNICAL
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {delta.competencyType}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">
                          {delta.sourceTargetLevel !== null ? `Level ${delta.sourceTargetLevel}` : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-gray-900 font-semibold">
                          {delta.targetTargetLevel !== null ? `Level ${delta.targetTargetLevel}` : '—'}
                        </td>
                        <td className="px-6 py-3.5">
                          {delta.deltaType === 'NEW_REQUIREMENT' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              NEW REQUIREMENT
                            </span>
                          )}
                          {delta.deltaType === 'LEVEL_INCREASE' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              +{((delta.targetTargetLevel || 0) - (delta.sourceTargetLevel || 0))} LEVELS
                            </span>
                          )}
                          {delta.deltaType === 'UNCHANGED' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              UNCHANGED
                            </span>
                          )}
                          {delta.deltaType === 'LOWER_TARGET' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              LOWER TARGET
                            </span>
                          )}
                          {delta.deltaType === 'NO_LONGER_REQUIRED' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                              NO LONGER REQUIRED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
