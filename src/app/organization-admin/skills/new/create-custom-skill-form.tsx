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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 shadow-xs space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Competency Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AWS Infrastructure, Product Discovery"
            className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm bg-white text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Competency Type <span className="text-rose-500">*</span>
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as CompetencyType)}
            className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          >
            <option value={CompetencyType.TECHNICAL}>Technical Competency</option>
            <option value={CompetencyType.BEHAVIORAL}>Behavioral / Business Competency</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
          Description (Optional)
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed scope, behavioral benchmarks, and context for this skill..."
          className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm bg-white text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
        />
      </div>

      <div className="pt-4 border-t border-stone-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Responsibility / Capability Levels ({levels.length})
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Define the progression ladder for this skill. Any variable number of levels ($1..N$) is supported.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddLevel}
            className="text-xs px-3.5 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            + Add Level
          </button>
        </div>

        <div className="space-y-3">
          {levels.map((lvl, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 space-y-3 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-neutral-900 text-white text-xs font-bold">
                    {lvl.level}
                  </span>
                  <span className="text-xs font-bold text-neutral-800">Level {lvl.level} Descriptor</span>
                </div>

                {levels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLevel(index)}
                    className="text-xs text-stone-400 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
                  >
                    Remove Level
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
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
                    className="w-full rounded-lg border border-stone-300 p-2 text-xs bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={lvl.description}
                    onChange={(e) => handleLevelChange(index, 'description', e.target.value)}
                    placeholder="Observable capability and behavior expected at this level..."
                    className="w-full rounded-lg border border-stone-300 p-2 text-xs bg-white text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Evidence Prompt (Optional)
                </label>
                <input
                  type="text"
                  value={lvl.evidencePrompt}
                  onChange={(e) => handleLevelChange(index, 'evidencePrompt', e.target.value)}
                  placeholder="e.g. Describe a production incident or system design demonstrating this capability..."
                  className="w-full rounded-lg border border-stone-300 p-2 text-xs bg-white text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-stone-100 flex items-center justify-end space-x-3">
        <Link
          href="/organization-admin/skills"
          className="px-4 py-2.5 border border-stone-200/80 rounded-xl shadow-2xs text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 border border-transparent rounded-xl shadow-2xs text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isSubmitting ? 'Saving Competency...' : 'Save & Add to Library'}
        </button>
      </div>
    </form>
  );
}
