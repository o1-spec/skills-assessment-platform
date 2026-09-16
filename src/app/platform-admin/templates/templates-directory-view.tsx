'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IndustryTemplateWithCounts } from '@/services/industry-templates';
import { toggleIndustryTemplateActiveAction } from '@/actions/industry-templates';

interface Props {
  initialTemplates?: IndustryTemplateWithCounts[];
  templates?: IndustryTemplateWithCounts[];
}

export function TemplatesDirectoryView({ initialTemplates, templates: propTemplates }: Props) {
  const router = useRouter();
  const templates = initialTemplates ?? propTemplates ?? [];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      template.frameworkVersion.version.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && template.isActive) ||
      (statusFilter === 'INACTIVE' && !template.isActive);

    return matchesSearch && matchesStatus;
  });

  const handleToggleActive = async (templateId: string) => {
    setError(null);
    setIsToggling(templateId);
    try {
      const res = await toggleIndustryTemplateActiveAction(templateId);
      if (!res.success) {
        setError(res.error || 'Failed to update template status');
      } else {
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Industry Templates</h1>
          <p className="mt-1 text-xs text-stone-500">
            Predefined competency packages and role profile benchmarks for rapid tenant onboarding.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/platform-admin/templates/new"
            className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            + Create Industry Template
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800 flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            placeholder="Search templates, versions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
          />
          <svg
            className="w-4 h-4 text-stone-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Status:</span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                statusFilter === filter
                  ? 'bg-neutral-900 text-white border border-neutral-900 shadow-2xs'
                  : 'text-neutral-700 hover:bg-stone-50 border border-stone-200/80 bg-white'
              }`}
            >
              {filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 overflow-hidden">
        {filteredTemplates.length === 0 ? (
          <div className="py-12 text-center text-stone-500">
            <svg className="mx-auto h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-2 text-sm font-bold text-neutral-900">No industry templates found</p>
            <p className="text-xs text-stone-500 mt-1">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your filters or search terms.'
                : 'Create your first industry template to package canonical frameworks.'}
            </p>
            {!(searchTerm || statusFilter !== 'ALL') && (
              <div className="mt-4">
                <Link
                  href="/platform-admin/templates/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs"
                >
                  Create Template
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead className="bg-stone-50/70">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Template & Description
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Framework Version
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Competencies
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Predefined Roles
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-100 text-xs">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-neutral-900">
                        <Link
                          href={`/platform-admin/templates/${template.id}`}
                          className="hover:text-neutral-700 transition-colors"
                        >
                          {template.name}
                        </Link>
                      </div>
                      {template.description && (
                        <div className="text-xs text-stone-500 mt-0.5 max-w-md line-clamp-2 leading-relaxed">
                          {template.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                        Version {template.frameworkVersion.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-neutral-900">
                        {template._count.competencies} skills
                      </div>
                      <div className="text-[10px] text-stone-400 font-medium">Canonical reference</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-neutral-900">
                        {template._count.roleProfiles} roles
                      </div>
                      <div className="text-[10px] text-stone-400 font-medium">Benchmark profiles</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {template.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/80">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-3">
                      <Link
                        href={`/platform-admin/templates/${template.id}`}
                        className="text-neutral-900 hover:text-neutral-700 transition-colors"
                      >
                        View & Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(template.id)}
                        disabled={isToggling === template.id}
                        className="text-stone-500 hover:text-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {template.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
