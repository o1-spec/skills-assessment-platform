import Link from 'next/link';
import { requireTenantUser } from '@/lib/auth';
import { getRoleProfilesForTenant } from '@/services';
import { RoleProfileStatus } from '@prisma/client';
import { formatDate, formatRoleStatus } from '@/lib/format';

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function RoleProfilesListPage({ searchParams }: PageProps) {
  const user = await requireTenantUser();
  const { filter = 'active' } = await searchParams;

  const allRoles = await getRoleProfilesForTenant(user.tenantId, { includeArchived: true });

  const activeCount = allRoles.filter((r) => !r.isArchived).length;
  const draftCount = allRoles.filter((r) => !r.isArchived && r.status === RoleProfileStatus.DRAFT).length;
  const publishedCount = allRoles.filter((r) => !r.isArchived && r.status === RoleProfileStatus.PUBLISHED).length;
  const archivedCount = allRoles.filter((r) => r.isArchived).length;

  let displayedRoles = allRoles;
  if (filter === 'draft') {
    displayedRoles = allRoles.filter((r) => !r.isArchived && r.status === RoleProfileStatus.DRAFT);
  } else if (filter === 'published') {
    displayedRoles = allRoles.filter((r) => !r.isArchived && r.status === RoleProfileStatus.PUBLISHED);
  } else if (filter === 'archived') {
    displayedRoles = allRoles.filter((r) => r.isArchived);
  } else if (filter === 'active') {
    displayedRoles = allRoles.filter((r) => !r.isArchived);
  }

  const tabs = [
    { id: 'active', label: 'Active', count: activeCount, href: '/organization-admin/roles?filter=active' },
    { id: 'draft', label: 'Drafts', count: draftCount, href: '/organization-admin/roles?filter=draft' },
    { id: 'published', label: 'Published', count: publishedCount, href: '/organization-admin/roles?filter=published' },
    { id: 'archived', label: 'Archived', count: archivedCount, href: '/organization-admin/roles?filter=archived' },
    { id: 'all', label: 'All', count: allRoles.length, href: '/organization-admin/roles?filter=all' },
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Role Profiles</h1>
          <p className="mt-1 text-sm text-stone-500">
            Define role benchmarks, target competency levels, and maintain organizational skill profiles.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/organization-admin/roles/new"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl shadow-2xs text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Role Profile
          </Link>
        </div>
      </div>

      <div className="border-b border-stone-200/80">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = filter === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  isActive
                    ? 'border-neutral-900 text-neutral-900 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`py-0.5 px-2 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-neutral-900 text-white' : 'bg-stone-100 text-stone-600 border border-stone-200/80'
                  }`}
                >
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {displayedRoles.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-dashed border-stone-300 p-12 shadow-xs">
          <svg className="mx-auto h-12 w-12 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-bold text-neutral-900">
            {filter === 'archived'
              ? 'No archived role profiles'
              : filter === 'draft'
              ? 'No draft role profiles'
              : filter === 'published'
              ? 'No published role profiles'
              : 'No role profiles yet'}
          </h3>
          <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
            {filter === 'archived'
              ? 'Role profiles that are retired or deprecated will appear here.'
              : 'Get started by creating a role profile or pre-filling from an industry template.'}
          </p>
          {filter !== 'archived' && (
            <div className="mt-6">
              <Link
                href="/organization-admin/roles/new"
                className="inline-flex items-center px-4 py-2.5 rounded-xl shadow-2xs text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
              >
                Create Role Profile
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {displayedRoles.map((role) => {
              const isPublished = role.status === RoleProfileStatus.PUBLISHED;

              return (
                <li key={role.id} className="hover:bg-stone-50/50 transition-colors">
                  <Link href={`/organization-admin/roles/${role.id}`} className="block p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-base font-bold text-neutral-900 hover:text-neutral-600 transition-colors">
                          {role.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-stone-100 text-stone-700 border border-stone-200/80'
                          }`}
                        >
                          {formatRoleStatus(role.status)}
                        </span>
                        {role.isArchived && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500 border border-stone-200">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-stone-500 font-medium">
                        <span>
                          {role._count.requirements} {role._count.requirements === 1 ? 'competency' : 'competencies'}
                        </span>
                        <span>•</span>
                        <span>
                          {role._count.users} {role._count.users === 1 ? 'assigned user' : 'assigned users'}
                        </span>
                      </div>
                    </div>

                    {role.description && (
                      <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed">{role.description}</p>
                    )}

                    <div className="mt-3.5 flex items-center justify-between text-xs text-stone-400">
                      <span>
                        Created {formatDate(role.createdAt)}
                        {role.isArchived && role.archivedAt && (
                          <span className="ml-2 text-stone-400">
                            (Archived {formatDate(role.archivedAt)})
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-neutral-700 hover:text-neutral-900 transition-colors">View details &rarr;</span>
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
