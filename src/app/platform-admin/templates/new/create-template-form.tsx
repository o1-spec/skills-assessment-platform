'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createIndustryTemplateAction } from '@/actions/industry-templates';

interface FrameworkCategoryWithHierarchy {
  id: string;
  name: string;
  description: string | null;
  type: 'TECHNICAL' | 'BEHAVIORAL';
  parentId: string | null;
  children: {
    id: string;
    name: string;
    description: string | null;
    type: 'TECHNICAL' | 'BEHAVIORAL';
    competencies: {
      id: string;
      name: string;
      description: string;
      levels: {
        id: string;
        level: number;
        description: string;
      }[];
    }[];
  }[];
  competencies: {
    id: string;
    name: string;
    description: string;
    levels: {
      id: string;
      level: number;
      description: string;
    }[];
  }[];
}

interface PublishedFramework {
  id: string;
  version: string;
  description: string | null;
  categories: FrameworkCategoryWithHierarchy[];
}

interface CreateTemplateFormProps {
  publishedFrameworks: PublishedFramework[];
}

export function CreateTemplateForm({ publishedFrameworks }: CreateTemplateFormProps) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFrameworkId, setSelectedFrameworkId] = useState(
    publishedFrameworks.length > 0 ? publishedFrameworks[0].id : ''
  );
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFramework = publishedFrameworks.find((f) => f.id === selectedFrameworkId);

  const rootCategories = selectedFramework
    ? selectedFramework.categories.filter((c) => !c.parentId)
    : [];

  const technicalCategories = rootCategories.filter((c) => c.type === 'TECHNICAL');
  const behavioralCategories = rootCategories.filter((c) => c.type === 'BEHAVIORAL');

  const getAllFrameworkCompetencies = () => {
    if (!selectedFramework) return [];
    const comps: {
      id: string;
      name: string;
      description: string;
      categoryName: string;
      type: 'TECHNICAL' | 'BEHAVIORAL';
      levelCount: number;
    }[] = [];

    for (const rootCat of rootCategories) {
      for (const c of rootCat.competencies) {
        comps.push({
          id: c.id,
          name: c.name,
          description: c.description,
          categoryName: rootCat.name,
          type: rootCat.type,
          levelCount: c.levels.length,
        });
      }
      for (const subCat of rootCat.children) {
        for (const c of subCat.competencies) {
          comps.push({
            id: c.id,
            name: c.name,
            description: c.description,
            categoryName: `${rootCat.name} → ${subCat.name}`,
            type: subCat.type,
            levelCount: c.levels.length,
          });
        }
      }
    }
    return comps;
  };

  const allCompetencies = getAllFrameworkCompetencies();

  const handleFrameworkChange = (newFrameworkId: string) => {
    setSelectedFrameworkId(newFrameworkId);
    setSelectedCompetencyIds(new Set());
  };

  const handleToggleCompetency = (compId: string) => {
    setSelectedCompetencyIds((prev) => {
      const next = new Set(prev);
      if (next.has(compId)) {
        next.delete(compId);
      } else {
        next.add(compId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(allCompetencies.map((c) => c.id));
    setSelectedCompetencyIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedCompetencyIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }

    if (!selectedFrameworkId) {
      setError('Please select a framework version.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createIndustryTemplateAction({
        name: name.trim(),
        description: description.trim() || undefined,
        frameworkVersionId: selectedFrameworkId,
        competencyIds: Array.from(selectedCompetencyIds),
      });

      if (!res.success) {
        setError(res.error || 'Failed to create industry template.');
        setIsSubmitting(false);
        return;
      }

      router.push(`/platform-admin/templates/${res.template.id}`);
    } catch {
      setError('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center space-x-4">
        <Link
          href="/platform-admin/templates"
          className="text-neutral-700 hover:text-neutral-900 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Industry Templates</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Create Industry Template</h1>
        <p className="mt-1 text-xs text-stone-500">
          Package a published framework version with recommended competencies and role benchmark profiles.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800 flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 border-b border-stone-100 pb-3">
            1. Template Metadata
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. IT & Software Delivery, Financial Services, HealthTech"
                className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the target industry and primary technical domains covered by this package..."
                className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Canonical Framework Version <span className="text-rose-500">*</span>
              </label>
              {publishedFrameworks.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800">
                  No published framework versions found. Please publish a framework version before creating industry templates.
                </div>
              ) : (
                <select
                  value={selectedFrameworkId}
                  onChange={(e) => handleFrameworkChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 bg-white shadow-2xs font-medium"
                >
                  {publishedFrameworks.map((f) => (
                    <option key={f.id} value={f.id}>
                      Version {f.version} {f.description ? `— ${f.description}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {selectedFramework && (
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">
                  2. Select Canonical Competencies
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select canonical competencies to package in this template ({selectedCompetencyIds.size} of {allCompetencies.length} selected).
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-stone-100 hover:bg-stone-200 border border-stone-200/80 rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {allCompetencies.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-400 font-medium">
                This framework version contains no competencies.
              </div>
            ) : (
              <div className="space-y-6">
                {technicalCategories.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-800 border border-stone-200/80">
                        Technical Competencies
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allCompetencies
                        .filter((c) => c.type === 'TECHNICAL')
                        .map((comp) => {
                          const isChecked = selectedCompetencyIds.has(comp.id);
                          return (
                            <div
                              key={comp.id}
                              onClick={() => handleToggleCompetency(comp.id)}
                              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all shadow-2xs ${
                                isChecked
                                  ? 'bg-stone-100/70 border-neutral-900 ring-1 ring-neutral-900'
                                  : 'bg-white border-stone-200/80 hover:border-stone-400'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-neutral-900 flex items-center space-x-2">
                                    <span>{comp.name}</span>
                                    <span className="text-[10px] text-stone-400 font-normal">
                                      ({comp.levelCount} levels)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                                    {comp.description}
                                  </div>
                                  <div className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                                    {comp.categoryName}
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="h-4 w-4 rounded border-stone-300 text-neutral-900 accent-neutral-900 focus:ring-neutral-900 mt-0.5 ml-2"
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {behavioralCategories.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                        Behavioral Competencies
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allCompetencies
                        .filter((c) => c.type === 'BEHAVIORAL')
                        .map((comp) => {
                          const isChecked = selectedCompetencyIds.has(comp.id);
                          return (
                            <div
                              key={comp.id}
                              onClick={() => handleToggleCompetency(comp.id)}
                              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all shadow-2xs ${
                                isChecked
                                  ? 'bg-purple-50/60 border-purple-400 ring-1 ring-purple-400'
                                  : 'bg-white border-stone-200/80 hover:border-stone-400'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-neutral-900 flex items-center space-x-2">
                                    <span>{comp.name}</span>
                                    <span className="text-[10px] text-stone-400 font-normal">
                                      ({comp.levelCount} levels)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                                    {comp.description}
                                  </div>
                                  <div className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                                    {comp.categoryName}
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="h-4 w-4 rounded border-stone-300 text-neutral-900 accent-neutral-900 focus:ring-neutral-900 mt-0.5 ml-2"
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
          <Link
            href="/platform-admin/templates"
            className="px-4 py-2 border border-stone-200/80 text-neutral-700 bg-white hover:bg-stone-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || publishedFrameworks.length === 0}
            className="px-5 py-2.5 border border-transparent text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Creating Template...' : 'Create Industry Template'}
          </button>
        </div>
      </form>
    </div>
  );
}
