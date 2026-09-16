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
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case LearningResourceType.ARTICLE:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case LearningResourceType.VIDEO:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case LearningResourceType.DOCUMENT:
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Resources (OA-12)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Map educational courses, articles, documentation, and videos to specific skills and target levels for employee development.
          </p>
        </div>
        <Link
          href="/organization-admin/learning-resources/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          + Add Learning Resource
        </Link>
      </div>

      {resources.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900">No Learning Resources Configured</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
            Connect internal training or curated external learning links to competencies and levels to provide automated recommendations to staff.
          </p>
          <div className="mt-6">
            <Link
              href="/organization-admin/learning-resources/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
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
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs hover:border-gray-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-gray-900">
                      <Link
                        href={`/organization-admin/learning-resources/${res.id}`}
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {res.title}
                      </Link>
                    </h2>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeBadge(
                        res.resourceType
                      )}`}
                    >
                      {res.resourceType}
                    </span>
                    <ResourceActiveToggle resourceId={res.id} initialActive={res.isActive} />
                  </div>

                  {res.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{res.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500">
                    {res.provider && (
                      <span className="flex items-center">
                        <span className="font-medium text-gray-700 mr-1">Provider:</span> {res.provider}
                      </span>
                    )}
                    <span className="flex items-center">
                      <span className="font-medium text-gray-700 mr-1">URL:</span>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-indigo-600 hover:underline max-w-xs truncate"
                      >
                        {res.url}
                      </a>
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-medium text-gray-500 mr-2">Mapped Skills:</span>
                    {res.mappings.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">No skills mapped yet</span>
                    ) : (
                      <div className="inline-flex flex-wrap gap-1.5 mt-1">
                        {res.mappings.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
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
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-2xs text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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
