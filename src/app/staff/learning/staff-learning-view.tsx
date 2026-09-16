'use client';

import { CompetencyType, LearningResourceType } from '@prisma/client';
import { StaffLearningRecommendationsResult } from '@/services/learning-resources';

interface Props {
  data: StaffLearningRecommendationsResult;
}

export function StaffLearningView({ data }: Props) {
  const getTypeBadge = (type: LearningResourceType) => {
    switch (type) {
      case LearningResourceType.COURSE:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case LearningResourceType.ARTICLE:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case LearningResourceType.VIDEO:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case LearningResourceType.DOCUMENT:
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Case 1: No role profile assigned
  if (!data.hasRoleProfile) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900">No Role Profile Assigned</h3>
        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
          {data.message || 'No role profile is currently assigned to your account.'}
        </p>
      </div>
    );
  }

  // Case 2: No gaps needing recommendation (meets/exceeds target on all requirements)
  if (!data.hasGaps || data.recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900">No Learning Gaps Identified</h3>
        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
          {data.message || 'No learning recommendations are currently needed based on your verified role requirements.'}
        </p>
      </div>
    );
  }

  // Case 3: Recommendations based on verified gaps
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5">
        <div className="flex items-start">
          <div className="p-2 bg-white rounded-lg shadow-2xs text-indigo-600 mr-4 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Personalized Learning Pathway</h2>
            <p className="mt-1 text-sm text-gray-600">
              Curated educational resources mapped to your role requirements ({data.roleProfileName}) to close capability gaps and support your career growth.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {data.recommendations.map((item) => {
          const isBelow = item.status === 'BELOW_TARGET';

          return (
            <div
              key={item.competencyId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs"
            >
              {/* Header card for the competency requirement */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-gray-900">{item.competencyName}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.competencyType === CompetencyType.TECHNICAL
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {item.competencyType}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isBelow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {isBelow ? 'Development Needed' : 'Not Assessed Yet'}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-gray-500 font-medium">{item.rationale}</p>
                </div>

                <div className="flex items-center space-x-3 text-xs shrink-0">
                  <div className="text-center px-3 py-1 bg-white border border-gray-200 rounded-lg">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Current</span>
                    <span className="font-bold text-gray-900">
                      {item.currentVerifiedLevel !== null ? `Level ${item.currentVerifiedLevel}` : '—'}
                    </span>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div className="text-center px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="text-indigo-500 block text-[10px] uppercase font-bold">Target</span>
                    <span className="font-bold text-indigo-700">Level {item.targetLevel}</span>
                  </div>
                  {item.gap !== null && item.gap > 0 && (
                    <div className="text-center px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-amber-500 block text-[10px] uppercase font-bold">Gap</span>
                      <span className="font-bold text-amber-700">+{item.gap}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Resources List */}
              <div className="p-5">
                {item.resources.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50/30">
                    <p className="text-xs text-gray-500">
                      No learning resource has been mapped for this gap yet. Check back soon as your organization curates more learning materials.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {item.resources.map((res) => (
                      <div
                        key={res.id}
                        className="flex flex-col justify-between p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-xs transition-all bg-white"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                              {res.title}
                            </h4>
                            <span
                              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getTypeBadge(
                                res.resourceType
                              )}`}
                            >
                              {res.resourceType}
                            </span>
                          </div>

                          {res.description && (
                            <p className="text-xs text-gray-600 line-clamp-2">{res.description}</p>
                          )}

                          <div className="flex items-center space-x-2 text-[11px] text-gray-500 pt-1">
                            {res.provider && (
                              <span className="font-medium text-gray-700">{res.provider}</span>
                            )}
                            {res.targetLevel && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-600 font-semibold">
                                  Focus: Level {res.targetLevel}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[11px] text-gray-400">External Resource</span>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Open Resource
                            <svg
                              className="ml-1 w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
