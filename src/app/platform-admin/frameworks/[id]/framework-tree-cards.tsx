'use client';

import { CompetencyType, FrameworkLevel, FrameworkCompetency, FrameworkCategory } from '@prisma/client';
import { FullFrameworkCategory } from '@/services/frameworks';

export type CompetencyWithLevels = FrameworkCompetency & {
  levels: FrameworkLevel[];
};

interface CategoryTreeCardProps {
  category: FullFrameworkCategory;
  isDraft: boolean;
  onAddSubcategory: (parent: FrameworkCategory) => void;
  onEditCategory: (cat: FrameworkCategory) => void;
  onDeleteCategory: (catId: string, name: string) => void;
  onAddCompetency: (targetCat: FrameworkCategory) => void;
  onEditCompetency: (comp: CompetencyWithLevels) => void;
  onDeleteCompetency: (compId: string, name: string) => void;
  onAddLevel: (comp: CompetencyWithLevels) => void;
  onEditLevel: (lvl: FrameworkLevel) => void;
  onDeleteLevel: (lvlId: string, levelNum: number) => void;
}

export function CategoryTreeCard({
  category,
  isDraft,
  onAddSubcategory,
  onEditCategory,
  onDeleteCategory,
  onAddCompetency,
  onEditCompetency,
  onDeleteCompetency,
  onAddLevel,
  onEditLevel,
  onDeleteLevel,
}: CategoryTreeCardProps) {
  const isTechnical = category.type === CompetencyType.TECHNICAL;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
      <div className={`p-4 border-b border-stone-200/80 ${isTechnical ? 'bg-stone-50/80' : 'bg-stone-100/60'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isTechnical ? 'bg-neutral-900' : 'bg-stone-600'}`} />
              <h3 className="text-sm font-bold text-stone-900">{category.name}</h3>
              <span className="text-[11px] font-mono text-stone-600 bg-stone-200/60 px-2 py-0.5 rounded-md">Root Category</span>
            </div>
            {category.description && (
              <p className="mt-1 text-xs text-stone-600 pl-4.5">{category.description}</p>
            )}
          </div>

          {isDraft && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onAddSubcategory(category)}
                className="text-xs px-3 py-1 bg-white border border-stone-200/80 rounded-xl text-stone-700 hover:bg-stone-50 shadow-xs font-medium transition-colors cursor-pointer"
              >
                + Add Subcategory
              </button>
              <button
                type="button"
                onClick={() => onAddCompetency(category)}
                className="text-xs px-3 py-1 bg-white border border-stone-200/80 rounded-xl text-stone-700 hover:bg-stone-50 shadow-xs font-medium transition-colors cursor-pointer"
              >
                + Add Direct Skill
              </button>
              <button
                type="button"
                onClick={() => onEditCategory(category)}
                className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDeleteCategory(category.id, category.name)}
                className="text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {category.competencies && category.competencies.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Direct Competencies
            </h4>
            <div className="grid grid-cols-1 gap-4">
              {category.competencies.map((comp) => (
                <CompetencyCard
                  key={comp.id}
                  competency={comp}
                  isDraft={isDraft}
                  onEditCompetency={onEditCompetency}
                  onDeleteCompetency={onDeleteCompetency}
                  onAddLevel={onAddLevel}
                  onEditLevel={onEditLevel}
                  onDeleteLevel={onDeleteLevel}
                />
              ))}
            </div>
          </div>
        )}

        {category.children && category.children.length > 0 && (
          <div className="space-y-4">
            {category.children.map((subCat) => (
              <div key={subCat.id} className="border border-stone-200/80 rounded-2xl p-4 bg-stone-50/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200/80 pb-2.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-stone-900">{subCat.name}</span>
                      <span className="text-[10px] bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded-md font-medium">
                        Subcategory
                      </span>
                    </div>
                    {subCat.description && (
                      <p className="text-xs text-stone-500 mt-0.5">{subCat.description}</p>
                    )}
                  </div>

                  {isDraft && (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => onAddCompetency(subCat)}
                        className="text-xs px-3 py-1 bg-white border border-stone-200/80 rounded-xl text-stone-700 hover:bg-stone-50 shadow-xs font-medium transition-colors cursor-pointer"
                      >
                        + Add Competency
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditCategory(subCat)}
                        className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(subCat.id, subCat.name)}
                        className="text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {subCat.competencies && subCat.competencies.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {subCat.competencies.map((comp) => (
                      <CompetencyCard
                        key={comp.id}
                        competency={comp}
                        isDraft={isDraft}
                        onEditCompetency={onEditCompetency}
                        onDeleteCompetency={onDeleteCompetency}
                        onAddLevel={onAddLevel}
                        onEditLevel={onEditLevel}
                        onDeleteLevel={onDeleteLevel}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
                    No competencies in this subcategory yet.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {(!category.competencies || category.competencies.length === 0) &&
          (!category.children || category.children.length === 0) && (
            <div className="text-center py-4 text-xs text-stone-400">
              No subcategories or competencies in this category yet.
            </div>
          )}
      </div>
    </div>
  );
}

interface CompetencyCardProps {
  competency: CompetencyWithLevels;
  isDraft: boolean;
  onEditCompetency: (comp: CompetencyWithLevels) => void;
  onDeleteCompetency: (compId: string, name: string) => void;
  onAddLevel: (comp: CompetencyWithLevels) => void;
  onEditLevel: (lvl: FrameworkLevel) => void;
  onDeleteLevel: (lvlId: string, levelNum: number) => void;
}

export function CompetencyCard({
  competency,
  isDraft,
  onEditCompetency,
  onDeleteCompetency,
  onAddLevel,
  onEditLevel,
  onDeleteLevel,
}: CompetencyCardProps) {
  const levels = competency.levels || [];

  return (
    <div className="bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h5 className="text-sm font-bold text-stone-900">{competency.name}</h5>
            <span className="text-[11px] font-medium text-stone-600 bg-stone-100 border border-stone-200/60 px-2 py-0.5 rounded-full">
              {levels.length} {levels.length === 1 ? 'Level' : 'Levels'}
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed max-w-3xl">
            {competency.description}
          </p>
        </div>

        {isDraft && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => onAddLevel(competency)}
              className="text-xs px-3 py-1 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 shadow-xs font-medium transition-colors cursor-pointer"
            >
              + Add Level
            </button>
            <button
              type="button"
              onClick={() => onEditCompetency(competency)}
              className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDeleteCompetency(competency.id, competency.name)}
              className="text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {levels.length > 0 ? (
        <div className="pt-3 border-t border-stone-100 space-y-2">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Responsibility &amp; Competency Level Descriptors
          </div>
          <div className="space-y-1.5">
            {levels.map((lvl) => (
              <div
                key={lvl.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-stone-50/60 hover:bg-stone-100/60 text-xs transition-colors border border-stone-200/50"
              >
                <div className="flex items-start space-x-2.5 flex-1">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-neutral-900 text-white text-[11px] font-bold shrink-0 mt-0.5">
                    {lvl.level}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-stone-800 leading-relaxed">{lvl.description}</p>
                    {lvl.evidencePrompt && (
                      <p className="text-[11px] text-stone-500 italic">
                        <span className="font-semibold">Evidence Prompt:</span> {lvl.evidencePrompt}
                      </p>
                    )}
                  </div>
                </div>

                {isDraft && (
                  <div className="flex items-center space-x-2 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onEditLevel(lvl)}
                      className="text-[11px] font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLevel(lvl.id, lvl.level)}
                      className="text-[11px] font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-stone-100 text-xs text-amber-800 bg-amber-50/70 border p-2.5 rounded-xl">
          ⚠️ No level descriptors added. Every competency must have at least one level before publishing.
        </div>
      )}
    </div>
  );
}
