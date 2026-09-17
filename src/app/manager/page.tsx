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
import { PageHeader, StatCard, SectionCard } from '@/components/app';
import { ManagerQuickStartCard } from './quick-start-card';

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
    <div className="space-y-6">
      <PageHeader
        title="Manager Dashboard"
        description="Monitor your direct reports' verified skills profiles, team competency distribution, and pending corroborations."
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
            Team Oversight
          </span>
        }
        actions={
          <Link
            href="/manager/corroborations"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs transition-colors"
          >
            <span>Corroboration Queue</span>
            {stats.pendingReviewsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-neutral-900 font-bold">
                {stats.pendingReviewsCount}
              </span>
            )}
          </Link>
        }
      />

      <ManagerQuickStartCard />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending Corroborations"
          value={stats.pendingReviewsCount}
          subtext={stats.pendingReviewsCount > 0 ? 'Awaiting your corroboration review' : 'All reviews are up to date'}
          badge={
            stats.pendingReviewsCount > 0
              ? { text: `${stats.pendingReviewsCount} Action Required`, trend: 'down' }
              : undefined
          }
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active Direct Reports"
          value={stats.directReportsCount}
          subtext="Staff members reporting to you"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label="Completed Reviews"
          value={stats.completedReviewsCount}
          subtext="Finalized evaluations across cycles"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <SectionCard
        title="Direct Reports Capability Summary"
        subtitle="Assigned roles, verified competencies, and capability benchmarks across your team"
        action={
          <span className="text-xs font-semibold text-neutral-500">
            {directReports.length} {directReports.length === 1 ? 'Report' : 'Reports'}
          </span>
        }
        noPadding
      >
        {directReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No active direct reports assigned to you.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Staff Member</th>
                  <th className="py-3 px-4">Role Profile</th>
                  <th className="py-3 px-4 text-center">Verified Skills</th>
                  <th className="py-3 px-4 text-center">Below Target</th>
                  <th className="py-3 px-4 text-center">Not Assessed</th>
                  <th className="py-3 px-4 text-center">Last Assessed</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-neutral-700">
                {directReports.map((report) => (
                  <tr key={report.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-neutral-900">
                      <div>{report.name}</div>
                      <div className="text-[11px] text-neutral-400 font-normal font-mono">{report.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {report.roleProfile ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-neutral-800 border border-stone-200">
                          {report.roleProfile.name}
                        </span>
                      ) : (
                        <span className="text-neutral-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-neutral-900">
                      {report.verifiedCompetenciesCount}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {report.belowTargetCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {report.belowTargetCount}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {report.notAssessedCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                          {report.notAssessedCount}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[11px] text-neutral-500">
                      {report.lastAssessmentDate ? formatDate(report.lastAssessmentDate) : '—'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        href={`/manager/direct-reports/${report.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-stone-100 hover:bg-stone-200 transition-colors"
                      >
                        Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Team Competency Matrix"
        subtitle="Verified skill proficiencies across all direct reports. Derived from validated assessment campaigns."
        action={
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Meets Target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span> Below Target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-stone-300"></span> Not Assessed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500"></span> Additional Skill
            </span>
          </div>
        }
        noPadding
      >
        {!matrix || matrix.rows.length === 0 || matrix.competencies.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No competency matrix data available for your direct reports.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="sticky left-0 bg-stone-50/90 backdrop-blur-xs z-10 py-3 px-4 border-r border-stone-100 min-w-44">
                    Direct Report
                  </th>
                  {matrix.competencies.map((comp) => (
                    <th
                      key={comp.id}
                      className="py-3 px-3 text-center min-w-28"
                      title={comp.name}
                    >
                      <div className="truncate max-w-28 font-semibold text-neutral-900 mx-auto">
                        {comp.name}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-normal">
                        {comp.type === CompetencyType.TECHNICAL ? 'Tech' : 'Behav'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-neutral-700">
                {matrix.rows.map((row) => (
                  <tr key={row.userId} className="hover:bg-stone-50/60 transition-colors">
                    <td className="sticky left-0 bg-white z-10 py-3 px-4 whitespace-nowrap border-r border-stone-100">
                      <div className="font-semibold text-neutral-900">{row.name}</div>
                      <div className="text-[11px] text-neutral-400 truncate max-w-36">
                        {row.roleProfileName ?? 'No role'}
                      </div>
                    </td>
                    {matrix.competencies.map((comp) => {
                      const cell = row.cells[comp.id];
                      return (
                        <td key={comp.id} className="py-3 px-3 text-center whitespace-nowrap">
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
      </SectionCard>

      {gapAggregation.length > 0 && (
        <SectionCard
          title="Team Gap Aggregation"
          subtitle="Aggregated capability status per competency against each direct report's role profile"
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Competency</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Required By</th>
                  <th className="py-3 px-4 text-center">Assessed</th>
                  <th className="py-3 px-4 text-center">Below Target</th>
                  <th className="py-3 px-4 text-center">Meets/Exceeds</th>
                  <th className="py-3 px-4 text-center">Not Assessed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-neutral-700">
                {gapAggregation.map((agg) => (
                  <tr key={agg.competencyId} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-neutral-900">{agg.competencyName}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          agg.competencyType === CompetencyType.TECHNICAL
                            ? 'bg-stone-100 text-neutral-800 border-stone-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {agg.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-neutral-900">
                      {agg.employeesRequiringCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-neutral-800">
                      {agg.assessedCount}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {agg.belowTargetCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {agg.belowTargetCount}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-800">
                      {agg.meetsTargetCount + agg.exceedsTargetCount}
                    </td>
                    <td className="py-3.5 px-4 text-center text-neutral-400">
                      {agg.notAssessedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-stone-400" title="Not assessed">
        —
      </span>
    );
  }

  const { finalRating, targetLevel, status } = cell;

  if (status === 'BELOW_TARGET') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200"
        title={`Verified Level ${finalRating} (Below Target Level ${targetLevel})`}
      >
        <span>L{finalRating}</span>
        <span className="text-[10px] text-amber-600 font-normal">/ T{targetLevel}</span>
      </span>
    );
  }

  if (status === 'MEETS_TARGET' || status === 'EXCEEDS_TARGET') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
        title={`Verified Level ${finalRating} (Meets/Exceeds Target Level ${targetLevel})`}
      >
        <span>L{finalRating}</span>
        <span className="text-[10px] text-emerald-600 font-normal">/ T{targetLevel}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200"
      title={`Verified Level ${finalRating} (Additional skill)`}
    >
      L{finalRating}
    </span>
  );
}
