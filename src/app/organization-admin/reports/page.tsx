import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTeamsForTenant, getReportSchedulesForTenant } from '@/services';
import { UserRole } from '@prisma/client';
import { ScheduleListClient } from './schedule-list-client';

export default async function OrganizationAdminReportsPage() {
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    redirect(getRoleDashboardPath(user.role));
  }

  const [teams, schedules, activeUsers] = await Promise.all([
    getTeamsForTenant(user.tenantId),
    getReportSchedulesForTenant(user.tenantId),
    prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Workforce Capability Reports</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Export on-demand capability reports in Excel (.xlsx) and CSV formats, or configure automated recurring report schedules.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight">On-Demand Capability Reports</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Download current capability evaluations and gap analyses across the organization or specific teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Organization-Wide Capability Report</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Aggregate skill levels, benchmarks, and requirement coverage for all active staff.
                </p>
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80 rounded-full">
                Org Scope
              </span>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="/api/reports/gap-analysis/organization/excel"
                download
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-200/80 text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel (.xlsx)
              </a>
              <a
                href="/api/reports/gap-analysis/organization"
                download
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-200/80 text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
              >
                Download CSV
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Team Capability Reports</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Export focused capability gap breakdowns for specific functional teams.
                </p>
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80 rounded-full">
                {teams.length} Teams
              </span>
            </div>

            {teams.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No teams configured in this organization.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between text-xs py-1.5 border-b border-stone-200/60 last:border-0">
                    <span className="font-semibold text-neutral-900">{team.name}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/reports/gap-analysis/team/${team.id}/excel`}
                        download
                        className="text-neutral-700 hover:text-neutral-900 font-semibold hover:underline"
                        title="Download Team Excel (.xlsx)"
                      >
                        Excel (.xlsx)
                      </a>
                      <span className="text-stone-300">|</span>
                      <a
                        href={`/api/reports/gap-analysis/team/${team.id}`}
                        download
                        className="text-neutral-500 hover:text-neutral-800 font-medium"
                      >
                        CSV
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 text-xs text-neutral-500 flex items-center justify-between">
          <span>Need employee-level assessment gap exports?</span>
          <Link
            href="/organization-admin/gap-analysis?tab=individual"
            className="text-neutral-900 hover:underline font-semibold"
          >
            Go to Individual Assessments Gap Table &rarr;
          </Link>
        </div>
      </div>

      <ScheduleListClient
        schedules={schedules}
        users={activeUsers}
        teams={teams}
      />
    </div>
  );
}
