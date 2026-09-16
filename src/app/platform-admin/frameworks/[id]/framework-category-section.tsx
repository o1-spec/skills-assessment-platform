'use client';

import { CompetencyType, FrameworkLevel, FrameworkCategory } from '@prisma/client';
import { FullFrameworkCategory } from '@/services/frameworks';
import { CategoryTreeCard, CompetencyWithLevels } from './framework-tree-cards';

interface FrameworkCategorySectionProps {
  title: string;
  code: string;
  description: string;
  categories: FullFrameworkCategory[];
  type: CompetencyType;
  isDraft: boolean;
  emptyMessage: string;
  onAddRootCategory: (type: CompetencyType) => void;
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

export function FrameworkCategorySection({
  title,
  code,
  description,
  categories,
  type,
  isDraft,
  emptyMessage,
  onAddRootCategory,
  onAddSubcategory,
  onEditCategory,
  onDeleteCategory,
  onAddCompetency,
  onEditCompetency,
  onDeleteCompetency,
  onAddLevel,
  onEditLevel,
  onDeleteLevel,
}: FrameworkCategorySectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
        <div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight">
            {title} ({code})
          </h2>
          <p className="text-xs text-stone-500">{description}</p>
        </div>
        {isDraft && (
          <button
            type="button"
            onClick={() => onAddRootCategory(type)}
            className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            + Add {type === CompetencyType.TECHNICAL ? 'Technical' : 'Behavioral'} Root Category
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((rootCat) => (
            <CategoryTreeCard
              key={rootCat.id}
              category={rootCat}
              isDraft={isDraft}
              onAddSubcategory={onAddSubcategory}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
              onAddCompetency={onAddCompetency}
              onEditCompetency={onEditCompetency}
              onDeleteCompetency={onDeleteCompetency}
              onAddLevel={onAddLevel}
              onEditLevel={onEditLevel}
              onDeleteLevel={onDeleteLevel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
