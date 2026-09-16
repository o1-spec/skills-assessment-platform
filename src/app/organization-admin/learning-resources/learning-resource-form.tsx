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
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-2xs">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start">
          <svg className="w-5 h-5 mr-2 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Basic details */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
          Resource Information
        </h2>

        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700">
            Title *
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced TypeScript Patterns & Best Practices"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-semibold text-gray-700">
            Resource URL *
          </label>
          <input
            id="url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://learn.example.com/course/typescript-patterns"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Must be a valid web address starting with http:// or https://.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="provider" className="block text-sm font-semibold text-gray-700">
              Provider / Platform
            </label>
            <input
              id="provider"
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. Coursera, Pluralsight, Internal Academy"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="resourceType" className="block text-sm font-semibold text-gray-700">
              Resource Type
            </label>
            <select
              id="resourceType"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value as LearningResourceType)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
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
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of course topics, prerequisites, or target learning outcomes..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
            Active (enabled for automated staff recommendations)
          </label>
        </div>
      </div>

      {/* Competency & Level Mappings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Skill & Level Mappings (OA-12)</h2>
            <p className="text-xs text-gray-500">
              Map this resource to one or more competencies and specific proficiency levels.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddMapping}
            className="inline-flex items-center px-3 py-1.5 border border-indigo-600 shadow-2xs text-xs font-semibold rounded-md text-indigo-600 bg-white hover:bg-indigo-50 transition-colors"
          >
            + Add Skill Mapping
          </button>
        </div>

        {mappings.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">
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
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Competency
                    </label>
                    <select
                      value={m.competencyId}
                      onChange={(e) => handleMappingCompetencyChange(idx, e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white text-gray-900"
                    >
                      {availableCompetencies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Target Level
                    </label>
                    <select
                      value={m.targetLevel === null ? '' : m.targetLevel}
                      onChange={(e) => handleMappingLevelChange(idx, e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white text-gray-900"
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
                      className="text-red-600 hover:text-red-800 text-xs font-semibold p-1.5 rounded-md hover:bg-red-50"
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

      {/* Form actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete Resource
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 shadow-2xs text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving...' : mode === 'create' ? 'Create Resource' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
