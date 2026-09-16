import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import {
  getGapAnalysisAssessmentsForTenant,
  getTeamGapAnalysis,
  getOrganizationGapAnalysis,
  getTeamsForTenant,
} from '@/services';
import { UserRole, CompetencyType } from '@prisma/client';
import { formatDate } from '@/lib/format';

interface GapAnalysisPageProps {
  searchParams: Promise<{ tab?: string; teamId?: string }>;
}

export default async function GapAnalysisListPage({ searchParams }: GapAnalysisPageProps) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    redirect(getRoleDashboardPath(user.role));
  }

  const { tab = 'individual', teamId } = await searchParams;
  const activeTab = tab === 'team' || tab === 'organization' ? tab : 'individual';

  const assessments = await getGapAnalysisAssessmentsForTenant(user.tenantId);
  const totalAnalyzed = assessments.length;
  const totalGapsIdentified = assessments.reduce((acc, a) => acc + a.totalGapPoints, 0);
  const assessmentsWithGaps = assessments.filter((a) => a.belowTargetCount > 0).length;

  const teams = await getTeamsForTenant(user.tenantId);
  const selectedTeamId = teamId || (teams.length > 0 ? teams[0].id : null);
  const teamAnalysis = selectedTeamId
    ? await getTeamGapAnalysis(selectedTeamId, user.tenantId)
    : null;

  const orgAnalysis = await getOrganizationGapAnalysis(user.tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Skill Gap Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compare verified staff capability ratings against target role profiles to identify organizational, team, and individual capability gaps.
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Gap Analysis Views">
          <Link
            href="/organization-admin/gap-analysis?tab=individual"
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'individual'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Individual Assessments ({assessments.length})
          </Link>
          <Link
            href="/organization-admin/gap-analysis?tab=team"
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Team Capability Gaps ({teams.length} Teams)
          </Link>
          <Link
            href="/organization-admin/gap-analysis?tab=organization"
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'organization'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Organization-Wide Gaps ({orgAnalysis.competencies.length} Competencies)
          </Link>
        </nav>
      </div>

      {activeTab === 'individual' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Evaluations Analyzed
                  </div>
                  <div className="mt-1 text-3xl font-extrabold text-gray-900">{totalAnalyzed}</div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                Completed assessments with role profile targets
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Identified Gaps
                  </div>
                  <div className="mt-1 text-3xl font-extrabold text-amber-600">
                    {totalGapsIdentified}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                Cumulative level gaps below target benchmarks
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff With Gaps
                  </div>
                  <div className="mt-1 text-3xl font-extrabold text-gray-900">{assessmentsWithGaps}</div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                Staff evaluations possessing at least 1 deficiency
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Completed Assessments</h2>
              <span className="text-xs text-gray-500">
                {assessments.length} {assessments.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {assessments.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No completed assessments with target role profiles found for this tenant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left">Staff Member</th>
                      <th scope="col" className="px-6 py-3 text-left">Campaign</th>
                      <th scope="col" className="px-6 py-3 text-left">Target Role Profile</th>
                      <th scope="col" className="px-6 py-3 text-center">Gaps Below Target</th>
                      <th scope="col" className="px-6 py-3 text-center">Total Gap Deficit</th>
                      <th scope="col" className="px-6 py-3 text-center">Completed</th>
                      <th scope="col" className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assessments.map((item) => (
                      <tr key={item.assessmentId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.user.name}</div>
                          <div className="text-xs text-gray-500">{item.user.email}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{item.campaign.name}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {item.roleProfile.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.belowTargetCount > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              {item.belowTargetCount} {item.belowTargetCount === 1 ? 'gap' : 'gaps'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                              0 gaps
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.totalGapPoints > 0 ? (
                            <span className="font-semibold text-amber-600">
                              -{item.totalGapPoints} levels
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-gray-500">
                          {item.completedAt ? formatDate(item.completedAt) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-3">
                          <a
                            href={`/api/reports/gap-analysis/individual/${item.assessmentId}`}
                            download
                            className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                            title="Export CSV"
                          >
                            Export CSV
                          </a>
                          <a
                            href={`/api/reports/gap-analysis/individual/${item.assessmentId}/excel`}
                            download
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                            title="Export Excel (.xlsx)"
                          >
                            Export Excel
                          </a>
                          <Link
                            href={`/organization-admin/gap-analysis/${item.assessmentId}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            View Breakdown &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <label htmlFor="team-select" className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Select Team
              </label>
              <form method="GET" action="/organization-admin/gap-analysis">
                <input type="hidden" name="tab" value="team" />
                <select
                  id="team-select"
                  name="teamId"
                  defaultValue={selectedTeamId ?? ''}
                  className="rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.department ? `(${t.department.name})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md bg-white hover:bg-gray-50 text-gray-700"
                >
                  Filter
                </button>
              </form>
            </div>

            {teamAnalysis && (
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                <div>
                  <span className="block text-gray-400">Department</span>
                  <span className="font-semibold text-gray-900">{teamAnalysis.team.departmentName ?? '—'}</span>
                </div>
                <div>
                  <span className="block text-gray-400">Team Manager</span>
                  <span className="font-semibold text-gray-900">{teamAnalysis.team.managerName ?? '—'}</span>
                </div>
                <div>
                  <span className="block text-gray-400">Active Staff</span>
                  <span className="font-semibold text-gray-900">{teamAnalysis.activeStaffCount}</span>
                </div>
                {teamAnalysis.staffWithoutRoleProfileCount > 0 && (
                  <div>
                    <span className="block text-amber-600 font-medium">Unassigned Role</span>
                    <span className="font-semibold text-amber-700">{teamAnalysis.staffWithoutRoleProfileCount}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {!teamAnalysis ? (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
              Please select a team to view competency gap analysis.
            </div>
          ) : teamAnalysis.competencies.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
              No required competencies mapped for active staff members in this team.
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {teamAnalysis.team.name} Competency Capability Gaps
                  </h2>
                  <span className="text-xs text-gray-500">
                    {teamAnalysis.competencies.length} Competencies Evaluated
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/reports/gap-analysis/team/${teamAnalysis.team.id}`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </a>
                  <a
                    href={`/api/reports/gap-analysis/team/${teamAnalysis.team.id}/excel`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 shadow-sm text-xs font-medium rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Excel (.xlsx)
                  </a>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left">Competency</th>
                      <th scope="col" className="px-6 py-3 text-left">Type</th>
                      <th scope="col" className="px-6 py-3 text-center">Staff Requiring</th>
                      <th scope="col" className="px-6 py-3 text-center">Assessed</th>
                      <th scope="col" className="px-6 py-3 text-center">Avg Verified Level</th>
                      <th scope="col" className="px-6 py-3 text-center">Below Target</th>
                      <th scope="col" className="px-6 py-3 text-center">Meets Target</th>
                      <th scope="col" className="px-6 py-3 text-center">Not Assessed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamAnalysis.competencies.map((comp) => (
                      <tr key={comp.competencyId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{comp.competencyName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              comp.competencyType === CompetencyType.TECHNICAL
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {comp.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-900">
                          {comp.employeesRequiringCount}
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-blue-600">
                          {comp.assessedCount}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {comp.averageVerifiedLevel !== null ? (
                            <span className="font-bold text-gray-900">L{comp.averageVerifiedLevel}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {comp.belowTargetCount > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              {comp.belowTargetCount}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-emerald-600">
                          {comp.meetsTargetCount + comp.exceedsTargetCount}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-400">
                          {comp.notAssessedCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'organization' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Active Staff
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">
                {orgAnalysis.totalActiveStaffCount}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                Staff workforce assessed across organization
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staff With Role Profiles
              </div>
              <div className="mt-1 text-3xl font-extrabold text-blue-600">
                {orgAnalysis.staffWithRoleProfileCount}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                Staff assigned defined competency targets
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staff Without Assigned Role
              </div>
              <div className="mt-1 text-3xl font-extrabold text-amber-600">
                {orgAnalysis.staffWithoutRoleProfileCount}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                Tracked separately without fabricated targets
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Organization-Wide Competency Capability Distribution
                </h2>
                <span className="text-xs text-gray-500">
                  {orgAnalysis.competencies.length} Required Competencies
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/api/reports/gap-analysis/organization"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </a>
                <a
                  href="/api/reports/gap-analysis/organization/excel"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 shadow-sm text-xs font-medium rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Excel (.xlsx)
                </a>
              </div>
            </div>

            {orgAnalysis.competencies.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No role requirements found across active staff members in this organization.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left">Competency</th>
                      <th scope="col" className="px-6 py-3 text-left">Type</th>
                      <th scope="col" className="px-6 py-3 text-center">Staff Requiring</th>
                      <th scope="col" className="px-6 py-3 text-center">Assessed</th>
                      <th scope="col" className="px-6 py-3 text-center">Avg Verified Level</th>
                      <th scope="col" className="px-6 py-3 text-center">Below Target</th>
                      <th scope="col" className="px-6 py-3 text-center">Meets Target</th>
                      <th scope="col" className="px-6 py-3 text-center">Not Assessed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orgAnalysis.competencies.map((comp) => (
                      <tr key={comp.competencyId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{comp.competencyName}</div>
                          {comp.competencyDescription && (
                            <div className="text-xs text-gray-400 mt-0.5 max-w-md line-clamp-1">
                              {comp.competencyDescription}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              comp.competencyType === CompetencyType.TECHNICAL
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {comp.competencyType === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-900">
                          {comp.employeesRequiringCount}
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-blue-600">
                          {comp.assessedCount}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {comp.averageVerifiedLevel !== null ? (
                            <span className="font-bold text-gray-900">L{comp.averageVerifiedLevel}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {comp.belowTargetCount > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              {comp.belowTargetCount}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-emerald-600">
                          {comp.meetsTargetCount + comp.exceedsTargetCount}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-400">
                          {comp.notAssessedCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
