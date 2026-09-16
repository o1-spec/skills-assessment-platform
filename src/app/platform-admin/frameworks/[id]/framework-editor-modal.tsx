'use client';

import React from 'react';
import { CompetencyType, FrameworkLevel, FrameworkCategory } from '@prisma/client';
import { CompetencyWithLevels } from './framework-tree-cards';

export type ModalState =
  | { type: 'createRootCategory' }
  | { type: 'createSubcategory'; data: FrameworkCategory }
  | { type: 'editCategory'; data: FrameworkCategory }
  | { type: 'createCompetency'; data: FrameworkCategory }
  | { type: 'editCompetency'; data: CompetencyWithLevels }
  | { type: 'createLevel'; data: CompetencyWithLevels }
  | { type: 'editLevel'; data: FrameworkLevel }
  | { type: 'cloneFramework' };

interface FrameworkEditorModalProps {
  activeModal: ModalState | null;
  frameworkVersion: string;
  modalLoading: boolean;
  modalError: string | null;
  catName: string;
  setCatName: (val: string) => void;
  catDesc: string;
  setCatDesc: (val: string) => void;
  catType: CompetencyType;
  setCatType: (val: CompetencyType) => void;
  compName: string;
  setCompName: (val: string) => void;
  compDesc: string;
  setCompDesc: (val: string) => void;
  lvlNumber: number | string;
  setLvlNumber: (val: number | string) => void;
  lvlDesc: string;
  setLvlDesc: (val: string) => void;
  lvlPrompt: string;
  setLvlPrompt: (val: string) => void;
  cloneVersion: string;
  setCloneVersion: (val: string) => void;
  cloneDesc: string;
  setCloneDesc: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function FrameworkEditorModal({
  activeModal,
  frameworkVersion,
  modalLoading,
  modalError,
  catName,
  setCatName,
  catDesc,
  setCatDesc,
  catType,
  setCatType,
  compName,
  setCompName,
  compDesc,
  setCompDesc,
  lvlNumber,
  setLvlNumber,
  lvlDesc,
  setLvlDesc,
  lvlPrompt,
  setLvlPrompt,
  cloneVersion,
  setCloneVersion,
  cloneDesc,
  setCloneDesc,
  onClose,
  onSubmit,
}: FrameworkEditorModalProps) {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
          <h3 className="text-base font-bold text-neutral-900">
            {activeModal.type === 'createRootCategory' && 'Add Root Category'}
            {activeModal.type === 'createSubcategory' && `Add Subcategory to "${activeModal.data.name}"`}
            {activeModal.type === 'editCategory' && `Edit Category "${activeModal.data.name}"`}
            {activeModal.type === 'createCompetency' && `Add Competency to "${activeModal.data.name}"`}
            {activeModal.type === 'editCompetency' && `Edit Competency "${activeModal.data.name}"`}
            {activeModal.type === 'createLevel' && `Add Level Descriptor to "${activeModal.data.name}"`}
            {activeModal.type === 'editLevel' && `Edit Level ${activeModal.data.level}`}
            {activeModal.type === 'cloneFramework' && `Create New Draft from Version ${frameworkVersion}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {modalError && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
              {modalError}
            </div>
          )}

          {(activeModal.type === 'createRootCategory' ||
            activeModal.type === 'createSubcategory' ||
            activeModal.type === 'editCategory') && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Backend Architecture, Team Dynamics"
                    className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Context regarding competencies within this category..."
                    className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                  />
                </div>

                {activeModal.type === 'createRootCategory' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700">
                      Framework Type
                    </label>
                    <select
                      value={catType}
                      onChange={(e) => setCatType(e.target.value as CompetencyType)}
                      className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border bg-white"
                    >
                      <option value={CompetencyType.TECHNICAL}>Technical Framework</option>
                      <option value={CompetencyType.BEHAVIORAL}>Behavioral / Business Framework</option>
                    </select>
                  </div>
                )}
              </>
            )}

          {(activeModal.type === 'createCompetency' || activeModal.type === 'editCompetency') && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Competency Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. Distributed Systems, Active Listening"
                  className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  placeholder="Detailed definition and behavioral scope of the competency..."
                  className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                />
              </div>
            </>
          )}

          {(activeModal.type === 'createLevel' || activeModal.type === 'editLevel') && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Level Number <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-stone-500 mb-1">
                  Positive integer representing the seniority / mastery depth (e.g. 1, 2, 3... N).
                </p>
                <input
                  type="number"
                  required
                  min={1}
                  value={lvlNumber}
                  onChange={(e) => setLvlNumber(parseInt(e.target.value, 10) || '')}
                  className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Level Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={lvlDesc}
                  onChange={(e) => setLvlDesc(e.target.value)}
                  placeholder="Observable behaviors, capability benchmark, and responsibility expectations at this level..."
                  className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Evidence Prompt (Optional)
                </label>
                <textarea
                  rows={2}
                  value={lvlPrompt}
                  onChange={(e) => setLvlPrompt(e.target.value)}
                  placeholder="Guidance for staff regarding what evidence or examples to provide..."
                  className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                />
              </div>
            </>
          )}

          {activeModal.type === 'cloneFramework' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  New Version Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cloneVersion}
                  onChange={(e) => setCloneVersion(e.target.value)}
                  placeholder="e.g. 1.1 or 2.0"
                  className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={cloneDesc}
                  onChange={(e) => setCloneDesc(e.target.value)}
                  placeholder="Summary of version updates..."
                  className="mt-1 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-stone-200/80">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200/80 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {modalLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
