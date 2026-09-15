import Link from 'next/link';
import { requireTenantUser } from '@/lib/auth';
import {
  getRoleProfilesForTenant,
  getCampaignsForTenant,
  getGapAnalysisAssessmentsForTenant,
} from '@/services';

export default async function OrganizationAdminOverviewPage() {
  const user = await requireTenantUser();

  const [roleProfiles, campaigns, completedGapAssessments] = await Promise.all([
    getRoleProfilesForTenant(user.tenantId),
    getCampaignsForTenant(user.tenantId),
    getGapAnalysisAssessmentsForTenant(user.tenantId),
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE');
  const totalIdentifiedGaps = completedGapAssessments.reduce(
    (acc, a) => acc + a.totalGapPoints,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization benchmarks, competencies, assessment campaigns, and skill gap analyses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Role Profiles Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0 bg-blue-50 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role Profiles</dt>
                  <dd className="text-2xl font-bold text-gray-900">{roleProfiles.length}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <Link href="/organization-admin/roles" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-between">
              <span>View Role Profiles</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Campaigns Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0 bg-emerald-50 rounded-md p-3">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Campaigns</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {campaigns.length}{' '}
                    <span className="text-xs font-normal text-emerald-600 font-sans">
                      ({activeCampaigns.length} active)
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <Link href="/organization-admin/campaigns" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center justify-between">
              <span>View Campaigns</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Gap Analysis Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0 bg-purple-50 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gap Analyses</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {completedGapAssessments.length}{' '}
                    <span className="text-xs font-normal text-amber-600 font-sans">
                      ({totalIdentifiedGaps} gaps)
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <Link href="/organization-admin/gap-analysis" className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center justify-between">
              <span>View Gap Analysis</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Organization Info Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0 bg-indigo-50 rounded-md p-3">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</dt>
                  <dd className="text-base font-bold text-gray-900 truncate">{user.tenant.name}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 text-xs text-gray-500 font-mono truncate">
            slug: {user.tenant.slug}
          </div>
        </div>
      </div>
    </div>
  );
}
