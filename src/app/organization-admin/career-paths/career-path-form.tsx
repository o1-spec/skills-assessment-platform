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
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 shadow-2xs">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          1. General Information
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="path-name" className="block text-sm font-semibold text-gray-700 mb-1">
              Path Name <span className="text-red-500">*</span>
            </label>
            <input
              id="path-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Software Engineering Progression"
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="path-description" className="block text-sm font-semibold text-gray-700 mb-1">
              Description <span className="text-xs text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="path-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the expected career growth track and expectations..."
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            2. Progression Steps (Minimum 2 Roles)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Specify the sequence of published roles from junior/entry to senior/leadership.
          </p>
        </div>

        <div className="space-y-3">
          {selectedRoleIds.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
              No roles added yet. Select a role below to begin designing the progression track.
            </div>
          ) : (
            selectedRoleIds.map((roleId, idx) => {
              const role = eligibleRoles.find((r) => r.id === roleId);
              return (
                <div
                  key={roleId}
                  className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-gray-900">
                        {role?.name || 'Unknown Role'}
                      </span>
                      {role?.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{role.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move Up"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === selectedRoleIds.length - 1}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move Down"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(idx)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={selectedToAdd}
            onChange={(e) => setSelectedToAdd(e.target.value)}
            disabled={availableToAdd.length === 0}
            className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
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
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            + Add Role Step
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <Link
          href={isEditing && initialData ? `/organization-admin/career-paths/${initialData.id}` : '/organization-admin/career-paths'}
          className="px-4 py-2 border border-gray-300 shadow-2xs text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || selectedRoleIds.length < 2}
          className="px-5 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving Path...' : isEditing ? 'Save Changes' : 'Save Draft Career Path'}
        </button>
      </div>
    </form>
  );
}
