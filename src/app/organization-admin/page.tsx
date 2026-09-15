import Link from 'next/link';
import { requireTenantUser } from '@/lib/auth';
import { getRoleProfilesForTenant } from '@/services';

export default async function OrganizationAdminOverviewPage() {
  const user = await requireTenantUser();
  const roleProfiles = await getRoleProfilesForTenant(user.tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization benchmarks, competencies, and assessment campaigns.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Role Profiles Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0 bg-blue-50 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Role Profiles</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{roleProfiles.length}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <div className="text-sm">
              <Link href="/organization-admin/roles" className="font-medium text-blue-600 hover:text-blue-700">
                View role profiles &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Organization Info Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0 bg-purple-50 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Organization</dt>
                  <dd className="text-lg font-semibold text-gray-900 truncate">{user.tenant.name}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <span className="text-xs text-gray-500 font-mono">Slug: {user.tenant.slug}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
