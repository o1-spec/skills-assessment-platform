import Link from 'next/link';
import { UserRole, LearningResourceType } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getLearningResourcesForTenant } from '@/services/learning-resources';
import { ResourceActiveToggle } from './resource-active-toggle';

export default async function LearningResourcesPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const resources = await getLearningResourcesForTenant(tenantId);

  const getTypeBadge = (type: LearningResourceType) => {
    switch (type) {
      case LearningResourceType.COURSE:
        return 'bg-stone-100 text-stone-800 border-stone-200/60';
      case LearningResourceType.ARTICLE:
        return 'bg-stone-100 text-stone-700 border-stone-200/60';
      case LearningResourceType.VIDEO:
        return 'bg-stone-100 text-stone-800 border-stone-200/60';
      case LearningResourceType.DOCUMENT:
        return 'bg-stone-100 text-stone-700 border-stone-200/60';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200/60';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Learning Resources (OA-12)</h1>
          <p className="mt-1 text-sm text-stone-500">
            Map educational courses, articles, documentation, and videos to specific skills and target levels for employee development.
          </p>
        </div>
        <Link
          href="/organization-admin/learning-resources/new"
          className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          + Add Learning Resource
        </Link>
      </div>

      {resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-neutral-900 mb-4 border border-stone-200/60">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-neutral-900">No Learning Resources Configured</h3>
          <p className="mt-1 text-sm text-stone-500 max-w-md mx-auto">
            Connect internal training or curated external learning links to competencies and levels to provide automated recommendations to staff.
          </p>
          <div className="mt-6">
            <Link
              href="/organization-admin/learning-resources/new"
              className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Add Your First Resource
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {resources.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs hover:border-stone-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-neutral-900">
                      <Link
                        href={`/organization-admin/learning-resources/${res.id}`}
                        className="hover:text-stone-600 transition-colors"
                      >
                        {res.title}
                      </Link>
                    </h2>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTypeBadge(
                        res.resourceType
                      )}`}
                    >
                      {res.resourceType}
                    </span>
                    <ResourceActiveToggle resourceId={res.id} initialActive={res.isActive} />
                  </div>

                  {res.description && (
                    <p className="text-sm text-stone-600 line-clamp-2">{res.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500 font-medium">
                    {res.provider && (
                      <span className="flex items-center">
                        <span className="font-bold text-neutral-800 mr-1">Provider:</span> {res.provider}
                      </span>
                    )}
                    <span className="flex items-center">
                      <span className="font-bold text-neutral-800 mr-1">URL:</span>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-neutral-900 font-semibold hover:underline max-w-xs truncate"
                      >
                        {res.url}
                      </a>
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-bold text-neutral-800 mr-2">Mapped Skills:</span>
                    {res.mappings.length === 0 ? (
                      <span className="text-xs text-stone-400 italic">No skills mapped yet</span>
                    ) : (
                      <div className="inline-flex flex-wrap gap-1.5 mt-1">
                        {res.mappings.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200/60"
                          >
                            {m.competency.name}
                            {m.targetLevel ? ` (L${m.targetLevel})` : ' (All Levels)'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <Link
                    href={`/organization-admin/learning-resources/${res.id}`}
                    className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Edit Resource
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
