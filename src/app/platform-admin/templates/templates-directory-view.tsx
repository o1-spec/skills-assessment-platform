'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IndustryTemplateWithStats } from '@/services/industry-templates';
import { toggleIndustryTemplateActiveAction } from '@/actions/industry-templates';

interface TemplatesDirectoryViewProps {
  initialTemplates: IndustryTemplateWithStats[];
}

export function TemplatesDirectoryView({ initialTemplates }: TemplatesDirectoryViewProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<IndustryTemplateWithStats[]>(initialTemplates);
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
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? template.isActive
        : !template.isActive;

    return matchesSearch && matchesStatus;
  });

  const handleToggleActive = async (templateId: string) => {
    try {
      setIsToggling(templateId);
      setError(null);
      const res = await toggleIndustryTemplateActiveAction(templateId);
      if (!res.success) {
        setError(res.error || 'Failed to toggle status.');
        return;
      }
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, isActive: !t.isActive } : t))
      );
      router.refresh();
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
          <h1 className="text-2xl font-bold text-gray-900">Industry Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Predefined competency packages and role profile benchmarks for rapid tenant onboarding.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/platform-admin/templates/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            + Create Industry Template
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start space-x-2">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            placeholder="Search templates, versions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-2.5 top-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-gray-500 font-medium">Status:</span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === filter
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              {filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white shadow-xs rounded-lg border border-gray-200 overflow-hidden">
        {filteredTemplates.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900">No industry templates found</p>
            <p className="text-xs text-gray-500 mt-1">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your filters or search terms.'
                : 'Create your first industry template to package canonical frameworks.'}
            </p>
            {!(searchTerm || statusFilter !== 'ALL') && (
              <div className="mt-4">
                <Link
                  href="/platform-admin/templates/new"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create Template
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Template & Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Framework Version
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Competencies
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Predefined Roles
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        <Link
                          href={`/platform-admin/templates/${template.id}`}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {template.name}
                        </Link>
                      </div>
                      {template.description && (
                        <div className="text-xs text-gray-500 mt-0.5 max-w-md line-clamp-2">
                          {template.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Version {template.frameworkVersion.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-gray-900">
                        {template._count.competencies} skills
                      </div>
                      <div className="text-[10px] text-gray-500">Canonical reference</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-gray-900">
                        {template._count.roleProfiles} roles
                      </div>
                      <div className="text-[10px] text-gray-500">Benchmark profiles</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {template.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <Link
                        href={`/platform-admin/templates/${template.id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        View & Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(template.id)}
                        disabled={isToggling === template.id}
                        className="text-gray-500 hover:text-gray-700 font-semibold disabled:opacity-50"
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
