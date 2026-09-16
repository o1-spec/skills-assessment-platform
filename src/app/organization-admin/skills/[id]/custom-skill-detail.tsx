'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompetencyType } from '@prisma/client';
import { CompetencyWithLevels } from '@/services/competencies';
import {
  updateCustomCompetencyAction,
  deleteCustomCompetencyAction,
  toggleCompetencyActiveAction,
  updateCompetencyWeightAction,
} from '@/actions/skills';

interface LevelRow {
  level: number;
  description: string;
  evidencePrompt: string;
}

export function CustomSkillDetail({
  competency,
  usage = { roleRequirements: 0, campaignCompetencies: 0, assessmentItems: 0 },
}: {
  competency: CompetencyWithLevels;
  usage?: {
    roleRequirements: number;
    campaignCompetencies: number;
    assessmentItems: number;
  };
}) {
  const router = useRouter();

  const isCanonical = !competency.isCustom && Boolean(competency.frameworkCompetencyId);
  const canonicalVersion =
    competency.frameworkCompetency?.category?.frameworkVersion?.version || '1.0';

  const isUsed =
    usage.roleRequirements > 0 ||
    usage.campaignCompetencies > 0 ||
    usage.assessmentItems > 0;

  const isEditable = competency.isCustom && !isUsed;

  const [name, setName] = useState(competency.name);
  const [description, setDescription] = useState(competency.description || '');
  const [type, setType] = useState<CompetencyType>(competency.type);
  const [weight, setWeight] = useState<number>(competency.weight ?? 100);

  const [levels, setLevels] = useState<LevelRow[]>(
    competency.levels.length > 0
      ? competency.levels
          .sort((a, b) => a.level - b.level)
          .map((l) => ({
            level: l.level,
            description: l.description,
            evidencePrompt: l.evidencePrompt || '',
          }))
      : [{ level: 1, description: '', evidencePrompt: '' }]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isUpdatingWeight, setIsUpdatingWeight] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [weightSuccess, setWeightSuccess] = useState<string | null>(null);

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

  async function handleToggleActive() {
    setIsToggling(true);
    setError(null);
    try {
      const res = await toggleCompetencyActiveAction(competency.id, !competency.isActive);
      if (!res.success) {
        setError(res.error || 'Failed to update competency status');
      } else {
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsToggling(false);
    }
  }

  async function handleUpdateWeight(e: React.FormEvent) {
    e.preventDefault();
    if (weight <= 0 || weight > 1000) {
      setError('Weight must be between 1 and 1000.');
      return;
    }

    setIsUpdatingWeight(true);
    setError(null);
    setWeightSuccess(null);

    try {
      const res = await updateCompetencyWeightAction(competency.id, weight);
      if (!res.success) {
        setError(res.error || 'Failed to update skill weight');
      } else {
        setWeightSuccess('Skill weight updated successfully.');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsUpdatingWeight(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to completely delete "${competency.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const res = await deleteCustomCompetencyAction(competency.id);
      if (!res.success) {
        setError(res.error || 'Failed to delete competency');
        setIsDeleting(false);
      } else {
        router.push('/organization-admin/skills');
      }
    } catch {
      setError('An unexpected error occurred.');
      setIsDeleting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEditable) return;

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

      const res = await updateCustomCompetencyAction(competency.id, formData);
      if (!res.success) {
        setError(res.error || 'Failed to update custom competency');
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center space-x-2 text-xs text-stone-500 mb-2">
          <Link href="/organization-admin/skills" className="hover:text-neutral-900 transition-colors font-medium">
            &larr; Back to Skills Library
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{competency.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  competency.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'bg-stone-100 text-stone-600 border border-stone-200/80'
                }`}
              >
                {competency.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div className="text-xs text-stone-500 mt-1 flex items-center space-x-2">
              <span className="font-semibold text-neutral-800">
                {isCanonical ? `Canonical Framework (v${canonicalVersion})` : 'Custom Organization Competency'}
              </span>
              <span>&bull;</span>
              <span>{competency.type === CompetencyType.TECHNICAL ? 'Technical Skill' : 'Behavioral Skill'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleActive}
              disabled={isToggling}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors shadow-2xs cursor-pointer ${
                competency.isActive
                  ? 'border-stone-200/80 bg-white text-stone-700 hover:bg-stone-50'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800 border-transparent'
              }`}
            >
              {isToggling
                ? 'Updating...'
                : competency.isActive
                ? 'Deactivate Skill'
                : 'Activate Skill'}
            </button>

            {isEditable && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Skill'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Competency Weighting</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Configure the importance weighting for this skill within your organization (default: 100).
            </p>
          </div>
          <form onSubmit={handleUpdateWeight} className="flex items-center space-x-2">
            <input
              type="number"
              min={1}
              max={1000}
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value, 10) || 100)}
              className="w-20 px-3 py-1.5 text-xs border border-stone-300 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
            />
            <span className="text-xs text-stone-500 font-medium">%</span>
            <button
              type="submit"
              disabled={isUpdatingWeight || weight === (competency.weight ?? 100)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
            >
              {isUpdatingWeight ? 'Saving...' : 'Save Weight'}
            </button>
          </form>
        </div>
        {weightSuccess && <p className="text-xs text-emerald-700 font-semibold">{weightSuccess}</p>}
      </div>

      {isCanonical && (
        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 flex items-start space-x-3.5 text-xs text-stone-700">
          <div className="text-stone-500 mt-0.5 shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider text-neutral-900">
              Canonical Standard Skill
            </h4>
            <p className="mt-1 text-stone-600 leading-relaxed">
              This competency is an operational snapshot derived from platform Framework Version {canonicalVersion}. Level descriptors and criteria are centrally managed. You can activate or deactivate this skill for new role profiles and campaigns.
            </p>
          </div>
        </div>
      )}

      {competency.isCustom && isUsed && (
        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 flex items-start space-x-3.5 text-xs text-stone-700">
          <div className="text-stone-500 mt-0.5 shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider text-neutral-900">
              Structural Editing Locked (Historical Integrity)
            </h4>
            <p className="mt-1 text-stone-600 leading-relaxed">
              This custom competency is currently referenced by {usage.roleRequirements} role profiles, {usage.campaignCompetencies} campaigns, and {usage.assessmentItems} assessments. Structural edits and deletion are locked to preserve historical records. You may deactivate it instead.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Competency Name
              </label>
              <input
                type="text"
                disabled={!isEditable}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 disabled:bg-stone-50 disabled:text-stone-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Competency Type
              </label>
              <select
                disabled={!isEditable}
                value={type}
                onChange={(e) => setType(e.target.value as CompetencyType)}
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 disabled:bg-stone-50 disabled:text-stone-600"
              >
                <option value={CompetencyType.TECHNICAL}>Technical Competency</option>
                <option value={CompetencyType.BEHAVIORAL}>Behavioral / Business Competency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              disabled={!isEditable}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 disabled:bg-stone-50 disabled:text-stone-600"
            />
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Responsibility / Capability Levels ({levels.length})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {isEditable
                    ? 'Define or adjust the level progression ladder.'
                    : 'The defined level progression ladder for this competency.'}
                </p>
              </div>

              {isEditable && (
                <button
                  type="button"
                  onClick={handleAddLevel}
                  className="text-xs px-3.5 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  + Add Level
                </button>
              )}
            </div>

            <div className="space-y-3">
              {levels.map((lvl, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-neutral-900 text-white text-xs font-bold">
                        {lvl.level}
                      </span>
                      <span className="text-xs font-bold text-neutral-800">
                        Level {lvl.level} Descriptor
                      </span>
                    </div>

                    {isEditable && levels.length > 1 && (
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
                        disabled={!isEditable}
                        value={lvl.level}
                        onChange={(e) =>
                          handleLevelChange(index, 'level', parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full rounded-lg border border-stone-300 p-2 text-xs bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 disabled:bg-stone-100 disabled:text-stone-500"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        disabled={!isEditable}
                        value={lvl.description}
                        onChange={(e) => handleLevelChange(index, 'description', e.target.value)}
                        className="w-full rounded-lg border border-stone-300 p-2 text-xs bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 disabled:bg-stone-100 disabled:text-stone-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Evidence Prompt (Optional)
                    </label>
                    <input
                      type="text"
                      disabled={!isEditable}
                      value={lvl.evidencePrompt}
                      onChange={(e) => handleLevelChange(index, 'evidencePrompt', e.target.value)}
                      className="w-full rounded-lg border border-stone-300 p-2 text-xs bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 disabled:bg-stone-100 disabled:text-stone-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isEditable && (
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
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
