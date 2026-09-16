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
      <div>
        <nav className="flex text-xs text-stone-500 mb-2 font-medium" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/organization-admin/roles" className="hover:text-neutral-900 transition-colors">
                Role Profiles
              </Link>
            </li>
            <li>
              <span className="text-stone-300">/</span>
            </li>
            <li className="text-neutral-900 font-bold truncate max-w-xs" aria-current="page">
              {roleProfile.name}
            </li>
          </ol>
        </nav>

        <div className="sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{roleProfile.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isPublished
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'bg-stone-100 text-stone-700 border border-stone-200/80'
                }`}
              >
                {formatRoleStatus(roleProfile.status)}
              </span>
              {roleProfile.isArchived && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500 border border-stone-200">
                  Archived
                </span>
              )}
            </div>
            {roleProfile.description && (
              <p className="mt-2 text-xs text-stone-500 max-w-2xl leading-relaxed">{roleProfile.description}</p>
            )}
          </div>

          <div className="mt-4 sm:mt-0 flex items-center space-x-3 shrink-0">
            <Link
              href="/organization-admin/roles"
              className="inline-flex items-center px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
            >
              &larr; Back
            </Link>
          </div>
        </div>
      </div>

      {roleProfile.isArchived && (
        <div className="bg-stone-50 border border-stone-200/80 p-5 rounded-2xl">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">This role profile is archived</h3>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                It cannot be assigned to new users or selected for new assessment campaigns. Existing assigned users ({assignedUsersCount}) and historical assessment records retain their link.
                {roleProfile.archivedAt && ` (Archived on ${formatDate(roleProfile.archivedAt)})`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Role Management</span>
          <p className="text-xs text-stone-500 mt-0.5">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Total Competencies</div>
          <div className="mt-1 text-2xl font-extrabold text-neutral-900">{roleProfile.requirements.length}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Technical / Behavioral</div>
          <div className="mt-1 text-2xl font-extrabold text-neutral-900">
            {technicalReqs.length} / {behavioralReqs.length}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Assigned Users</div>
          <div className="mt-1 text-2xl font-extrabold text-neutral-900">{assignedUsersCount}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Created On</div>
          <div className="mt-1.5 text-xs font-semibold text-neutral-800">
            {formatDate(roleProfile.createdAt)}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-base font-bold text-neutral-900">Technical Competencies</h2>
          <p className="text-xs text-stone-500 mt-0.5">Required technical benchmarks for this role.</p>
        </div>

        {technicalReqs.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No technical competencies configured for this role.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {technicalReqs.map((req) => {
              const matchingLevel = req.competency.levels.find((l) => l.level === req.targetLevel);

              return (
                <div key={req.id} className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-neutral-900">{req.competency.name}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200/80">
                        Technical
                      </span>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200/80">
                      Target: Level {req.targetLevel}
                    </span>
                  </div>

                  {req.competency.description && (
                    <p className="mt-1 text-xs text-stone-500">{req.competency.description}</p>
                  )}

                  {matchingLevel && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-stone-200/80 text-xs text-stone-700">
                      <span className="font-semibold text-neutral-900">Level {matchingLevel.level} Benchmark:</span>{' '}
                      {matchingLevel.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-base font-bold text-neutral-900">Behavioral Competencies</h2>
          <p className="text-xs text-stone-500 mt-0.5">Required behavioral and collaborative capabilities.</p>
        </div>

        {behavioralReqs.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No behavioral competencies configured for this role.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {behavioralReqs.map((req) => {
              const matchingLevel = req.competency.levels.find((l) => l.level === req.targetLevel);

              return (
                <div key={req.id} className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-neutral-900">{req.competency.name}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        Behavioral
                      </span>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Target: Level {req.targetLevel}
                    </span>
                  </div>

                  {req.competency.description && (
                    <p className="mt-1 text-xs text-stone-500">{req.competency.description}</p>
                  )}

                  {matchingLevel && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-stone-200/80 text-xs text-stone-700">
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
