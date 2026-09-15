import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getFrameworkVersions } from '@/services/frameworks';
import Link from 'next/link';
import { FrameworkListActions } from './framework-list-actions';

export default async function FrameworksListPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const frameworks = await getFrameworkVersions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canonical Competency Frameworks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Author and publish global competency standards, responsibility levels, and behavioral benchmarks.
          </p>
        </div>
        <div>
          <Link
            href="/platform-admin/frameworks/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 transition-colors"
          >
            + Create Framework Draft
          </Link>
        </div>
      </div>

      {frameworks.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No competency frameworks found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first canonical competency framework draft.
          </p>
          <div className="mt-6">
            <Link
              href="/platform-admin/frameworks/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
            >
              + Create Framework Draft
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {frameworks.map((fw) => {
              const isPublished = fw.status === 'PUBLISHED';

              return (
                <div key={fw.id} className="p-6 hover:bg-gray-50/70 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/platform-admin/frameworks/${fw.id}`}
                          className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          Version {fw.version}
                        </Link>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                            isPublished
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {fw.status}
                        </span>
                        {isPublished && fw.publishedAt && (
                          <span className="text-xs text-gray-500">
                            Published {new Date(fw.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {fw.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 max-w-3xl">
                          {fw.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500 pt-1">
                        <span>
                          <strong className="font-semibold text-gray-700">{fw._count.categories}</strong> Categories
                        </span>
                        <span>
                          <strong className="font-semibold text-gray-700">{fw.competencyCount}</strong> Competencies
                        </span>
                        <span>
                          <strong className="font-semibold text-gray-700">{fw._count.adoptions}</strong> Tenant Adoptions
                        </span>
                        <span>
                          Created {new Date(fw.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <FrameworkListActions framework={fw} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
