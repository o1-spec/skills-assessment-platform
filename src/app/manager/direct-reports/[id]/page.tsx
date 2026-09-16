import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getManagerDirectReportDetail, CapabilityGapStatus } from '@/services';
import { UserRole, CompetencyType } from '@prisma/client';
import { formatDate } from '@/lib/format';

export default async function ManagerDirectReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.MANAGER) {
    redirect(getRoleDashboardPath(user.role));
  }

  const { id: directReportId } = await params;
  const detail = await getManagerDirectReportDetail(user.id, directReportId, user.tenantId);

  if (!detail || !detail.profile) {
    notFound();
  }

  const { profile, gapAnalysis } = detail;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/manager"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-3"
        >
          &larr; Back to Manager Dashboard
        </Link>
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
                {profile.userName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.userName}</h1>
                <p className="text-sm text-gray-500">{profile.userEmail}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Assigned Role:</span>
                  {profile.roleProfile ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {profile.roleProfile.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No Role Profile Assigned</span>
                  )}
                  <span className="text-[11px] text-gray-400 font-normal">
                    (Read-only direct report review)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 text-xs text-gray-500">
              <span>Last Assessed:</span>
              <span className="font-semibold text-gray-900 text-sm">
                {profile.lastAssessmentDate ? formatDate(profile.lastAssessmentDate) : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {gapAnalysis && gapAnalysis.hasRoleProfile && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Personal Gap Breakdown</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Below: <strong className="text-amber-600">{gapAnalysis.metrics.belowTargetCount}</strong></span>
              <span>•</span>
              <span>Meets/Exceeds: <strong className="text-emerald-600">{gapAnalysis.metrics.meetsTargetCount + gapAnalysis.metrics.exceedsTargetCount}</strong></span>
              <span>•</span>
              <span>Pending: <strong className="text-gray-500">{gapAnalysis.metrics.notAssessedCount}</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">Competency</th>
                  <th scope="col" className="px-6 py-3 text-left">Type</th>
                  <th scope="col" className="px-6 py-3 text-center">Verified Level</th>
                  <th scope="col" className="px-6 py-3 text-center">Target Level</th>
                  <th scope="col" className="px-6 py-3 text-center">Deficiency</th>
                  <th scope="col" className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gapAnalysis.requirements.map((req) => (
                  <tr key={req.competencyId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{req.competencyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {req.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {req.currentLevel !== null ? `Level ${req.currentLevel}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700">Level {req.targetLevel}</td>
                    <td className="px-6 py-4 text-center">
                      {req.gap !== null && req.gap > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                          -{req.gap}
                        </span>
                      ) : req.gap === 0 ? (
                        <span className="text-emerald-600 font-semibold text-xs">0</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={req.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-lg font-bold text-gray-900">Verified Competencies Matrix</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...profile.technical, ...profile.behavioral].map((comp) => (
            <div
              key={comp.competencyId}
              className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{comp.competencyName}</h3>
                    <span className="text-[11px] text-gray-400">
                      {comp.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                      {comp.isRequiredByRole ? ' • Target L' + comp.targetLevel : ''}
                    </span>
                  </div>
                  <div>
                    {comp.isAssessed && comp.verifiedLevel !== null ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        Level {comp.verifiedLevel} / {comp.maxLevel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                        Not Assessed
                      </span>
                    )}
                  </div>
                </div>

                {comp.verifiedLevelDescription && (
                  <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100">
                    <span className="font-semibold block mb-0.5 text-gray-800">Standard:</span>
                    {comp.verifiedLevelDescription}
                  </div>
                )}
              </div>

              {comp.verifiedAt && (
                <div className="mt-4 pt-2 text-[11px] text-gray-400 flex items-center justify-between border-t border-gray-100">
                  <span>Last Corroboration</span>
                  <span>{formatDate(comp.verifiedAt)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CapabilityGapStatus }) {
  switch (status) {
    case 'BELOW_TARGET':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          Below Target
        </span>
      );
    case 'MEETS_TARGET':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          Meets Target
        </span>
      );
    case 'EXCEEDS_TARGET':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          Exceeds Target
        </span>
      );
    case 'NOT_ASSESSED':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          Not Assessed
        </span>
      );
  }
}
