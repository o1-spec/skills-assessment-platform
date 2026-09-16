'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { createRoleProfileAction, CreateRoleFormState } from '../actions';
import { CompetencyWithLevels, AvailableTemplateRole } from '@/services';
import { CompetencyType } from '@prisma/client';

interface CreateRoleFormProps {
  competencies: CompetencyWithLevels[];
  availableTemplates?: AvailableTemplateRole[];
}

const initialState: CreateRoleFormState = {};

export function CreateRoleForm({ competencies, availableTemplates = [] }: CreateRoleFormProps) {
  const [state, formAction, isPending] = useActionState(createRoleProfileAction, initialState);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<Record<string, number>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const technicalComps = competencies.filter((c) => c.type === CompetencyType.TECHNICAL);
  const behavioralComps = competencies.filter((c) => c.type === CompetencyType.BEHAVIORAL);

  const handleLevelChange = (competencyId: string, levelStr: string) => {
    const level = parseInt(levelStr, 10);
    setSelectedLevels((prev) => {
      const next = { ...prev };
      if (isNaN(level) || level <= 0) {
        delete next[competencyId];
      } else {
        next[competencyId] = level;
      }
      return next;
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId(null);
      return;
    }

    const tpl = availableTemplates.find((t) => t.id === templateId);
    if (!tpl) return;

    setName(tpl.name);
    setDescription(tpl.description || '');

    const newLevels: Record<string, number> = {};
    for (const req of tpl.requirements) {
      newLevels[req.competencyId] = req.targetLevel;
    }
    setSelectedLevels(newLevels);
    setSelectedTemplateId(tpl.id);
  };

  const selectedCount = Object.keys(selectedLevels).length;
  const activeTemplate = availableTemplates.find((t) => t.id === selectedTemplateId);

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80">
          <div className="flex">
            <svg className="h-5 w-5 text-rose-500 mr-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-rose-800">{state.error}</span>
          </div>
        </div>
      )}

      {selectedTemplateId && (
        <input type="hidden" name="templateRoleProfileId" value={selectedTemplateId} />
      )}

      {availableTemplates.length > 0 && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2.5">
              <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-sm font-bold text-neutral-900">Pre-fill from Industry Template</h3>
            </div>
            <span className="text-xs text-stone-700 bg-stone-100 border border-stone-200/80 px-2.5 py-0.5 rounded-full font-semibold">
              {availableTemplates.length} compatible {availableTemplates.length === 1 ? 'template' : 'templates'} available
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Accelerate role creation by importing benchmark skill targets from an industry standard template compatible with your adopted framework.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <div className="flex-1">
              <label htmlFor="templateSelector" className="sr-only">
                Choose template
              </label>
              <select
                id="templateSelector"
                value={selectedTemplateId || ''}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="block w-full text-sm font-medium border border-stone-300 rounded-xl py-2.5 px-3.5 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-neutral-900 transition-colors"
              >
                <option value="">-- Choose an Industry Template Role --</option>
                {availableTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.templateName} • {tpl.mappedRequirementsCount} competencies)
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplateId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateId(null);
                  setName('');
                  setDescription('');
                  setSelectedLevels({});
                }}
                className="inline-flex items-center justify-center px-4 py-2.5 border border-stone-200/80 text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
              >
                Clear Template
              </button>
            )}
          </div>

          {activeTemplate && (
            <div className="text-xs bg-white border border-stone-200/80 rounded-xl p-3 text-stone-700 flex items-center justify-between">
              <span>
                Pre-filled from <strong className="text-neutral-900">{activeTemplate.name}</strong> ({activeTemplate.templateName}) — {activeTemplate.mappedRequirementsCount} benchmark competencies populated. You can edit any field below.
              </span>
            </div>
          )}
        </div>
      )}

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-5">
        <h2 className="text-base font-bold text-neutral-900 border-b border-stone-100 pb-3">
          Role Information
        </h2>

        <div>
          <label htmlFor="name" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Role Profile Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g., Senior Backend Engineer"
            className="w-full border border-stone-300 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-sm text-neutral-900 bg-white placeholder-stone-400 transition-colors"
          />
          {state?.fieldErrors?.name && (
            <p className="mt-1 text-xs text-rose-600 font-medium">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Description <span className="text-stone-400 font-normal">(Optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Describe the scope, expectations, and core responsibilities for this role profile..."
            className="w-full border border-stone-300 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-sm text-neutral-900 bg-white placeholder-stone-400 transition-colors"
          />
          {state?.fieldErrors?.description && (
            <p className="mt-1 text-xs text-rose-600 font-medium">{state.fieldErrors.description[0]}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between bg-stone-100/80 border border-stone-200/80 rounded-2xl px-6 py-4">
        <div className="flex items-center space-x-2.5">
          <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold text-neutral-800">
            Selected Requirements: <span className="font-bold text-neutral-900">{selectedCount}</span> of {competencies.length} competencies
          </span>
        </div>
        <span className="text-xs text-stone-500 font-medium">
          Publishing requires at least 1 competency.
        </span>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Technical Competencies</h2>
          <p className="mt-1 text-xs text-stone-500">
            Select the expected minimum target level for each technical skill required in this role.
          </p>
        </div>

        {technicalComps.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No technical competencies found for this organization.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {technicalComps.map((comp) => {
              const currentVal = selectedLevels[comp.id] ?? 0;
              const selectedLevelObj = comp.levels.find((l) => l.level === currentVal);

              return (
                <div key={comp.id} className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-neutral-900">{comp.name}</h3>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200/80">
                          Technical
                        </span>
                      </div>
                      {comp.description && (
                        <p className="mt-1 text-xs text-stone-500 line-clamp-2">{comp.description}</p>
                      )}
                    </div>

                    <div className="w-full sm:w-64">
                      <label htmlFor={`comp_${comp.id}`} className="sr-only">
                        Target level for {comp.name}
                      </label>
                      <select
                        id={`comp_${comp.id}`}
                        name={`competency_${comp.id}`}
                        value={currentVal}
                        onChange={(e) => handleLevelChange(comp.id, e.target.value)}
                        className="w-full text-xs font-semibold border border-stone-300 rounded-xl py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-neutral-900 transition-colors"
                      >
                        <option value="0">Not required</option>
                        {comp.levels.map((lvl) => (
                          <option key={lvl.id} value={lvl.level}>
                            Level {lvl.level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedLevelObj && (
                    <div className="mt-3 pt-3 border-t border-stone-200/60 text-xs text-stone-700 bg-white p-3 rounded-xl border">
                      <span className="font-semibold text-neutral-900">Level {selectedLevelObj.level} Expectation:</span>{' '}
                      {selectedLevelObj.description}
                    </div>

                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Behavioral Competencies</h2>
          <p className="mt-1 text-xs text-stone-500">
            Select the expected minimum target level for each behavioral capability.
          </p>
        </div>

        {behavioralComps.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No behavioral competencies found for this organization.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {behavioralComps.map((comp) => {
              const currentVal = selectedLevels[comp.id] ?? 0;
              const selectedLevelObj = comp.levels.find((l) => l.level === currentVal);

              return (
                <div key={comp.id} className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-neutral-900">{comp.name}</h3>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          Behavioral
                        </span>
                      </div>
                      {comp.description && (
                        <p className="mt-1 text-xs text-stone-500 line-clamp-2">{comp.description}</p>
                      )}
                    </div>

                    <div className="w-full sm:w-64">
                      <label htmlFor={`comp_${comp.id}`} className="sr-only">
                        Target level for {comp.name}
                      </label>
                      <select
                        id={`comp_${comp.id}`}
                        name={`competency_${comp.id}`}
                        value={currentVal}
                        onChange={(e) => handleLevelChange(comp.id, e.target.value)}
                        className="w-full text-xs font-semibold border border-stone-300 rounded-xl py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-neutral-900 transition-colors"
                      >
                        <option value="0">Not required</option>
                        {comp.levels.map((lvl) => (
                          <option key={lvl.id} value={lvl.level}>
                            Level {lvl.level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedLevelObj && (
                    <div className="mt-3 pt-3 border-t border-stone-200/60 text-xs text-stone-700 bg-white p-3 rounded-xl border">
                      <span className="font-semibold text-emerald-700">Level {selectedLevelObj.level} Expectation:</span>{' '}
                      {selectedLevelObj.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-stone-200/80">
        <Link
          href="/organization-admin/roles"
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
        >
          Cancel
        </Link>

        <button
          type="submit"
          name="submitAction"
          value="draft"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isPending ? 'Saving...' : 'Save as Draft'}
        </button>

        <button
          type="submit"
          name="submitAction"
          value="publish"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex justify-center items-center px-5 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isPending ? 'Publishing...' : 'Publish Role'}
        </button>
      </div>
    </form>
  );
}
