import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getStaffPersonalGapAnalysis, CapabilityGapStatus } from '@/services';
import { UserRole, CompetencyType } from '@prisma/client';

export default async function StaffPersonalGapAnalysisPage() {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    redirect(getRoleDashboardPath(user.role));
  }

  const analysis = await getStaffPersonalGapAnalysis(user.id, user.tenantId);

  if (!analysis) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">Personal gap analysis could not be loaded.</p>
      </div>
    );
  }

  if (!analysis.hasRoleProfile || !analysis.roleProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal Gap Analysis</h1>
          <p className="mt-1 text-sm text-gray-500">
            Compare your verified capability ratings against assigned role expectations.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-lg mx-auto">
          <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">No Role Profile Assigned</h2>
          <p className="mt-2 text-sm text-gray-500">
            No role profile has been assigned yet. Once your organization assigns a target role profile,
            your personal gap-to-target analysis will appear here.
          </p>
        </div>
      </div>
    );
  }

  const { metrics, requirements, roleProfile } = analysis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Personal Gap Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compare your latest verified competencies against target benchmarks for{' '}
          <span className="font-semibold text-gray-800">{roleProfile.name}</span>.
        </p>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Requirements</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{metrics.totalRequirements}</div>
          <div className="mt-1 text-[11px] text-gray-400">Total role targets</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Assessed</div>
          <div className="mt-1 text-2xl font-extrabold text-blue-600">
            {metrics.assessedRequirementsCount}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">With verified rating</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Below Target</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-600">{metrics.belowTargetCount}</div>
          <div className="mt-1 text-[11px] text-amber-700">Development gaps</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Meets Target</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-600">{metrics.meetsTargetCount}</div>
          <div className="mt-1 text-[11px] text-emerald-700">At expected level</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Exceeds Target</div>
          <div className="mt-1 text-2xl font-extrabold text-purple-600">{metrics.exceedsTargetCount}</div>
          <div className="mt-1 text-[11px] text-purple-700">Advanced mastery</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Not Assessed</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-500">{metrics.notAssessedCount}</div>
          <div className="mt-1 text-[11px] text-gray-400">Pending evaluation</div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Competency Gap Breakdown</h2>
          <span className="text-xs text-gray-500">
            Role Profile: <strong className="text-gray-900">{roleProfile.name}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">Competency</th>
                <th scope="col" className="px-6 py-3 text-left">Type</th>
                <th scope="col" className="px-6 py-3 text-center">Verified Level</th>
                <th scope="col" className="px-6 py-3 text-center">Target Level</th>
                <th scope="col" className="px-6 py-3 text-center">Gap Deficiency</th>
                <th scope="col" className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requirements.map((req) => (
                <tr key={req.competencyId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{req.competencyName}</div>
                    {req.targetLevelDescription && (
                      <div className="text-xs text-gray-400 mt-0.5 max-w-md line-clamp-1">
                        Target L{req.targetLevel}: {req.targetLevelDescription}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        req.competencyType === CompetencyType.TECHNICAL
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {req.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {req.currentLevel !== null ? (
                      <span className="font-bold text-gray-900">Level {req.currentLevel}</span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not Assessed</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap font-semibold text-gray-700">
                    Level {req.targetLevel}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {req.gap !== null ? (
                      req.gap > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                          -{req.gap} {req.gap === 1 ? 'level' : 'levels'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                          0
                        </span>
                      )
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <StatusBadge status={req.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
