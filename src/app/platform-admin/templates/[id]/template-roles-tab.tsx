'use client';

import { FullIndustryTemplate } from '@/services/industry-templates';

interface TemplateRolesTabProps {
  template: FullIndustryTemplate;
  onOpenAddRole: () => void;
  onOpenEditRole: (role: FullIndustryTemplate['roleProfiles'][0]) => void;
  onDeleteRoleProfile: (roleId: string, name: string) => void;
}

export function TemplateRolesTab({
  template,
  onOpenAddRole,
  onOpenEditRole,
  onDeleteRoleProfile,
}: TemplateRolesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Predefined Role Profiles</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Standard job role templates and target level benchmark requirements for onboarding organizations.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddRole}
          disabled={template.competencies.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          + Add Role Template
        </button>
      </div>

      {template.roleProfiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-8 text-center text-stone-500 shadow-xs">
          <p className="text-sm font-bold text-neutral-900">No role profiles defined yet</p>
          <p className="text-xs text-stone-500 mt-1">
            Create role templates (e.g. Backend Engineer, Frontend Engineer) with competency benchmarks.
          </p>
          {template.competencies.length > 0 && (
            <button
              type="button"
              onClick={onOpenAddRole}
              className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs cursor-pointer"
            >
              Create Role Template
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {template.roleProfiles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden"
            >
              <div className="p-4 bg-stone-50/70 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{role.name}</h3>
                  {role.description && (
                    <p className="text-xs text-stone-500 mt-0.5">{role.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] font-semibold text-neutral-800 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200/80">
                    {role.requirements.length} requirements
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenEditRole(role)}
                    className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 cursor-pointer"
                  >
                    Edit Role
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRoleProfile(role.id, role.name)}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-100 text-left">
                  <thead className="bg-stone-50/50">
                    <tr>
                      <th className="px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                        Competency
                      </th>
                      <th className="px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                        Type & Category
                      </th>
                      <th className="px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                        Target Benchmark
                      </th>
                      <th className="px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                        Level Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white text-xs">
                    {role.requirements.map((req) => {
                      const levelDesc =
                        req.frameworkCompetency.levels.find((l) => l.level === req.targetLevel)
                          ?.description || '—';
                      return (
                        <tr key={req.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap font-semibold text-neutral-900">
                            {req.frameworkCompetency.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-stone-500">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                                req.frameworkCompetency.category.type === 'TECHNICAL'
                                  ? 'bg-stone-100 text-stone-800 border-stone-200/80'
                                  : 'bg-purple-50 text-purple-700 border-purple-200/60'
                              }`}
                            >
                              {req.frameworkCompetency.category.type}
                            </span>
                            <span className="ml-1.5 text-stone-400">
                              {req.frameworkCompetency.category.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg font-bold bg-stone-100 text-stone-800 border border-stone-200/80">
                              Level {req.targetLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-stone-600 max-w-md leading-relaxed">
                            {levelDesc}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
