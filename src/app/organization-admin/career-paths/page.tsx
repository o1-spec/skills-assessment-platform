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
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Career Paths (OA-06)</h1>
          <p className="mt-1 text-sm text-stone-500">
            Define structured multi-role progression pathways to guide staff development and internal mobility.
          </p>
        </div>
        <Link
          href="/organization-admin/career-paths/new"
          className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          + Create Career Path
        </Link>
      </div>

      {paths.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-neutral-900 mb-4 border border-stone-200/60">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-neutral-900">No Career Paths Defined</h3>
          <p className="mt-1 text-sm text-stone-500 max-w-md mx-auto">
            Design linear career progression paths between your published role profiles to illuminate competency milestones for staff.
          </p>
          <div className="mt-6">
            <Link
              href="/organization-admin/career-paths/new"
              className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
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
              className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs hover:border-stone-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-neutral-900">
                      <Link
                        href={`/organization-admin/career-paths/${path.id}`}
                        className="hover:text-stone-600 transition-colors"
                      >
                        {path.name}
                      </Link>
                    </h2>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        path.status === CareerPathStatus.PUBLISHED
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}
                    >
                      {path.status}
                    </span>
                  </div>
                  {path.description && (
                    <p className="text-sm text-stone-600 line-clamp-2">{path.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    {path.steps.map((step, idx) => (
                      <span key={step.id} className="inline-flex items-center space-x-1.5 text-xs text-stone-700 font-medium">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-stone-100 text-stone-800 border border-stone-200/60">
                          {idx + 1}. {step.roleProfile.name}
                          {step.roleProfile.isArchived && (
                            <span className="ml-1 text-[10px] text-amber-800 font-bold">(Archived)</span>
                          )}
                        </span>
                        {idx < path.steps.length - 1 && (
                          <span className="text-stone-400 font-bold">&rarr;</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 self-start">
                  <Link
                    href={`/organization-admin/career-paths/${path.id}`}
                    className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
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
