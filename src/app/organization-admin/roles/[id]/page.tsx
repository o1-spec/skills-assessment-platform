import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantUser } from '@/lib/auth';
import { getRoleProfileById } from '@/services';
import { CompetencyType, RoleProfileStatus } from '@prisma/client';
import { formatDate, formatRoleStatus } from '@/lib/format';
import { RoleActions } from './role-actions';
import { prisma } from '@/lib/db';

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

  const assignedUsersCount = await prisma.user.count({
    where: {
      tenantId: user.tenantId,
      roleProfileId: roleProfile.id,
    },
  });

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

        <div className="sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <h1 className="text-2xl font-bold text-gray-900">{roleProfile.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isPublished
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
              >
                {formatRoleStatus(roleProfile.status)}
              </span>
              {roleProfile.isArchived && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">
                  Archived
                </span>
              )}
            </div>
            {roleProfile.description && (
              <p className="mt-2 text-sm text-gray-600 max-w-2xl">{roleProfile.description}</p>
            )}
          </div>

          <div className="mt-4 sm:mt-0 flex items-center space-x-3 shrink-0">
            <Link
              href="/organization-admin/roles"
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              &larr; Back
            </Link>
          </div>
        </div>
      </div>

      {/* Archived Warning Banner */}
      {roleProfile.isArchived && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-bold text-amber-800">This role profile is archived</h3>
              <p className="mt-1 text-xs text-amber-700">
                It cannot be assigned to new users or selected for new assessment campaigns. Existing assigned users ({assignedUsersCount}) and historical assessment records retain their link.
                {roleProfile.archivedAt && ` (Archived on ${formatDate(roleProfile.archivedAt)})`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role Management</span>
          <p className="text-xs text-gray-400">
            {isPublished
              ? 'Published roles are benchmark standards. You can safely archive them when obsolete.'
              : 'Draft roles can be edited freely before benchmark publishing.'}
          </p>
        </div>
        <RoleActions
          roleProfile={{
            id: roleProfile.id,
            name: roleProfile.name,
            status: roleProfile.status,
            isArchived: roleProfile.isArchived,
            requirementsCount: roleProfile.requirements.length,
            assignedUsersCount,
          }}
        />
      </div>

      {/* Meta Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
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
          <div className="text-xs text-gray-500 font-medium">Assigned Users</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{assignedUsersCount}</div>
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
