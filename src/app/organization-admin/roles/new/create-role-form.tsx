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
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-red-800">{state.error}</span>
          </div>
        </div>
      )}

      {selectedTemplateId && (
        <input type="hidden" name="templateRoleProfileId" value={selectedTemplateId} />
      )}

      {availableTemplates.length > 0 && (
        <div className="bg-linear-to-r from-blue-50/70 to-indigo-50/70 rounded-lg border border-blue-200 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-sm font-bold text-blue-900">Pre-fill from Industry Template</h3>
            </div>
            <span className="text-xs text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded font-medium">
              {availableTemplates.length} compatible {availableTemplates.length === 1 ? 'template' : 'templates'} available
            </span>
          </div>
          <p className="text-xs text-blue-800">
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
                className="block w-full text-sm font-medium border border-blue-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Clear Template
              </button>
            )}
          </div>

          {activeTemplate && (
            <div className="text-xs bg-white/80 border border-blue-200 rounded p-2.5 text-blue-900 flex items-center justify-between">
              <span>
                Pre-filled from <strong>{activeTemplate.name}</strong> ({activeTemplate.templateName}) — {activeTemplate.mappedRequirementsCount} benchmark competencies populated. You can edit any field below.
              </span>
            </div>
          )}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
          Role Information
        </h2>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Role Profile Name <span className="text-red-500">*</span>
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
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
          />
          {state?.fieldErrors?.name && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Describe the scope, expectations, and core responsibilities for this role profile..."
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
          />
          {state?.fieldErrors?.description && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.description[0]}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-5 py-3">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-blue-900">
            Selected Requirements: <span className="font-bold">{selectedCount}</span> of {competencies.length} competencies
          </span>
        </div>
        <span className="text-xs text-blue-700">
          Publishing requires at least 1 competency.
        </span>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Technical Competencies</h2>
          <p className="mt-1 text-xs text-gray-500">
            Select the expected minimum target level for each technical skill required in this role.
          </p>
        </div>

        {technicalComps.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No technical competencies found for this organization.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {technicalComps.map((comp) => {
              const currentVal = selectedLevels[comp.id] ?? 0;
              const selectedLevelObj = comp.levels.find((l) => l.level === currentVal);

              return (
                <div key={comp.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-gray-900">{comp.name}</h3>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Technical
                        </span>
                      </div>
                      {comp.description && (
                        <p className="mt-1 text-xs text-gray-600">{comp.description}</p>
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
                        className="block w-full text-sm font-medium border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-700 bg-white p-2.5 rounded border">
                      <span className="font-semibold text-blue-700">Level {selectedLevelObj.level} Expectation:</span>{' '}
                      {selectedLevelObj.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Behavioral Competencies</h2>
          <p className="mt-1 text-xs text-gray-500">
            Select the expected minimum target level for each behavioral capability.
          </p>
        </div>

        {behavioralComps.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No behavioral competencies found for this organization.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {behavioralComps.map((comp) => {
              const currentVal = selectedLevels[comp.id] ?? 0;
              const selectedLevelObj = comp.levels.find((l) => l.level === currentVal);

              return (
                <div key={comp.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-gray-900">{comp.name}</h3>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Behavioral
                        </span>
                      </div>
                      {comp.description && (
                        <p className="mt-1 text-xs text-gray-600">{comp.description}</p>
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
                        className="block w-full text-sm font-medium border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-700 bg-white p-2.5 rounded border">
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

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-gray-200">
        <Link
          href="/organization-admin/roles"
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Cancel
        </Link>

        <button
          type="submit"
          name="submitAction"
          value="draft"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving...' : 'Save as Draft'}
        </button>

        <button
          type="submit"
          name="submitAction"
          value="publish"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Publishing...' : 'Publish Role'}
        </button>
      </div>
    </form>
  );
}
