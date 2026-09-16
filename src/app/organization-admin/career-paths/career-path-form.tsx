'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createCareerPathAction, updateCareerPathAction } from '@/actions/career-paths';

export interface EligibleRoleOption {
  id: string;
  name: string;
  description: string | null;
}

interface CareerPathFormProps {
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    steps: {
      roleProfileId: string;
    }[];
  };
  eligibleRoles: EligibleRoleOption[];
}

export function CareerPathForm({ initialData, eligibleRoles }: CareerPathFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
    initialData?.steps.map((s) => s.roleProfileId) || []
  );

  const [selectedToAdd, setSelectedToAdd] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableToAdd = eligibleRoles.filter((r) => !selectedRoleIds.includes(r.id));

  const handleAddRole = () => {
    if (!selectedToAdd) return;
    if (selectedRoleIds.includes(selectedToAdd)) {
      setError('This role is already included in the career path.');
      return;
    }
    setSelectedRoleIds((prev) => [...prev, selectedToAdd]);
    setSelectedToAdd('');
    setError(null);
  };

  const handleRemoveRole = (index: number) => {
    setSelectedRoleIds((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSelectedRoleIds((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedRoleIds.length - 1) return;
    setSelectedRoleIds((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Career path name is required.');
      return;
    }

    if (selectedRoleIds.length < 2) {
      setError('A career path must contain at least 2 role profiles in progression order.');
      return;
    }

    const uniqueSet = new Set(selectedRoleIds);
    if (uniqueSet.size !== selectedRoleIds.length) {
      setError('Duplicate role profiles cannot be included in the same career path.');
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
      for (const rId of selectedRoleIds) {
        formData.append('roleProfileIds', rId);
      }

      let res;
      if (isEditing && initialData) {
        res = await updateCareerPathAction(initialData.id, formData);
      } else {
        res = await createCareerPathAction(formData);
      }

      if (!res.success) {
        setError(res.error || 'Failed to save career path.');
        setIsSubmitting(false);
        return;
      }

      router.push(`/organization-admin/career-paths/${res.careerPathId}`);
    } catch {
      setError('An unexpected error occurred while saving the career path.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-4 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900 border-b border-stone-100 pb-3">
          1. General Information
        </h2>

        <div className="space-y-5">
          <div>
            <label htmlFor="path-name" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Path Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="path-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Software Engineering Progression"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="path-description" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Description <span className="text-xs text-stone-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="path-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the expected career growth track and expectations..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            2. Progression Steps (Minimum 2 Roles)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Specify the sequence of published roles from junior/entry to senior/leadership.
          </p>
        </div>

        <div className="space-y-3">
          {selectedRoleIds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-400">
              No roles added yet. Select a role below to begin designing the progression track.
            </div>
          ) : (
            selectedRoleIds.map((roleId, idx) => {
              const role = eligibleRoles.find((r) => r.id === roleId);
              return (
                <div
                  key={roleId}
                  className="flex items-center justify-between p-4 bg-stone-50/50 border border-stone-200/80 rounded-xl hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-stone-200 text-stone-800 text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-neutral-900">
                        {role?.name || 'Unknown Role'}
                      </span>
                      {role?.description && (
                        <p className="text-xs text-stone-500 line-clamp-1">{role.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === selectedRoleIds.length - 1}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <span className="text-stone-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(idx)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 p-1.5 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={selectedToAdd}
            onChange={(e) => setSelectedToAdd(e.target.value)}
            disabled={availableToAdd.length === 0}
            className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 disabled:bg-stone-100 transition-colors"
          >
            <option value="">
              {availableToAdd.length === 0
                ? '-- All published roles already added --'
                : '-- Select a published role to append to path --'}
            </option>
            {availableToAdd.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAddRole}
            disabled={!selectedToAdd}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-800 bg-white hover:bg-stone-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            + Add Role Step
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
        <Link
          href={isEditing && initialData ? `/organization-admin/career-paths/${initialData.id}` : '/organization-admin/career-paths'}
          className="px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || selectedRoleIds.length < 2}
          className="px-5 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? 'Saving Path...' : isEditing ? 'Save Changes' : 'Save Draft Career Path'}
        </button>
      </div>
    </form>
  );
}
