'use client';

import React from 'react';
import { FullIndustryTemplate } from '@/services/industry-templates';

interface EditMetadataModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  metaName: string;
  metaDescription: string;
  onClose: () => void;
  onNameChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditMetadataModal({
  isOpen,
  isSubmitting,
  metaName,
  metaDescription,
  onClose,
  onNameChange,
  onDescriptionChange,
  onSubmit,
}: EditMetadataModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200/80 max-w-lg w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-neutral-900">Edit Template Metadata</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
              Template Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={metaName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={metaDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 shadow-2xs cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddCompetencyModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  frameworkVersion: string;
  selectedCompToAdd: string;
  availableToAdd: Array<{
    id: string;
    name: string;
    type: string;
    categoryName: string;
  }>;
  onClose: () => void;
  onSelectComp: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddCompetencyModal({
  isOpen,
  isSubmitting,
  frameworkVersion,
  selectedCompToAdd,
  availableToAdd,
  onClose,
  onSelectComp,
  onSubmit,
}: AddCompetencyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200/80 max-w-lg w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-neutral-900">Add Canonical Competency</h3>
        <p className="text-xs text-stone-500">
          Select a canonical competency from Framework Version {frameworkVersion} to include in this template.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
              Select Competency <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedCompToAdd}
              onChange={(e) => onSelectComp(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 bg-white shadow-2xs font-medium"
            >
              <option value="">-- Choose Competency --</option>
              {availableToAdd.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  [{comp.type}] {comp.name} ({comp.categoryName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCompToAdd}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 shadow-2xs cursor-pointer"
            >
              Add Competency
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RoleProfileModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  editingRoleId: string | null;
  roleName: string;
  roleDescription: string;
  roleRequirements: Array<{ frameworkCompetencyId: string; targetLevel: number }>;
  templateCompetencies: FullIndustryTemplate['competencies'];
  onClose: () => void;
  onRoleNameChange: (val: string) => void;
  onRoleDescriptionChange: (val: string) => void;
  onToggleRoleRequirement: (frameworkCompetencyId: string) => void;
  onSetRoleTargetLevel: (frameworkCompetencyId: string, level: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function RoleProfileModal({
  isOpen,
  isSubmitting,
  editingRoleId,
  roleName,
  roleDescription,
  roleRequirements,
  templateCompetencies,
  onClose,
  onRoleNameChange,
  onRoleDescriptionChange,
  onToggleRoleRequirement,
  onSetRoleTargetLevel,
  onSubmit,
}: RoleProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200/80 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/70">
          <h3 className="text-base font-bold text-neutral-900">
            {editingRoleId ? 'Edit Role Profile Template' : 'Create Role Profile Template'}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Define the role name, description, and benchmark requirements using this template’s competency library.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Role Profile Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={roleName}
                onChange={(e) => onRoleNameChange(e.target.value)}
                placeholder="e.g. Backend Engineer, Frontend Engineer, Tech Lead"
                className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Role Description
              </label>
              <textarea
                rows={2}
                value={roleDescription}
                onChange={(e) => onRoleDescriptionChange(e.target.value)}
                placeholder="Describe role expectations and scope..."
                className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
              />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Competency Benchmark Requirements ({roleRequirements.length} selected)
              </label>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {templateCompetencies.map((tc) => {
                const comp = tc.frameworkCompetency;
                const selectedReq = roleRequirements.find((r) => r.frameworkCompetencyId === comp.id);
                const isChecked = !!selectedReq;

                return (
                  <div
                    key={comp.id}
                    className={`p-3.5 rounded-xl border transition-colors shadow-2xs ${
                      isChecked ? 'bg-stone-100/70 border-neutral-900 ring-1 ring-neutral-900' : 'bg-white border-stone-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start space-x-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleRoleRequirement(comp.id)}
                          className="h-4 w-4 rounded border-stone-300 text-neutral-900 accent-neutral-900 focus:ring-neutral-900 mt-0.5"
                        />
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-neutral-900 flex items-center space-x-2">
                            <span>{comp.name}</span>
                            <span className="text-[10px] text-stone-400 font-normal">
                              ({comp.category.name})
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 line-clamp-1 leading-relaxed">
                            {comp.description}
                          </div>
                        </div>
                      </label>

                      {isChecked && (
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[11px] font-medium text-stone-600">Target Level:</span>
                          <select
                            value={selectedReq.targetLevel}
                            onChange={(e) =>
                              onSetRoleTargetLevel(comp.id, parseInt(e.target.value, 10))
                            }
                            className="px-2.5 py-1 text-xs border border-stone-200/80 rounded-lg focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 bg-white font-bold text-neutral-900 shadow-2xs"
                          >
                            {comp.levels.map((lvl) => (
                              <option key={lvl.id} value={lvl.level}>
                                Level {lvl.level}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {isChecked && (
                      <div className="mt-2.5 pl-6 pt-2 border-t border-stone-200/60 text-[11px] text-stone-600 leading-relaxed">
                        <strong className="text-neutral-900">Level {selectedReq.targetLevel} Expectation:</strong>{' '}
                        {comp.levels.find((l) => l.level === selectedReq.targetLevel)?.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 shadow-2xs cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : editingRoleId ? 'Update Role Template' : 'Create Role Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
