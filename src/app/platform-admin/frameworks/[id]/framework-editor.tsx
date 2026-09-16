'use client';

import { CompetencyType } from '@prisma/client';
import { FullFrameworkVersion } from '@/services/frameworks';
import { FrameworkEditorHeader } from './framework-editor-header';
import { FrameworkEditorModal } from './framework-editor-modal';
import { FrameworkCategorySection } from './framework-category-section';
import { useFrameworkEditor } from './use-framework-editor';

export function FrameworkEditor({
  framework,
}: {
  framework: FullFrameworkVersion;
}) {
  const isDraft = framework.status === 'DRAFT';

  const {
    isPublishing,
    globalError,
    activeModal,
    setActiveModal,
    modalLoading,
    modalError,
    setModalError,
    catName,
    setCatName,
    catDesc,
    setCatDesc,
    catType,
    setCatType,
    setCatParentId,
    compName,
    setCompName,
    compDesc,
    setCompDesc,
    setCompCatId,
    lvlNumber,
    setLvlNumber,
    lvlDesc,
    setLvlDesc,
    lvlPrompt,
    setLvlPrompt,
    setLvlCompId,
    cloneVersion,
    setCloneVersion,
    cloneDesc,
    setCloneDesc,
    handlePublish,
    handleModalSubmit,
    handleDeleteCategory,
    handleDeleteCompetency,
    handleDeleteLevel,
  } = useFrameworkEditor(framework);

  const technicalCategories = framework.categories.filter(
    (c) => c.type === CompetencyType.TECHNICAL
  );
  const behavioralCategories = framework.categories.filter(
    (c) => c.type === CompetencyType.BEHAVIORAL
  );

  return (
    <div className="space-y-6">
      <FrameworkEditorHeader
        framework={framework}
        isDraft={isDraft}
        isPublishing={isPublishing}
        globalError={globalError}
        onAddRootCategory={() => {
          setCatName('');
          setCatDesc('');
          setCatType(CompetencyType.TECHNICAL);
          setCatParentId(null);
          setModalError(null);
          setActiveModal({ type: 'createRootCategory' });
        }}
        onPublish={handlePublish}
        onCreateDraftVersion={() => {
          const parts = framework.version.split('.');
          const major = parseInt(parts[0] || '1', 10);
          const minor = parseInt(parts[1] || '0', 10);
          const suggested = parts.length > 1 ? `${major}.${minor + 1}` : `${major + 1}.0`;
          setCloneVersion(suggested);
          setCloneDesc(`Draft created from published Version ${framework.version}`);
          setModalError(null);
          setActiveModal({ type: 'cloneFramework' });
        }}
      />

      <FrameworkCategorySection
        title="Technical Framework"
        code="PA-03"
        description="Software engineering, data, infrastructure, and technical competencies."
        categories={technicalCategories}
        type={CompetencyType.TECHNICAL}
        isDraft={isDraft}
        emptyMessage="No technical categories defined yet."
        onAddRootCategory={(type) => {
          setCatName('');
          setCatDesc('');
          setCatType(type);
          setCatParentId(null);
          setModalError(null);
          setActiveModal({ type: 'createRootCategory' });
        }}
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
        onDeleteCategory={handleDeleteCategory}
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
        onDeleteCompetency={handleDeleteCompetency}
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
        onDeleteLevel={handleDeleteLevel}
      />

      <div className="pt-6">
        <FrameworkCategorySection
          title="Behavioral & Business Skills Framework"
          code="PA-04"
          description="Leadership, communication, collaboration, and professional effectiveness competencies."
          categories={behavioralCategories}
          type={CompetencyType.BEHAVIORAL}
          isDraft={isDraft}
          emptyMessage="No behavioral categories defined yet."
          onAddRootCategory={(type) => {
            setCatName('');
            setCatDesc('');
            setCatType(type);
            setCatParentId(null);
            setModalError(null);
            setActiveModal({ type: 'createRootCategory' });
          }}
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
          onDeleteCategory={handleDeleteCategory}
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
          onDeleteCompetency={handleDeleteCompetency}
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
          onDeleteLevel={handleDeleteLevel}
        />
      </div>

      <FrameworkEditorModal
        activeModal={activeModal}
        frameworkVersion={framework.version}
        modalLoading={modalLoading}
        modalError={modalError}
        catName={catName}
        setCatName={setCatName}
        catDesc={catDesc}
        setCatDesc={setCatDesc}
        catType={catType}
        setCatType={setCatType}
        compName={compName}
        setCompName={setCompName}
        compDesc={compDesc}
        setCompDesc={setCompDesc}
        lvlNumber={lvlNumber}
        setLvlNumber={setLvlNumber}
        lvlDesc={lvlDesc}
        setLvlDesc={setLvlDesc}
        lvlPrompt={lvlPrompt}
        setLvlPrompt={setLvlPrompt}
        cloneVersion={cloneVersion}
        setCloneVersion={setCloneVersion}
        cloneDesc={cloneDesc}
        setCloneDesc={setCloneDesc}
        onClose={() => setActiveModal(null)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
