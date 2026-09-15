import Link from 'next/link';
import { requireTenantUser } from '@/lib/auth';
import { getRoleProfilesForTenant } from '@/services';
import { RoleProfileStatus } from '@prisma/client';
import { formatDate, formatRoleStatus } from '@/lib/format';

export default async function RoleProfilesListPage() {
  const user = await requireTenantUser();
  const roleProfiles = await getRoleProfilesForTenant(user.tenantId);

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Profiles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define role benchmarks and target competency levels for your organization.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/organization-admin/roles/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Role Profile
          </Link>
        </div>
      </div>

      {/* Role Profiles List */}
      {roleProfiles.length === 0 ? (
        <div className="text-center bg-white rounded-lg border border-dashed border-gray-300 p-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No role profiles yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a role profile with required technical and behavioral competencies.
          </p>
          <div className="mt-6">
            <Link
              href="/organization-admin/roles/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Role Profile
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {roleProfiles.map((role) => {
              const isPublished = role.status === RoleProfileStatus.PUBLISHED;

              return (
                <li key={role.id} className="hover:bg-gray-50 transition-colors">
                  <Link href={`/organization-admin/roles/${role.id}`} className="block p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-base font-semibold text-blue-600 hover:underline">
                          {role.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {formatRoleStatus(role.status)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {role._count.requirements} {role._count.requirements === 1 ? 'competency' : 'competencies'}
                      </div>
                    </div>

                    {role.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{role.description}</p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Created {formatDate(role.createdAt)}
                      </span>
                      <span className="font-medium text-blue-600">View details &rarr;</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
