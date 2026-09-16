'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CompetencyType } from '@prisma/client';
import { CompetencyWithLevels } from '@/services/competencies';
import {
  updateCustomCompetencyAction,
  toggleCompetencyActiveAction,
  deleteCustomCompetencyAction,
  updateCompetencyWeightAction,
} from '@/actions/skills';

interface LevelRow {
  level: number;
  description: string;
  evidencePrompt: string;
}

export function CustomSkillDetail({
  competency,
}: {
  competency: CompetencyWithLevels;
}) {
  const router = useRouter();
  const isCanonical = !competency.isCustom && competency.frameworkCompetencyId;
  const canonicalVersion =
    competency.frameworkCompetency?.category?.frameworkVersion?.version || '1.0';

  const usage = competency.usageCount || {
    roleRequirements: 0,
    campaignCompetencies: 0,
    assessmentItems: 0,
  };
  const totalUsage =
    usage.roleRequirements + usage.campaignCompetencies + usage.assessmentItems;
  const isUsed = totalUsage > 0;
  const isEditable = competency.isCustom && !isUsed;

  const [name, setName] = useState(competency.name);
  const [description, setDescription] = useState(competency.description || '');
  const [type, setType] = useState<CompetencyType>(competency.type);
  const [levels, setLevels] = useState<LevelRow[]>(
    competency.levels.map((l) => ({
      level: l.level,
      description: l.description,
      evidencePrompt: l.evidencePrompt || '',
    }))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weight, setWeight] = useState<number>(competency.weight ?? 100);
  const [isUpdatingWeight, setIsUpdatingWeight] = useState(false);
  const [weightSuccess, setWeightSuccess] = useState<string | null>(null);

  async function handleUpdateWeight(e: React.FormEvent) {
    e.preventDefault();
    if (weight <= 0) {
      setError('Weight must be a positive integer.');
      return;
    }
    setIsUpdatingWeight(true);
    setError(null);
    setWeightSuccess(null);
    try {
      const res = await updateCompetencyWeightAction(competency.id, weight);
      if (!res.success) {
        setError(res.error || 'Failed to update competency weight.');
      } else {
        setWeightSuccess('Competency weight updated successfully.');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsUpdatingWeight(false);
    }
  }

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
    setError(null);
    setIsToggling(true);
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

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete custom competency "${competency.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setError(null);
    setIsDeleting(true);
    try {
      const res = await deleteCustomCompetencyAction(competency.id);
      if (!res.success) {
        setError(res.error || 'Failed to delete competency');
      } else {
        router.push('/organization-admin/skills');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
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
        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
          <Link href="/organization-admin/skills" className="hover:text-gray-900 transition-colors">
            &larr; Back to Skills Library
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{competency.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  competency.isActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {competency.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
              <span className={isCanonical ? 'text-indigo-600 font-semibold' : 'text-amber-700 font-semibold'}>
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
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                competency.isActive
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
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
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Skill'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Weight Configuration Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Competency Weighting</h2>
            <p className="text-xs text-gray-500 mt-0.5">
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
              className="w-20 px-2.5 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500 font-medium">%</span>
            <button
              type="submit"
              disabled={isUpdatingWeight || weight === (competency.weight ?? 100)}
              className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isUpdatingWeight ? 'Saving...' : 'Save Weight'}
            </button>
          </form>
        </div>
        {weightSuccess && <p className="text-xs text-emerald-600 font-medium">{weightSuccess}</p>}
      </div>

      {/* Informational Banners */}
      {isCanonical && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start space-x-3 text-xs text-indigo-900">
          <div className="text-indigo-600 mt-0.5">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider text-indigo-950">
              Canonical Standard Skill
            </h4>
            <p className="mt-0.5 text-indigo-800">
              This competency is an operational snapshot derived from platform Framework Version {canonicalVersion}. Level descriptors and criteria are centrally managed. You can activate or deactivate this skill for new role profiles and campaigns.
            </p>
          </div>
        </div>
      )}

      {competency.isCustom && isUsed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3 text-xs text-amber-900">
          <div className="text-amber-600 mt-0.5">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider text-amber-950">
              Structural Editing Locked (Historical Integrity)
            </h4>
            <p className="mt-0.5 text-amber-800">
              This custom competency is currently referenced by {usage.roleRequirements} role profiles, {usage.campaignCompetencies} campaigns, and {usage.assessmentItems} assessments. Structural edits and deletion are locked to preserve historical records. You may deactivate it instead.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Main Content / Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wider">
                Competency Name
              </label>
              <input
                type="text"
                disabled={!isEditable}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none disabled:bg-gray-50 disabled:text-gray-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wider">
                Competency Type
              </label>
              <select
                disabled={!isEditable}
                value={type}
                onChange={(e) => setType(e.target.value as CompetencyType)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none disabled:bg-gray-50 disabled:text-gray-700"
              >
                <option value={CompetencyType.TECHNICAL}>Technical Competency</option>
                <option value={CompetencyType.BEHAVIORAL}>Behavioral / Business Competency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              disabled={!isEditable}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none disabled:bg-gray-50 disabled:text-gray-700"
            />
          </div>

          {/* Levels Ladder */}
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Responsibility / Capability Levels ({levels.length})
                </h3>
                <p className="text-xs text-gray-500">
                  {isEditable
                    ? 'Define or adjust the level progression ladder.'
                    : 'The defined level progression ladder for this competency.'}
                </p>
              </div>

              {isEditable && (
                <button
                  type="button"
                  onClick={handleAddLevel}
                  className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium"
                >
                  + Add Level
                </button>
              )}
            </div>

            <div className="space-y-3">
              {levels.map((lvl, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-gray-900 text-white text-xs font-bold">
                        {lvl.level}
                      </span>
                      <span className="text-xs font-bold text-gray-700">
                        Level {lvl.level} Descriptor
                      </span>
                    </div>

                    {isEditable && levels.length > 1 && (
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
                        disabled={!isEditable}
                        value={lvl.level}
                        onChange={(e) =>
                          handleLevelChange(index, 'level', parseInt(e.target.value, 10) || 1)
                        }
                        className="mt-1 w-full rounded border border-gray-300 p-1.5 text-xs disabled:bg-gray-100"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-gray-600">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        disabled={!isEditable}
                        value={lvl.description}
                        onChange={(e) => handleLevelChange(index, 'description', e.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 p-1.5 text-xs disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600">
                      Evidence Prompt (Optional)
                    </label>
                    <input
                      type="text"
                      disabled={!isEditable}
                      value={lvl.evidencePrompt}
                      onChange={(e) => handleLevelChange(index, 'evidencePrompt', e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 p-1.5 text-xs disabled:bg-gray-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isEditable && (
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
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
