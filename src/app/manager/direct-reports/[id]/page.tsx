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
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors inline-flex items-center gap-1.5 mb-3"
        >
          &larr; Back to Manager Dashboard
        </Link>
        <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xl">
                {profile.userName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{profile.userName}</h1>
                <p className="text-xs text-neutral-500">{profile.userEmail}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-medium">Assigned Role:</span>
                  {profile.roleProfile ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                      {profile.roleProfile.name}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400 italic">No Role Profile Assigned</span>
                  )}
                  <span className="text-[11px] text-neutral-400 font-normal">
                    (Read-only direct report review)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100 text-xs text-neutral-500">
              <span className="text-neutral-400">Last Assessed:</span>
              <span className="font-bold text-neutral-900 text-sm mt-0.5">
                {profile.lastAssessmentDate ? formatDate(profile.lastAssessmentDate) : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {gapAnalysis && gapAnalysis.hasRoleProfile && (
        <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Personal Gap Breakdown</h2>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>Below: <strong className="text-neutral-900">{gapAnalysis.metrics.belowTargetCount}</strong></span>
              <span>•</span>
              <span>Meets/Exceeds: <strong className="text-emerald-700">{gapAnalysis.metrics.meetsTargetCount + gapAnalysis.metrics.exceedsTargetCount}</strong></span>
              <span>•</span>
              <span>Pending: <strong className="text-neutral-500">{gapAnalysis.metrics.notAssessedCount}</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100 text-xs">
              <thead className="bg-stone-50/70 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">Competency</th>
                  <th scope="col" className="px-6 py-3 text-left">Type</th>
                  <th scope="col" className="px-6 py-3 text-center">Verified Level</th>
                  <th scope="col" className="px-6 py-3 text-center">Target Level</th>
                  <th scope="col" className="px-6 py-3 text-center">Deficiency</th>
                  <th scope="col" className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-100">
                {gapAnalysis.requirements.map((req) => (
                  <tr key={req.competencyId} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">{req.competencyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-500">
                      {req.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-neutral-900">
                      {req.currentLevel !== null ? `Level ${req.currentLevel}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-center text-neutral-700">Level {req.targetLevel}</td>
                    <td className="px-6 py-4 text-center">
                      {req.gap !== null && req.gap > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200/80">
                          -{req.gap}
                        </span>
                      ) : req.gap === 0 ? (
                        <span className="text-emerald-700 font-semibold text-xs">0</span>
                      ) : (
                        <span className="text-neutral-400">—</span>
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
        <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Verified Competencies Matrix</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...profile.technical, ...profile.behavioral].map((comp) => (
            <div
              key={comp.competencyId}
              className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">{comp.competencyName}</h3>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {comp.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                      {comp.isRequiredByRole ? ' • Target L' + comp.targetLevel : ''}
                    </span>
                  </div>
                  <div>
                    {comp.isAssessed && comp.verifiedLevel !== null ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                        Level {comp.verifiedLevel} / {comp.maxLevel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-50 text-stone-500 border border-stone-200/60">
                        Not Assessed
                      </span>
                    )}
                  </div>
                </div>

                {comp.verifiedLevelDescription && (
                  <div className="mt-3 text-xs text-neutral-600 bg-stone-50/70 p-3 rounded-xl border border-stone-200/60 leading-relaxed">
                    <span className="font-bold block mb-0.5 text-neutral-900">Standard:</span>
                    {comp.verifiedLevelDescription}
                  </div>
                )}
              </div>

              {comp.verifiedAt && (
                <div className="mt-4 pt-2.5 text-[11px] text-neutral-400 flex items-center justify-between border-t border-stone-100">
                  <span>Last Corroboration</span>
                  <span className="font-medium text-neutral-700">{formatDate(comp.verifiedAt)}</span>
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-800 border border-stone-200/80">
          Below Target
        </span>
      );
    case 'MEETS_TARGET':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Meets Target
        </span>
      );
    case 'EXCEEDS_TARGET':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Exceeds Target
        </span>
      );
    case 'NOT_ASSESSED':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-50 text-stone-500 border border-stone-200/60">
          Not Assessed
        </span>
      );
  }
}
