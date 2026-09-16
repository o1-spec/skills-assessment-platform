'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompetencyType } from '@prisma/client';
import { createCustomCompetencyAction } from '@/actions/skills';

interface LevelRow {
  level: number;
  description: string;
  evidencePrompt: string;
}

export function CreateCustomSkillForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CompetencyType>(CompetencyType.TECHNICAL);

  const [levels, setLevels] = useState<LevelRow[]>([
    { level: 1, description: 'Basic foundational understanding and assisted execution.', evidencePrompt: '' },
    { level: 2, description: 'Autonomous execution of routine domain tasks and problem solving.', evidencePrompt: '' },
    { level: 3, description: 'Deep technical proficiency, architecture design, and peer mentoring.', evidencePrompt: '' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAddLevel() {
    const nextLevelNum = levels.length > 0 ? Math.max(...levels.map((l) => l.level)) + 1 : 1;
    setLevels([
      ...levels,
      {
        level: nextLevelNum,
        description: '',
        evidencePrompt: '',
      },
    ]);
  }

  function handleRemoveLevel(index: number) {
    if (levels.length <= 1) {
      setError('At least one level descriptor is required.');
      return;
    }
    setLevels(levels.filter((_, i) => i !== index));
  }

  function handleLevelChange(index: number, field: keyof LevelRow, val: string | number) {
    const updated = [...levels];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    setLevels(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Competency name is required.');
      return;
    }

    if (levels.length === 0) {
      setError('At least one level descriptor is required.');
      return;
    }

    for (const lvl of levels) {
      if (!lvl.description.trim()) {
        setError(`Level ${lvl.level} must have a description.`);
        return;
      }
      if (lvl.level <= 0) {
        setError('Level numbers must be positive integers.');
        return;
      }
    }

    const uniqueLevels = new Set(levels.map((l) => l.level));
    if (uniqueLevels.size !== levels.length) {
      setError('Level numbers must be unique.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('name', name.trim());
      if (description.trim()) {
        formData.set('description', description.trim());
      }
      formData.set('type', type);
      formData.set('levels', JSON.stringify(levels));

      const res = await createCustomCompetencyAction(formData);
      if (!res.success) {
        setError(res.error || 'Failed to create custom competency');
      } else {
        router.push('/organization-admin/skills');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-gray-900 uppercase tracking-wider">
            Competency Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AWS Infrastructure, Product Discovery"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-xs font-semibold text-gray-900 uppercase tracking-wider">
            Competency Type <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as CompetencyType)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value={CompetencyType.TECHNICAL}>Technical Competency</option>
            <option value={CompetencyType.BEHAVIORAL}>Behavioral / Business Competency</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-xs font-semibold text-gray-900 uppercase tracking-wider">
          Description (Optional)
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed scope, behavioral benchmarks, and context for this skill..."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>

      <div className="pt-4 border-t border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Responsibility / Capability Levels ({levels.length})
            </h3>
            <p className="text-xs text-gray-500">
              Define the progression ladder for this skill. Any variable number of levels ($1..N$) is supported.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddLevel}
            className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium"
          >
            + Add Level
          </button>
        </div>

        <div className="space-y-3">
          {levels.map((lvl, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-gray-900 text-white text-xs font-bold">
                    {lvl.level}
                  </span>
                  <span className="text-xs font-bold text-gray-700">Level {lvl.level} Descriptor</span>
                </div>

                {levels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLevel(index)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove Level
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-600">
                    Level #
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={lvl.level}
                    onChange={(e) =>
                      handleLevelChange(index, 'level', parseInt(e.target.value, 10) || 1)
                    }
                    className="mt-1 w-full rounded border border-gray-300 p-1.5 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-gray-600">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={lvl.description}
                    onChange={(e) => handleLevelChange(index, 'description', e.target.value)}
                    placeholder="Observable capability and behavior expected at this level..."
                    className="mt-1 w-full rounded border border-gray-300 p-1.5 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600">
                  Evidence Prompt (Optional)
                </label>
                <input
                  type="text"
                  value={lvl.evidencePrompt}
                  onChange={(e) => handleLevelChange(index, 'evidencePrompt', e.target.value)}
                  placeholder="e.g. Describe a production incident or system design demonstrating this capability..."
                  className="mt-1 w-full rounded border border-gray-300 p-1.5 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 flex items-center justify-end space-x-3">
        <Link
          href="/organization-admin/skills"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Saving Competency...' : 'Save & Add to Library'}
        </button>
      </div>
    </form>
  );
}
