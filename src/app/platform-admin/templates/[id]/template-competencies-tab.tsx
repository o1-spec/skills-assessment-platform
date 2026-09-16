'use client';

import { FullIndustryTemplate } from '@/services/industry-templates';

interface TemplateCompetenciesTabProps {
  template: FullIndustryTemplate;
  availableToAddCount: number;
  technicalIncluded: FullIndustryTemplate['competencies'];
  behavioralIncluded: FullIndustryTemplate['competencies'];
  editingWeightCompId: string | null;
  weightValue: number;
  isSubmitting: boolean;
  onOpenAddCompetency: () => void;
  onSetEditingWeightCompId: (id: string | null) => void;
  onSetWeightValue: (val: number) => void;
  onUpdateWeight: (frameworkCompetencyId: string, weight: number) => void;
  onRemoveCompetency: (frameworkCompetencyId: string, compName: string) => void;
}

export function TemplateCompetenciesTab({
  template,
  availableToAddCount,
  technicalIncluded,
  behavioralIncluded,
  editingWeightCompId,
  weightValue,
  isSubmitting,
  onOpenAddCompetency,
  onSetEditingWeightCompId,
  onSetWeightValue,
  onUpdateWeight,
  onRemoveCompetency,
}: TemplateCompetenciesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Included Competencies</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Canonical skills from Framework Version {template.frameworkVersion.version} available in this template.
          </p>
        </div>
        {availableToAddCount > 0 && (
          <button
            type="button"
            onClick={onOpenAddCompetency}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            + Add Competency
          </button>
        )}
      </div>

      {template.competencies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-8 text-center text-stone-500 shadow-xs">
          <p className="text-sm font-bold text-neutral-900">No competencies included yet</p>
          <p className="text-xs text-stone-500 mt-1">Add competencies from Framework Version {template.frameworkVersion.version}.</p>
          {availableToAddCount > 0 && (
            <button
              type="button"
              onClick={onOpenAddCompetency}
              className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs cursor-pointer"
            >
              Add Competencies
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {technicalIncluded.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
              <div className="bg-stone-50/70 px-6 py-3.5 border-b border-stone-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Technical Competencies ({technicalIncluded.length})
                </span>
              </div>
              <div className="divide-y divide-stone-100">
                {technicalIncluded.map((tc) => (
                  <div key={tc.id} className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 hover:bg-stone-50/60 transition-colors">
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-neutral-900">
                          {tc.frameworkCompetency.name}
                        </span>
                        <span className="text-xs text-stone-400">
                          &bull; {tc.frameworkCompetency.category.name}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/80">
                          {tc.frameworkCompetency.levels.length} levels
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {tc.frameworkCompetency.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tc.frameworkCompetency.levels.map((lvl) => (
                          <span
                            key={lvl.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200/80"
                            title={lvl.description}
                          >
                            L{lvl.level}: {lvl.description.slice(0, 40)}...
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-start shrink-0">
                      {editingWeightCompId === tc.frameworkCompetencyId ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={weightValue}
                            onChange={(e) => onSetWeightValue(parseInt(e.target.value, 10) || 100)}
                            className="w-16 px-2 py-1 text-xs border border-stone-200/80 rounded-lg shadow-2xs"
                          />
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => onUpdateWeight(tc.frameworkCompetencyId, weightValue)}
                            className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 disabled:opacity-50 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => onSetEditingWeightCompId(null)}
                            className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs text-stone-600 font-medium">Weight: {tc.weight ?? 100}%</span>
                          <button
                            type="button"
                            onClick={() => {
                              onSetEditingWeightCompId(tc.frameworkCompetencyId);
                              onSetWeightValue(tc.weight ?? 100);
                            }}
                            className="text-[11px] text-neutral-900 hover:text-neutral-700 font-semibold underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                      <span className="text-stone-200">|</span>
                      <button
                        type="button"
                        onClick={() => onRemoveCompetency(tc.frameworkCompetencyId, tc.frameworkCompetency.name)}
                        className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {behavioralIncluded.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
              <div className="bg-purple-50/60 px-6 py-3.5 border-b border-purple-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  Behavioral Competencies ({behavioralIncluded.length})
                </span>
              </div>
              <div className="divide-y divide-stone-100">
                {behavioralIncluded.map((bc) => (
                  <div key={bc.id} className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 hover:bg-stone-50/60 transition-colors">
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-neutral-900">
                          {bc.frameworkCompetency.name}
                        </span>
                        <span className="text-xs text-stone-400">
                          &bull; {bc.frameworkCompetency.category.name}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/80">
                          {bc.frameworkCompetency.levels.length} levels
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {bc.frameworkCompetency.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {bc.frameworkCompetency.levels.map((lvl) => (
                          <span
                            key={lvl.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100"
                            title={lvl.description}
                          >
                            L{lvl.level}: {lvl.description.slice(0, 40)}...
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-start shrink-0">
                      {editingWeightCompId === bc.frameworkCompetencyId ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={weightValue}
                            onChange={(e) => onSetWeightValue(parseInt(e.target.value, 10) || 100)}
                            className="w-16 px-2 py-1 text-xs border border-stone-200/80 rounded-lg shadow-2xs"
                          />
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => onUpdateWeight(bc.frameworkCompetencyId, weightValue)}
                            className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 disabled:opacity-50 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => onSetEditingWeightCompId(null)}
                            className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs text-stone-600 font-medium">Weight: {bc.weight ?? 100}%</span>
                          <button
                            type="button"
                            onClick={() => {
                              onSetEditingWeightCompId(bc.frameworkCompetencyId);
                              onSetWeightValue(bc.weight ?? 100);
                            }}
                            className="text-[11px] text-neutral-900 hover:text-neutral-700 font-semibold underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                      <span className="text-stone-200">|</span>
                      <button
                        type="button"
                        onClick={() => onRemoveCompetency(bc.frameworkCompetencyId, bc.frameworkCompetency.name)}
                        className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
