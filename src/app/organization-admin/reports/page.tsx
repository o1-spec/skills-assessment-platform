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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workforce Capability Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Export on-demand capability reports in Excel (.xlsx) and CSV formats, or configure automated recurring report schedules.
        </p>
      </div>

      {/* SECTION 1: ON-DEMAND EXPORTS */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-gray-900">On-Demand Capability Reports</h2>
          <p className="text-xs text-gray-500">
            Download current capability evaluations and gap analyses across the organization or specific teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Report Card */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Organization-Wide Capability Report</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Aggregate skill levels, benchmarks, and requirement coverage for all active staff.
                </p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded">
                Org Scope
              </span>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="/api/reports/gap-analysis/organization/excel"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 text-xs font-semibold rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel (.xlsx)
              </a>
              <a
                href="/api/reports/gap-analysis/organization"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-xs font-semibold rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              >
                Download CSV
              </a>
            </div>
          </div>

          {/* Team Reports Card */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Team Capability Reports</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Export focused capability gap breakdowns for specific functional teams.
                </p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-800 rounded">
                {teams.length} Teams
              </span>
            </div>

            {teams.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No teams configured in this organization.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-200/50 last:border-0">
                    <span className="font-medium text-gray-800">{team.name}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/reports/gap-analysis/team/${team.id}/excel`}
                        download
                        className="text-emerald-600 hover:text-emerald-800 font-semibold"
                        title="Download Team Excel (.xlsx)"
                      >
                        Excel (.xlsx)
                      </a>
                      <span className="text-gray-300">|</span>
                      <a
                        href={`/api/reports/gap-analysis/team/${team.id}`}
                        download
                        className="text-gray-600 hover:text-gray-900 font-medium"
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

        <div className="pt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>Need employee-level assessment gap exports?</span>
          <Link
            href="/organization-admin/gap-analysis?tab=individual"
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            Go to Individual Assessments Gap Table &rarr;
          </Link>
        </div>
      </div>

      {/* SECTION 2: SCHEDULED REPORTS */}
      <ScheduleListClient
        schedules={schedules}
        users={activeUsers}
        teams={teams}
      />
    </div>
  );
}
