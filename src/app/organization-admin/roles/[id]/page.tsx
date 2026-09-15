import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantUser } from '@/lib/auth';
import { getRoleProfileById } from '@/services';
import { CompetencyType, RoleProfileStatus } from '@prisma/client';
import { formatDate, formatRoleStatus } from '@/lib/format';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RoleProfileDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireTenantUser();

  const roleProfile = await getRoleProfileById(id, user.tenantId);

  if (!roleProfile) {
    notFound();
  }

  const isPublished = roleProfile.status === RoleProfileStatus.PUBLISHED;

  const technicalReqs = roleProfile.requirements.filter(
    (r) => r.competency.type === CompetencyType.TECHNICAL
  );
  const behavioralReqs = roleProfile.requirements.filter(
    (r) => r.competency.type === CompetencyType.BEHAVIORAL
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/organization-admin/roles" className="hover:text-gray-900 transition-colors">
                Role Profiles
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li className="text-gray-900 font-medium truncate max-w-xs" aria-current="page">
              {roleProfile.name}
            </li>
          </ol>
        </nav>

        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{roleProfile.name}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isPublished
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {formatRoleStatus(roleProfile.status)}
            </span>
          </div>

          <div className="mt-4 sm:mt-0">
            <Link
              href="/organization-admin/roles"
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              &larr; Back to Role Profiles
            </Link>
          </div>
        </div>

        {roleProfile.description && (
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">{roleProfile.description}</p>
        )}
      </div>

      {/* Meta Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs text-gray-500 font-medium">Total Competencies</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{roleProfile.requirements.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium">Technical / Behavioral</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {technicalReqs.length} / {behavioralReqs.length}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium">Created On</div>
          <div className="mt-1 text-sm font-medium text-gray-900">
            {formatDate(roleProfile.createdAt)}
          </div>
        </div>
      </div>

      {/* Technical Competencies Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-base font-bold text-gray-900">Technical Competencies</h2>
          <p className="text-xs text-gray-500 mt-0.5">Required technical benchmarks for this role.</p>
        </div>

        {technicalReqs.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No technical competencies configured for this role.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {technicalReqs.map((req) => {
              const matchingLevel = req.competency.levels.find((l) => l.level === req.targetLevel);

              return (
                <div key={req.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-gray-900">{req.competency.name}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        Technical
                      </span>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Target: Level {req.targetLevel}
                    </span>
                  </div>

                  {req.competency.description && (
                    <p className="mt-1 text-xs text-gray-500">{req.competency.description}</p>
                  )}

                  {matchingLevel && (
                    <div className="mt-3 p-3 bg-white rounded border border-gray-200 text-xs text-gray-700">
                      <span className="font-semibold text-blue-800">Level {matchingLevel.level} Benchmark:</span>{' '}
                      {matchingLevel.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Behavioral Competencies Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-base font-bold text-gray-900">Behavioral Competencies</h2>
          <p className="text-xs text-gray-500 mt-0.5">Required behavioral and collaborative capabilities.</p>
        </div>

        {behavioralReqs.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No behavioral competencies configured for this role.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {behavioralReqs.map((req) => {
              const matchingLevel = req.competency.levels.find((l) => l.level === req.targetLevel);

              return (
                <div key={req.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-gray-900">{req.competency.name}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Behavioral
                      </span>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Target: Level {req.targetLevel}
                    </span>
                  </div>

                  {req.competency.description && (
                    <p className="mt-1 text-xs text-gray-500">{req.competency.description}</p>
                  )}

                  {matchingLevel && (
                    <div className="mt-3 p-3 bg-white rounded border border-gray-200 text-xs text-gray-700">
                      <span className="font-semibold text-emerald-800">Level {matchingLevel.level} Benchmark:</span>{' '}
                      {matchingLevel.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
