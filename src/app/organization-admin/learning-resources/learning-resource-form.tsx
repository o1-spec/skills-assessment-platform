'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CompetencyType, LearningResourceType } from '@prisma/client';
import {
  createLearningResourceAction,
  updateLearningResourceAction,
  deleteLearningResourceAction,
} from '@/actions/learning-resources';

export interface AvailableCompetencyOption {
  id: string;
  name: string;
  type: CompetencyType;
  levels: Array<{
    level: number;
    description: string;
  }>;
}

export interface ResourceFormInitialData {
  id?: string;
  title: string;
  description: string | null;
  url: string;
  provider: string | null;
  resourceType: LearningResourceType;
  isActive: boolean;
  mappings: Array<{
    competencyId: string;
    targetLevel: number | null;
  }>;
}

interface Props {
  initialData?: ResourceFormInitialData;
  availableCompetencies: AvailableCompetencyOption[];
  mode: 'create' | 'edit';
}

export function LearningResourceForm({ initialData, availableCompetencies, mode }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [provider, setProvider] = useState(initialData?.provider || '');
  const [resourceType, setResourceType] = useState<LearningResourceType>(
    initialData?.resourceType || LearningResourceType.COURSE
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialData?.isActive !== undefined ? initialData.isActive : true
  );

  const [mappings, setMappings] = useState<
    Array<{
      competencyId: string;
      targetLevel: number | null;
    }>
  >(initialData?.mappings || []);

  const handleAddMapping = () => {
    if (availableCompetencies.length === 0) return;
    setMappings((prev) => [
      ...prev,
      {
        competencyId: availableCompetencies[0].id,
        targetLevel: null,
      },
    ]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMappingCompetencyChange = (index: number, newCompId: string) => {
    setMappings((prev) => {
      const copy = [...prev];
      copy[index] = {
        competencyId: newCompId,
        targetLevel: null, // reset level on competency change
      };
      return copy;
    });
  };

  const handleMappingLevelChange = (index: number, levelStr: string) => {
    const parsed = levelStr === '' ? null : parseInt(levelStr, 10);
    setMappings((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        targetLevel: parsed === null || isNaN(parsed) ? null : parsed,
      };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        title,
        description: description || undefined,
        url,
        provider: provider || undefined,
        resourceType,
        isActive,
        mappings,
      };

      if (mode === 'create') {
        const res = await createLearningResourceAction(payload);
        if (!res.success) {
          setError(res.error || 'Failed to create learning resource');
        } else {
          router.push('/organization-admin/learning-resources');
          router.refresh();
        }
      } else if (initialData?.id) {
        const res = await updateLearningResourceAction(initialData.id, payload);
        if (!res.success) {
          setError(res.error || 'Failed to update learning resource');
        } else {
          router.push('/organization-admin/learning-resources');
          router.refresh();
        }
      }
    });
  };

  const handleDelete = () => {
    if (!initialData?.id) return;
    if (!confirm('Are you sure you want to delete this learning resource?')) return;

    startTransition(async () => {
      const res = await deleteLearningResourceAction(initialData.id!);
      if (!res.success) {
        setError(res.error || 'Failed to delete learning resource');
      } else {
        router.push('/organization-admin/learning-resources');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-xs">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800 flex items-start">
          <svg className="w-5 h-5 mr-2 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        <h2 className="text-base font-bold text-neutral-900 border-b border-stone-100 pb-3">
          Resource Information
        </h2>

        <div>
          <label htmlFor="title" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced TypeScript Patterns & Best Practices"
            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
            Resource URL <span className="text-rose-500">*</span>
          </label>
          <input
            id="url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://learn.example.com/course/typescript-patterns"
            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          />
          <p className="mt-1.5 text-xs text-stone-400">
            Must be a valid web address starting with http:// or https://.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="provider" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Provider / Platform
            </label>
            <input
              id="provider"
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. Coursera, Pluralsight, Internal Academy"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="resourceType" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Resource Type
            </label>
            <select
              id="resourceType"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value as LearningResourceType)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            >
              <option value={LearningResourceType.COURSE}>Course</option>
              <option value={LearningResourceType.ARTICLE}>Article</option>
              <option value={LearningResourceType.VIDEO}>Video</option>
              <option value={LearningResourceType.DOCUMENT}>Document</option>
              <option value={LearningResourceType.OTHER}>Other</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of course topics, prerequisites, or target learning outcomes..."
            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2.5 pt-2">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-neutral-900 focus:ring-neutral-900"
          />
          <label htmlFor="isActive" className="text-sm font-semibold text-neutral-800 cursor-pointer">
            Active (enabled for automated staff recommendations)
          </label>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-stone-100">
        <div className="flex items-center justify-between pb-2">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Skill & Level Mappings (OA-12)</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Map this resource to one or more competencies and specific proficiency levels.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddMapping}
            className="inline-flex items-center px-4 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
          >
            + Add Skill Mapping
          </button>
        </div>

        {mappings.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-2xl">
            <p className="text-xs text-stone-500">
              No skill mappings added yet. Click &ldquo;+ Add Skill Mapping&rdquo; to connect this resource to your skills library.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mappings.map((m, idx) => {
              const compObj = availableCompetencies.find((c) => c.id === m.competencyId);
              const compLevels = compObj?.levels || [];

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-stone-50/50 border border-stone-200/80 rounded-xl"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Competency
                    </label>
                    <select
                      value={m.competencyId}
                      onChange={(e) => handleMappingCompetencyChange(idx, e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                    >
                      {availableCompetencies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Target Level
                    </label>
                    <select
                      value={m.targetLevel === null ? '' : m.targetLevel}
                      onChange={(e) => handleMappingLevelChange(idx, e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                    >
                      <option value="">All Levels (General)</option>
                      {compLevels.map((lvl) => (
                        <option key={lvl.level} value={lvl.level}>
                          Level {lvl.level}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:pt-5">
                    <button
                      type="button"
                      onClick={() => handleRemoveMapping(idx)}
                      className="text-rose-600 hover:text-rose-800 text-xs font-semibold p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove mapping"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-stone-100">
        <div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              Delete Resource
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Saving...' : mode === 'create' ? 'Create Resource' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
