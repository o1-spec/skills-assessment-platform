import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import {
  getStaffPersonalGapAnalysis,
  getStaffAspirationalGapAnalysis,
  getAspirationalTargetRolesForStaff,
  CapabilityGapStatus,
} from '@/services';
import { UserRole, CompetencyType } from '@prisma/client';

interface StaffGapAnalysisPageProps {
  searchParams: Promise<{ target?: string; roleId?: string }>;
}

export default async function StaffPersonalGapAnalysisPage({
  searchParams,
}: StaffGapAnalysisPageProps) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    redirect(getRoleDashboardPath(user.role));
  }

  const { target = 'current', roleId } = await searchParams;
  const isAspirational = target === 'aspirational';

  const aspirationalRoles = await getAspirationalTargetRolesForStaff(user.tenantId);

  const selectedAspirationalRoleId =
    roleId || (aspirationalRoles.length > 0 ? aspirationalRoles[0].id : undefined);

  let analysis: Awaited<ReturnType<typeof getStaffPersonalGapAnalysis>> = null;

  if (isAspirational) {
    if (selectedAspirationalRoleId) {
      analysis = await getStaffAspirationalGapAnalysis(
        user.id,
        user.tenantId,
        selectedAspirationalRoleId
      );
    }
  } else {
    analysis = await getStaffPersonalGapAnalysis(user.id, user.tenantId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal Gap Analysis</h1>
          <p className="mt-1 text-sm text-gray-500">
            Compare your verified capability ratings against assigned role expectations or an aspirational target role.
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-gray-100 p-1 border border-gray-200">
          <Link
            href="/staff/gap-analysis?target=current"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              !isAspirational
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Current Assigned Role
          </Link>
          <Link
            href={`/staff/gap-analysis?target=aspirational${
              selectedAspirationalRoleId ? `&roleId=${selectedAspirationalRoleId}` : ''
            }`}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isAspirational
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Aspirational Role
          </Link>
        </div>
      </div>

      {isAspirational && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              ★
            </div>
            <div>
              <div className="text-xs font-medium text-blue-800 uppercase tracking-wide">
                Exploratory Career Comparison
              </div>
              <div className="text-sm text-blue-900 font-semibold">
                Comparing your verified skills against an aspirational role. This does not change your official role assignment.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="aspirational-role-select" className="text-xs font-medium text-blue-900 whitespace-nowrap">
              Target Role:
            </label>
            <form action="/staff/gap-analysis" method="GET" className="flex items-center gap-2">
              <input type="hidden" name="target" value="aspirational" />
              <select
                id="aspirational-role-select"
                name="roleId"
                defaultValue={selectedAspirationalRoleId}
                className="bg-white border border-blue-300 text-gray-900 text-xs rounded-md px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                {aspirationalRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
              >
                Compare
              </button>
            </form>
          </div>
        </div>
      )}

      {!isAspirational && (!analysis || !analysis.hasRoleProfile || !analysis.roleProfile) && (
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
            No role profile has been assigned yet. You can still explore role expectations by selecting an{' '}
            <Link
              href={`/staff/gap-analysis?target=aspirational${
                selectedAspirationalRoleId ? `&roleId=${selectedAspirationalRoleId}` : ''
              }`}
              className="text-blue-600 font-medium underline"
            >
              Aspirational Role
            </Link>
            .
          </p>
        </div>
      )}

      {isAspirational && aspirationalRoles.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-lg mx-auto">
          <p className="text-gray-500">
            No published role profiles are currently available for aspirational comparison.
          </p>
        </div>
      )}

      {analysis && analysis.roleProfile && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase">Requirements</div>
              <div className="mt-1 text-2xl font-extrabold text-gray-900">
                {analysis.metrics.totalRequirements}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">Total role targets</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase">Assessed</div>
              <div className="mt-1 text-2xl font-extrabold text-blue-600">
                {analysis.metrics.assessedRequirementsCount}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">With verified rating</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase">Below Target</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-600">
                {analysis.metrics.belowTargetCount}
              </div>
              <div className="mt-1 text-[11px] text-amber-700">Development gaps</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase">Meets Target</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600">
                {analysis.metrics.meetsTargetCount}
              </div>
              <div className="mt-1 text-[11px] text-emerald-700">At expected level</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase">Exceeds Target</div>
              <div className="mt-1 text-2xl font-extrabold text-purple-600">
                {analysis.metrics.exceedsTargetCount}
              </div>
              <div className="mt-1 text-[11px] text-purple-700">Advanced mastery</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase">Not Assessed</div>
              <div className="mt-1 text-2xl font-extrabold text-gray-500">
                {analysis.metrics.notAssessedCount}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">Pending evaluation</div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Competency Gap Breakdown
              </h2>
              <span className="text-xs text-gray-500">
                Target Role:{' '}
                <strong className="text-gray-900">{analysis.roleProfile.name}</strong>
                {isAspirational && (
                  <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                    Aspirational Target
                  </span>
                )}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">Role Profile</th>
                    <th scope="col" className="px-6 py-3 text-left">Competency</th>
                    <th scope="col" className="px-6 py-3 text-left">Type</th>
                    <th scope="col" className="px-6 py-3 text-center">Verified Level</th>
                    <th scope="col" className="px-6 py-3 text-center">Target Level</th>
                    <th scope="col" className="px-6 py-3 text-center">Gap Deficiency</th>
                    <th scope="col" className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysis.requirements.map((req) => (
                    <tr key={req.competencyId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-500">
                        {analysis?.roleProfile?.name}
                      </td>
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
        </>
      )}
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
