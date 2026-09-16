import Link from 'next/link';
import { UserRole, CareerPathStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getCareerPathsForTenant } from '@/services/career-paths';

export default async function CareerPathsPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const paths = await getCareerPathsForTenant(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Career Paths (OA-06)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define structured multi-role progression pathways to guide staff development and internal mobility.
          </p>
        </div>
        <Link
          href="/organization-admin/career-paths/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          + Create Career Path
        </Link>
      </div>

      {paths.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900">No Career Paths Defined</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
            Design linear career progression paths between your published role profiles to illuminate competency milestones for staff.
          </p>
          <div className="mt-6">
            <Link
              href="/organization-admin/career-paths/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Create Your First Path
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {paths.map((path) => (
            <div
              key={path.id}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs hover:border-gray-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-gray-900">
                      <Link
                        href={`/organization-admin/career-paths/${path.id}`}
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {path.name}
                      </Link>
                    </h2>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        path.status === CareerPathStatus.PUBLISHED
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {path.status}
                    </span>
                  </div>
                  {path.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{path.description}</p>
                  )}

                  {/* Steps sequence preview */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    {path.steps.map((step, idx) => (
                      <span key={step.id} className="inline-flex items-center space-x-1.5 text-xs text-gray-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 font-medium text-gray-800 border border-gray-200">
                          {idx + 1}. {step.roleProfile.name}
                          {step.roleProfile.isArchived && (
                            <span className="ml-1 text-[10px] text-amber-600 font-bold">(Archived)</span>
                          )}
                        </span>
                        {idx < path.steps.length - 1 && (
                          <span className="text-gray-400 font-bold">&rarr;</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 self-start">
                  <Link
                    href={`/organization-admin/career-paths/${path.id}`}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-2xs text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
