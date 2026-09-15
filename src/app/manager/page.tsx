import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import {
  getManagerOverviewStats,
  getManagerDashboardData,
  CapabilityGapStatus,
} from '@/services';
import { UserRole, CompetencyType } from '@prisma/client';
import { formatDate } from '@/lib/format';

export default async function ManagerOverviewPage() {
  const user = await requireTenantUser();

  if (user.role !== UserRole.MANAGER) {
    redirect(getRoleDashboardPath(user.role));
  }

  const [stats, dashboardData] = await Promise.all([
    getManagerOverviewStats(user.id, user.tenantId),
    getManagerDashboardData(user.id, user.tenantId),
  ]);

  const directReports = dashboardData?.directReports ?? [];
  const matrix = dashboardData?.matrix;
  const gapAggregation = dashboardData?.gapAggregation ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor your direct reports&apos; verified skills profiles, team competency distribution, and pending corroborations.
        </p>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Pending Reviews Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending Reviews
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">
                {stats.pendingReviewsCount}
              </div>
            </div>
            <div
              className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                stats.pendingReviewsCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            {stats.pendingReviewsCount > 0 ? (
              <Link
                href="/manager/corroborations"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-between"
              >
                <span>Review pending assessments</span>
                <span>&rarr;</span>
              </Link>
            ) : (
              <span className="text-xs text-gray-500">All direct report reviews are up to date.</span>
            )}
          </div>
        </div>

        {/* Direct Reports Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Active Direct Reports
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">
                {stats.directReportsCount}
              </div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Active staff members reporting to you
          </div>
        </div>

        {/* Completed Reviews Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed Reviews
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">
                {stats.completedReviewsCount}
              </div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Finalized assessment evaluations
          </div>
        </div>
      </div>

      {/* SECTION: Direct Reports Summary */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Direct Reports Capability Summary</h2>
            <p className="text-xs text-gray-500">
              Overview of assigned roles, verified competency counts, and development gaps.
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500">
            {directReports.length} {directReports.length === 1 ? 'Report' : 'Reports'}
          </span>
        </div>

        {directReports.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No active direct reports assigned to you.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">Staff Member</th>
                  <th scope="col" className="px-6 py-3 text-left">Assigned Role Profile</th>
                  <th scope="col" className="px-6 py-3 text-center">Verified Competencies</th>
                  <th scope="col" className="px-6 py-3 text-center">Below Target</th>
                  <th scope="col" className="px-6 py-3 text-center">Not Assessed</th>
                  <th scope="col" className="px-6 py-3 text-center">Last Assessed</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {directReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{report.name}</div>
                      <div className="text-xs text-gray-500">{report.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {report.roleProfile ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                          {report.roleProfile.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Role Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {report.verifiedCompetenciesCount}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {report.belowTargetCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          {report.belowTargetCount}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {report.notAssessedCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {report.notAssessedCount}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-gray-500">
                      {report.lastAssessmentDate ? formatDate(report.lastAssessmentDate) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/manager/direct-reports/${report.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View Profile &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION: Team Competency Matrix (MG-05) */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">Team Competency Matrix</h2>
            <p className="text-xs text-gray-500">
              Verified competency levels across all direct reports. Derived dynamically from active role profiles and assessments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Meets/Exceeds
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Below Target
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300"></span> Not Assessed
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400"></span> Extra Skill
            </span>
          </div>
        </div>

        {!matrix || matrix.rows.length === 0 || matrix.competencies.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No competency matrix data available for your direct reports.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left font-semibold uppercase tracking-wider border-r border-gray-200 min-w-[180px]"
                  >
                    Direct Report
                  </th>
                  {matrix.competencies.map((comp) => (
                    <th
                      key={comp.id}
                      scope="col"
                      className="px-3 py-3 text-center font-medium uppercase tracking-wider min-w-[120px]"
                      title={comp.name}
                    >
                      <div className="truncate max-w-[120px] font-semibold text-gray-900">
                        {comp.name}
                      </div>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {comp.type === CompetencyType.TECHNICAL ? 'Tech' : 'Behav'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matrix.rows.map((row) => (
                  <tr key={row.userId} className="hover:bg-gray-50/70 transition-colors">
                    <td className="sticky left-0 bg-white z-10 px-4 py-3 whitespace-nowrap border-r border-gray-200">
                      <div className="font-semibold text-gray-900">{row.name}</div>
                      <div className="text-[11px] text-gray-500 truncate max-w-[160px]">
                        {row.roleProfileName ?? 'No role'}
                      </div>
                    </td>
                    {matrix.competencies.map((comp) => {
                      const cell = row.cells[comp.id];
                      return (
                        <td key={comp.id} className="px-3 py-3 text-center whitespace-nowrap">
                          <MatrixCellBadge cell={cell} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION: Team Gap Aggregation */}
      {gapAggregation.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-900">Team Gap Aggregation</h2>
            <p className="text-xs text-gray-500">
              Aggregated capability status per competency against each direct report&apos;s assigned role profile.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">Competency</th>
                  <th scope="col" className="px-6 py-3 text-left">Type</th>
                  <th scope="col" className="px-6 py-3 text-center">Employees Requiring</th>
                  <th scope="col" className="px-6 py-3 text-center">Assessed</th>
                  <th scope="col" className="px-6 py-3 text-center">Below Target</th>
                  <th scope="col" className="px-6 py-3 text-center">Meets Target</th>
                  <th scope="col" className="px-6 py-3 text-center">Not Assessed</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gapAggregation.map((agg) => (
                  <tr key={agg.competencyId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{agg.competencyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          agg.competencyType === CompetencyType.TECHNICAL
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {agg.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {agg.employeesRequiringCount}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-blue-600">
                      {agg.assessedCount}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {agg.belowTargetCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          {agg.belowTargetCount}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-emerald-600">
                      {agg.meetsTargetCount + agg.exceedsTargetCount}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-400">
                      {agg.notAssessedCount}
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

function MatrixCellBadge({
  cell,
}: {
  cell?: {
    finalRating: number | null;
    targetLevel: number | null;
    status: CapabilityGapStatus | 'NOT_REQUIRED';
  };
}) {
  if (!cell || cell.finalRating === null) {
    return (
      <span
        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-gray-400 bg-gray-50"
        title="Not assessed"
      >
        —
      </span>
    );
  }

  const { finalRating, targetLevel, status } = cell;

  if (status === 'BELOW_TARGET') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300"
        title={`Verified Level ${finalRating} (Below Target Level ${targetLevel})`}
      >
        <span>L{finalRating}</span>
        <span className="text-[10px] text-amber-700">/ T{targetLevel}</span>
      </span>
    );
  }

  if (status === 'MEETS_TARGET' || status === 'EXCEEDS_TARGET') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
        title={`Verified Level ${finalRating} (Meets/Exceeds Target Level ${targetLevel})`}
      >
        <span>L{finalRating}</span>
        <span className="text-[10px] text-emerald-700">/ T{targetLevel}</span>
      </span>
    );
  }

  // Extra verified skill outside role target
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"
      title={`Verified Level ${finalRating} (Additional skill)`}
    >
      L{finalRating}
    </span>
  );
}
