'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CompetencyType, FrameworkLevel, FrameworkCompetency, FrameworkCategory } from '@prisma/client';
import { FullFrameworkVersion, FullFrameworkCategory } from '@/services/frameworks';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createCompetencyAction,
  updateCompetencyAction,
  deleteCompetencyAction,
  createLevelAction,
  updateLevelAction,
  deleteLevelAction,
  publishFrameworkAction,
  createDraftFromPublishedAction,
} from '@/actions/frameworks';

type CompetencyWithLevels = FrameworkCompetency & {
  levels: FrameworkLevel[];
};

type ModalState =
  | { type: 'createRootCategory' }
  | { type: 'createSubcategory'; data: FrameworkCategory }
  | { type: 'editCategory'; data: FrameworkCategory }
  | { type: 'createCompetency'; data: FrameworkCategory }
  | { type: 'editCompetency'; data: CompetencyWithLevels }
  | { type: 'createLevel'; data: CompetencyWithLevels }
  | { type: 'editLevel'; data: FrameworkLevel }
  | { type: 'cloneFramework' };

export function FrameworkEditor({
  framework,
}: {
  framework: FullFrameworkVersion;
}) {
  const router = useRouter();
  const isDraft = framework.status === 'DRAFT';

  const [isPublishing, setIsPublishing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<ModalState | null>(null);

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catType, setCatType] = useState<CompetencyType>(CompetencyType.TECHNICAL);
  const [catParentId, setCatParentId] = useState<string | null>(null);

  const [compName, setCompName] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compCatId, setCompCatId] = useState('');

  const [lvlNumber, setLvlNumber] = useState<number | string>(1);
  const [lvlDesc, setLvlDesc] = useState('');
  const [lvlPrompt, setLvlPrompt] = useState('');
  const [lvlCompId, setLvlCompId] = useState('');

  const [cloneVersion, setCloneVersion] = useState('');
  const [cloneDesc, setCloneDesc] = useState('');

  async function handlePublish() {
    if (
      !confirm(
        `Are you sure you want to publish Framework Version ${framework.version}? Once published, it becomes permanently immutable.`
      )
    ) {
      return;
    }

    setGlobalError(null);
    setIsPublishing(true);
    try {
      const res = await publishFrameworkAction(framework.id);
      if (!res.success) {
        setGlobalError(res.error || 'Failed to publish framework');
      } else {
        router.refresh();
      }
    } catch {
      setGlobalError('An unexpected error occurred while publishing.');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeModal) return;

    setModalError(null);
    setModalLoading(true);

    try {
      const formData = new FormData();

      switch (activeModal.type) {
        case 'createRootCategory': {
          formData.set('name', catName.trim());
          formData.set('description', catDesc.trim());
          formData.set('type', catType);
          const res = await createCategoryAction(framework.id, formData);
          if (!res.success) throw new Error(res.error);
          break;
        }

        case 'createSubcategory': {
          formData.set('name', catName.trim());
          formData.set('description', catDesc.trim());
          formData.set('type', catType);
          if (catParentId) formData.set('parentId', catParentId);
          const res = await createCategoryAction(framework.id, formData);
          if (!res.success) throw new Error(res.error);
          break;
        }

        case 'editCategory': {
          formData.set('name', catName.trim());
          formData.set('description', catDesc.trim());
          const res = await updateCategoryAction(framework.id, activeModal.data.id, formData);
          if (!res.success) throw new Error(res.error);
          break;
        }

        case 'createCompetency': {
          formData.set('categoryId', compCatId);
          formData.set('name', compName.trim());
          formData.set('description', compDesc.trim());
          const res = await createCompetencyAction(framework.id, formData);
          if (!res.success) throw new Error(res.error);
          break;
        }

        case 'editCompetency': {
          formData.set('name', compName.trim());
          formData.set('description', compDesc.trim());
          if (compCatId) formData.set('categoryId', compCatId);
          const res = await updateCompetencyAction(framework.id, activeModal.data.id, formData);
          if (!res.success) throw new Error(res.error);
          break;
        }

        case 'createLevel': {
          formData.set('frameworkCompetencyId', lvlCompId);
          formData.set('level', String(lvlNumber));
          formData.set('description', lvlDesc.trim());
          if (lvlPrompt.trim()) formData.set('evidencePrompt', lvlPrompt.trim());
          const res = await createLevelAction(framework.id, formData);
          if (!res.success) throw new Error(res.error);
          break;
        }

        case 'editLevel': {
          formData.set('level', String(lvlNumber));
          formData.set('description', lvlDesc.trim());
          if (lvlPrompt.trim()) formData.set('evidencePrompt', lvlPrompt.trim());
          const res = await updateLevelAction(framework.id, activeModal.data.id, formData);
          if (!res.success) throw new Error(res.error);
          break;
        }

        case 'cloneFramework': {
          formData.set('sourceVersionId', framework.id);
          formData.set('newVersion', cloneVersion.trim());
          if (cloneDesc.trim()) formData.set('description', cloneDesc.trim());
          const res = await createDraftFromPublishedAction(formData);
          if (!res.success) throw new Error(res.error);
          setActiveModal(null);
          router.push(`/platform-admin/frameworks/${res.frameworkId}`);
          return;
        }
      }

      setActiveModal(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDeleteCategory(catId: string, name: string) {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    setGlobalError(null);
    const res = await deleteCategoryAction(framework.id, catId);
    if (!res.success) {
      setGlobalError(res.error || 'Failed to delete category');
    } else {
      router.refresh();
    }
  }

  async function handleDeleteCompetency(compId: string, name: string) {
    if (!confirm(`Are you sure you want to delete competency "${name}"?`)) return;
    setGlobalError(null);
    const res = await deleteCompetencyAction(framework.id, compId);
    if (!res.success) {
      setGlobalError(res.error || 'Failed to delete competency');
    } else {
      router.refresh();
    }
  }

  async function handleDeleteLevel(lvlId: string, levelNum: number) {
    if (!confirm(`Are you sure you want to delete Level ${levelNum}?`)) return;
    setGlobalError(null);
    const res = await deleteLevelAction(framework.id, lvlId);
    if (!res.success) {
      setGlobalError(res.error || 'Failed to delete level');
    } else {
      router.refresh();
    }
  }

  const technicalCategories = framework.categories.filter(
    (c) => c.type === CompetencyType.TECHNICAL
  );
  const behavioralCategories = framework.categories.filter(
    (c) => c.type === CompetencyType.BEHAVIORAL
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
          <Link href="/platform-admin/frameworks" className="hover:text-gray-900 transition-colors">
            &larr; Back to Frameworks
          </Link>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Competency Framework v{framework.version}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                    isDraft
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {framework.status}
                </span>
              </div>
              {framework.description && (
                <p className="text-xs text-gray-600 max-w-3xl leading-relaxed">
                  {framework.description}
                </p>
              )}
              <div className="flex items-center space-x-4 text-[11px] text-gray-400 pt-1">
                <span>Created {new Date(framework.createdAt).toLocaleDateString()}</span>
                {framework.publishedAt && (
                  <span>Published {new Date(framework.publishedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {isDraft ? (
                <>
                  <button
                    onClick={() => {
                      setCatName('');
                      setCatDesc('');
                      setCatType(CompetencyType.TECHNICAL);
                      setCatParentId(null);
                      setModalError(null);
                      setActiveModal({ type: 'createRootCategory' });
                    }}
                    className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    + Add Root Category
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Framework'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    const parts = framework.version.split('.');
                    const major = parseInt(parts[0] || '1', 10);
                    const minor = parseInt(parts[1] || '0', 10);
                    const suggested = parts.length > 1 ? `${major}.${minor + 1}` : `${major + 1}.0`;
                    setCloneVersion(suggested);
                    setCloneDesc(`Draft created from published Version ${framework.version}`);
                    setModalError(null);
                    setActiveModal({ type: 'cloneFramework' });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Create New Draft Version
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isDraft && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
          <div className="text-blue-600 mt-0.5">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Published Framework &bull; Read-Only
            </h4>
            <p className="mt-0.5 text-xs text-blue-700">
              This framework is published and permanently immutable. Completed historical assessments and role profiles rely on these exact descriptors. To modify categories, skills, or levels, create a new draft version.
            </p>
          </div>
        </div>
      )}

      {globalError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-700">
          <strong>Error:</strong> {globalError}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Technical Framework (PA-03)</h2>
            <p className="text-xs text-gray-500">
              Software engineering, data, infrastructure, and technical competencies.
            </p>
          </div>
          {isDraft && (
            <button
              onClick={() => {
                setCatName('');
                setCatDesc('');
                setCatType(CompetencyType.TECHNICAL);
                setCatParentId(null);
                setModalError(null);
                setActiveModal({ type: 'createRootCategory' });
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Technical Root Category
            </button>
          )}
        </div>

        {technicalCategories.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
            No technical categories defined yet.
          </div>
        ) : (
          <div className="space-y-6">
            {technicalCategories.map((rootCat) => (
              <CategoryTreeCard
                key={rootCat.id}
                category={rootCat}
                isDraft={isDraft}
                onAddSubcategory={(parent) => {
                  setCatName('');
                  setCatDesc('');
                  setCatType(parent.type);
                  setCatParentId(parent.id);
                  setModalError(null);
                  setActiveModal({ type: 'createSubcategory', data: parent });
                }}
                onEditCategory={(cat) => {
                  setCatName(cat.name);
                  setCatDesc(cat.description || '');
                  setModalError(null);
                  setActiveModal({ type: 'editCategory', data: cat });
                }}
                onDeleteCategory={(catId, name) => handleDeleteCategory(catId, name)}
                onAddCompetency={(targetCat) => {
                  setCompName('');
                  setCompDesc('');
                  setCompCatId(targetCat.id);
                  setModalError(null);
                  setActiveModal({ type: 'createCompetency', data: targetCat });
                }}
                onEditCompetency={(comp) => {
                  setCompName(comp.name);
                  setCompDesc(comp.description);
                  setCompCatId(comp.categoryId);
                  setModalError(null);
                  setActiveModal({ type: 'editCompetency', data: comp });
                }}
                onDeleteCompetency={(compId, name) => handleDeleteCompetency(compId, name)}
                onAddLevel={(comp) => {
                  const nextLvl = (comp.levels?.length || 0) + 1;
                  setLvlNumber(nextLvl);
                  setLvlDesc('');
                  setLvlPrompt('');
                  setLvlCompId(comp.id);
                  setModalError(null);
                  setActiveModal({ type: 'createLevel', data: comp });
                }}
                onEditLevel={(lvl) => {
                  setLvlNumber(lvl.level);
                  setLvlDesc(lvl.description);
                  setLvlPrompt(lvl.evidencePrompt || '');
                  setModalError(null);
                  setActiveModal({ type: 'editLevel', data: lvl });
                }}
                onDeleteLevel={(lvlId, levelNum) => handleDeleteLevel(lvlId, levelNum)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Behavioral &amp; Business Skills Framework (PA-04)
            </h2>
            <p className="text-xs text-gray-500">
              Leadership, communication, collaboration, and professional effectiveness competencies.
            </p>
          </div>
          {isDraft && (
            <button
              onClick={() => {
                setCatName('');
                setCatDesc('');
                setCatType(CompetencyType.BEHAVIORAL);
                setCatParentId(null);
                setModalError(null);
                setActiveModal({ type: 'createRootCategory' });
              }}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              + Add Behavioral Root Category
            </button>
          )}
        </div>

        {behavioralCategories.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
            No behavioral categories defined yet.
          </div>
        ) : (
          <div className="space-y-6">
            {behavioralCategories.map((rootCat) => (
              <CategoryTreeCard
                key={rootCat.id}
                category={rootCat}
                isDraft={isDraft}
                onAddSubcategory={(parent) => {
                  setCatName('');
                  setCatDesc('');
                  setCatType(parent.type);
                  setCatParentId(parent.id);
                  setModalError(null);
                  setActiveModal({ type: 'createSubcategory', data: parent });
                }}
                onEditCategory={(cat) => {
                  setCatName(cat.name);
                  setCatDesc(cat.description || '');
                  setModalError(null);
                  setActiveModal({ type: 'editCategory', data: cat });
                }}
                onDeleteCategory={(catId, name) => handleDeleteCategory(catId, name)}
                onAddCompetency={(targetCat) => {
                  setCompName('');
                  setCompDesc('');
                  setCompCatId(targetCat.id);
                  setModalError(null);
                  setActiveModal({ type: 'createCompetency', data: targetCat });
                }}
                onEditCompetency={(comp) => {
                  setCompName(comp.name);
                  setCompDesc(comp.description);
                  setCompCatId(comp.categoryId);
                  setModalError(null);
                  setActiveModal({ type: 'editCompetency', data: comp });
                }}
                onDeleteCompetency={(compId, name) => handleDeleteCompetency(compId, name)}
                onAddLevel={(comp) => {
                  const nextLvl = (comp.levels?.length || 0) + 1;
                  setLvlNumber(nextLvl);
                  setLvlDesc('');
                  setLvlPrompt('');
                  setLvlCompId(comp.id);
                  setModalError(null);
                  setActiveModal({ type: 'createLevel', data: comp });
                }}
                onEditLevel={(lvl) => {
                  setLvlNumber(lvl.level);
                  setLvlDesc(lvl.description);
                  setLvlPrompt(lvl.evidencePrompt || '');
                  setModalError(null);
                  setActiveModal({ type: 'editLevel', data: lvl });
                }}
                onDeleteLevel={(lvlId, levelNum) => handleDeleteLevel(lvlId, levelNum)}
              />
            ))}
          </div>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {activeModal.type === 'createRootCategory' && 'Add Root Category'}
                {activeModal.type === 'createSubcategory' && `Add Subcategory to "${activeModal.data.name}"`}
                {activeModal.type === 'editCategory' && `Edit Category "${activeModal.data.name}"`}
                {activeModal.type === 'createCompetency' && `Add Competency to "${activeModal.data.name}"`}
                {activeModal.type === 'editCompetency' && `Edit Competency "${activeModal.data.name}"`}
                {activeModal.type === 'createLevel' && `Add Level Descriptor to "${activeModal.data.name}"`}
                {activeModal.type === 'editLevel' && `Edit Level ${activeModal.data.level}`}
                {activeModal.type === 'cloneFramework' && `Create New Draft from Version ${framework.version}`}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              {modalError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-md">
                  {modalError}
                </div>
              )}

              {(activeModal.type === 'createRootCategory' ||
                activeModal.type === 'createSubcategory' ||
                activeModal.type === 'editCategory') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="e.g. Backend Architecture, Team Dynamics"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="Context regarding competencies within this category..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                    />
                  </div>

                  {activeModal.type === 'createRootCategory' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">
                        Framework Type
                      </label>
                      <select
                        value={catType}
                        onChange={(e) => setCatType(e.target.value as CompetencyType)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
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
                    <label className="block text-xs font-semibold text-gray-700">
                      Competency Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="e.g. Distributed Systems, Active Listening"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={compDesc}
                      onChange={(e) => setCompDesc(e.target.value)}
                      placeholder="Detailed definition and behavioral scope of the competency..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                    />
                  </div>
                </>
              )}

              {(activeModal.type === 'createLevel' || activeModal.type === 'editLevel') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Level Number <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-gray-500 mb-1">
                      Positive integer representing the seniority / mastery depth (e.g. 1, 2, 3... N).
                    </p>
                    <input
                      type="number"
                      required
                      min={1}
                      value={lvlNumber}
                      onChange={(e) => setLvlNumber(parseInt(e.target.value, 10) || '')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Level Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={lvlDesc}
                      onChange={(e) => setLvlDesc(e.target.value)}
                      placeholder="Observable behaviors, capability benchmark, and responsibility expectations at this level..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Evidence Prompt (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={lvlPrompt}
                      onChange={(e) => setLvlPrompt(e.target.value)}
                      placeholder="Guidance for staff regarding what evidence or examples to provide..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                    />
                  </div>
                </>
              )}

              {activeModal.type === 'cloneFramework' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      New Version Identifier <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={cloneVersion}
                      onChange={(e) => setCloneVersion(e.target.value)}
                      placeholder="e.g. 1.1 or 2.0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={cloneDesc}
                      onChange={(e) => setCloneDesc(e.target.value)}
                      placeholder="Summary of version updates..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryTreeCard({
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
}: {
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
}) {
  const isTechnical = category.type === CompetencyType.TECHNICAL;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className={`p-4 border-b ${isTechnical ? 'bg-blue-50/40 border-blue-100' : 'bg-purple-50/40 border-purple-100'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isTechnical ? 'bg-blue-600' : 'bg-purple-600'}`} />
              <h3 className="text-sm font-bold text-gray-900">{category.name}</h3>
              <span className="text-[11px] font-mono text-gray-400">Root Category</span>
            </div>
            {category.description && (
              <p className="mt-1 text-xs text-gray-600 pl-4.5">{category.description}</p>
            )}
          </div>

          {isDraft && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onAddSubcategory(category)}
                className="text-xs px-2.5 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 shadow-xs"
              >
                + Add Subcategory
              </button>
              <button
                onClick={() => onAddCompetency(category)}
                className="text-xs px-2.5 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 shadow-xs"
              >
                + Add Direct Skill
              </button>
              <button
                onClick={() => onEditCategory(category)}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Edit
              </button>
              <button
                onClick={() => onDeleteCategory(category.id, category.name)}
                className="text-xs text-red-500 hover:text-red-700"
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
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
              <div key={subCat.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-2.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-800">{subCat.name}</span>
                      <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                        Subcategory
                      </span>
                    </div>
                    {subCat.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{subCat.description}</p>
                    )}
                  </div>

                  {isDraft && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onAddCompetency(subCat)}
                        className="text-xs px-2.5 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 shadow-xs"
                      >
                        + Add Competency
                      </button>
                      <button
                        onClick={() => onEditCategory(subCat)}
                        className="text-xs text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteCategory(subCat.id, subCat.name)}
                        className="text-xs text-red-500 hover:text-red-700"
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
                  <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded">
                    No competencies in this subcategory yet.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {(!category.competencies || category.competencies.length === 0) &&
          (!category.children || category.children.length === 0) && (
            <div className="text-center py-4 text-xs text-gray-400">
              No subcategories or competencies in this category yet.
            </div>
          )}
      </div>
    </div>
  );
}

function CompetencyCard({
  competency,
  isDraft,
  onEditCompetency,
  onDeleteCompetency,
  onAddLevel,
  onEditLevel,
  onDeleteLevel,
}: {
  competency: CompetencyWithLevels;
  isDraft: boolean;
  onEditCompetency: (comp: CompetencyWithLevels) => void;
  onDeleteCompetency: (compId: string, name: string) => void;
  onAddLevel: (comp: CompetencyWithLevels) => void;
  onEditLevel: (lvl: FrameworkLevel) => void;
  onDeleteLevel: (lvlId: string, levelNum: number) => void;
}) {
  const levels = competency.levels || [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h5 className="text-sm font-bold text-gray-900">{competency.name}</h5>
            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {levels.length} {levels.length === 1 ? 'Level' : 'Levels'}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
            {competency.description}
          </p>
        </div>

        {isDraft && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onAddLevel(competency)}
              className="text-xs px-2.5 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 shadow-xs font-medium"
            >
              + Add Level
            </button>
            <button
              onClick={() => onEditCompetency(competency)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Edit
            </button>
            <button
              onClick={() => onDeleteCompetency(competency.id, competency.name)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {levels.length > 0 ? (
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Responsibility &amp; Competency Level Descriptors
          </div>
          <div className="space-y-1.5">
            {levels.map((lvl) => (
              <div
                key={lvl.id}
                className="flex items-start justify-between gap-3 p-2 rounded bg-gray-50 hover:bg-gray-100/70 text-xs transition-colors"
              >
                <div className="flex items-start space-x-2.5 flex-1">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-gray-900 text-white text-[11px] font-bold shrink-0 mt-0.5">
                    {lvl.level}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-gray-800 leading-relaxed">{lvl.description}</p>
                    {lvl.evidencePrompt && (
                      <p className="text-[11px] text-gray-500 italic">
                        <span className="font-semibold">Evidence Prompt:</span> {lvl.evidencePrompt}
                      </p>
                    )}
                  </div>
                </div>

                {isDraft && (
                  <div className="flex items-center space-x-2 shrink-0 pt-0.5">
                    <button
                      onClick={() => onEditLevel(lvl)}
                      className="text-[11px] text-gray-500 hover:text-gray-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteLevel(lvl.id, lvl.level)}
                      className="text-[11px] text-red-500 hover:text-red-700"
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
        <div className="pt-2 border-t border-gray-100 text-xs text-amber-600 bg-amber-50/50 p-2 rounded">
          ⚠️ No level descriptors added. Every competency must have at least one level before publishing.
        </div>
      )}
    </div>
  );
}
