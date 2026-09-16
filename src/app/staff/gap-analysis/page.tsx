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
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Personal Gap Analysis</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Compare your verified capability ratings against assigned role expectations or an aspirational target role.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200/80">
          <Link
            href="/staff/gap-analysis?target=current"
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              !isAspirational
                ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            Current Assigned Role
          </Link>
          <Link
            href={`/staff/gap-analysis?target=aspirational${
              selectedAspirationalRoleId ? `&roleId=${selectedAspirationalRoleId}` : ''
            }`}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              isAspirational
                ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            Aspirational Role
          </Link>
        </div>
      </div>

      {isAspirational && (
        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
              ★
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Exploratory Career Comparison
              </div>
              <div className="text-xs text-neutral-700 font-medium mt-0.5">
                Comparing your verified skills against an aspirational role. This does not change your official role assignment.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="aspirational-role-select" className="text-xs font-bold text-neutral-700 uppercase tracking-wider whitespace-nowrap">
              Target Role:
            </label>
            <form action="/staff/gap-analysis" method="GET" className="flex items-center gap-2">
              <input type="hidden" name="target" value="aspirational" />
              <select
                id="aspirational-role-select"
                name="roleId"
                defaultValue={selectedAspirationalRoleId}
                className="bg-white border border-stone-300 text-neutral-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 font-medium shadow-2xs"
              >
                {aspirationalRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                Compare
              </button>
            </form>
          </div>
        </div>
      )}

      {!isAspirational && (!analysis || !analysis.hasRoleProfile || !analysis.roleProfile) && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-8 text-center max-w-lg mx-auto shadow-xs">
          <div className="h-12 w-12 rounded-full bg-stone-100 text-neutral-700 flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-base font-bold text-neutral-900">No Role Profile Assigned</h2>
          <p className="mt-2 text-xs text-neutral-500">
            No role profile has been assigned yet. You can still explore role expectations by selecting an{' '}
            <Link
              href={`/staff/gap-analysis?target=aspirational${
                selectedAspirationalRoleId ? `&roleId=${selectedAspirationalRoleId}` : ''
              }`}
              className="text-neutral-900 font-semibold underline"
            >
              Aspirational Role
            </Link>
            .
          </p>
        </div>
      )}

      {isAspirational && aspirationalRoles.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-8 text-center max-w-lg mx-auto shadow-xs">
          <p className="text-xs text-neutral-400 italic">
            No published role profiles are currently available for aspirational comparison.
          </p>
        </div>
      )}

      {analysis && analysis.roleProfile && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Requirements</div>
              <div className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
                {analysis.metrics.totalRequirements}
              </div>
              <div className="mt-1 text-[11px] text-neutral-500">Total role targets</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Assessed</div>
              <div className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
                {analysis.metrics.assessedRequirementsCount}
              </div>
              <div className="mt-1 text-[11px] text-neutral-500">With verified rating</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Below Target</div>
              <div className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
                {analysis.metrics.belowTargetCount}
              </div>
              <div className="mt-1 text-[11px] text-neutral-500">Development gaps</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Meets Target</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700 tracking-tight">
                {analysis.metrics.meetsTargetCount}
              </div>
              <div className="mt-1 text-[11px] text-emerald-600">At expected level</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Exceeds Target</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700 tracking-tight">
                {analysis.metrics.exceedsTargetCount}
              </div>
              <div className="mt-1 text-[11px] text-emerald-600">Advanced mastery</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Not Assessed</div>
              <div className="mt-1 text-2xl font-bold text-neutral-500 tracking-tight">
                {analysis.metrics.notAssessedCount}
              </div>
              <div className="mt-1 text-[11px] text-neutral-400">Pending evaluation</div>
            </div>
          </div>

          <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
                Competency Gap Breakdown
              </h2>
              <span className="text-xs text-neutral-500">
                Target Role:{' '}
                <strong className="text-neutral-900">{analysis.roleProfile.name}</strong>
                {isAspirational && (
                  <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                    Aspirational Target
                  </span>
                )}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-100 text-xs">
                <thead className="bg-stone-50/70 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
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
                <tbody className="bg-white divide-y divide-stone-100">
                  {analysis.requirements.map((req) => (
                    <tr key={req.competencyId} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-neutral-500">
                        {analysis?.roleProfile?.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-neutral-900">{req.competencyName}</div>
                        {req.targetLevelDescription && (
                          <div className="text-[11px] text-neutral-500 mt-0.5 max-w-md line-clamp-1 leading-relaxed">
                            Target L{req.targetLevel}: {req.targetLevelDescription}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-stone-100 text-stone-700 border border-stone-200/80"
                        >
                          {req.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {req.currentLevel !== null ? (
                          <span className="font-bold text-neutral-900">Level {req.currentLevel}</span>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">Not Assessed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap font-semibold text-neutral-700">
                        Level {req.targetLevel}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {req.gap !== null ? (
                          req.gap > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-800 border border-stone-200/80">
                              -{req.gap} {req.gap === 1 ? 'level' : 'levels'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              0
                            </span>
                          )
                        ) : (
                          <span className="text-neutral-400">—</span>
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
