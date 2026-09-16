'use client';

import { FullIndustryTemplate } from '@/services/industry-templates';
import { useTemplateDetail } from './use-template-detail';
import { TemplateDetailHeader } from './template-detail-header';
import { TemplateCompetenciesTab } from './template-competencies-tab';
import { TemplateRolesTab } from './template-roles-tab';
import {
  EditMetadataModal,
  AddCompetencyModal,
  RoleProfileModal,
} from './template-detail-modals';

interface TemplateDetailViewProps {
  template: FullIndustryTemplate;
}

export function TemplateDetailView({ template }: TemplateDetailViewProps) {
  const {
    isEditingMetadata,
    setIsEditingMetadata,
    metaName,
    setMetaName,
    metaDescription,
    setMetaDescription,
    isAddingCompetency,
    setIsAddingCompetency,
    selectedCompToAdd,
    setSelectedCompToAdd,
    roleModalOpen,
    setRoleModalOpen,
    editingRoleId,
    roleName,
    setRoleName,
    roleDescription,
    setRoleDescription,
    roleRequirements,
    isSubmitting,
    error,
    successMsg,
    editingWeightCompId,
    setEditingWeightCompId,
    weightValue,
    setWeightValue,
    activeTab,
    setActiveTab,
    availableToAdd,
    technicalIncluded,
    behavioralIncluded,
    handleSaveMetadata,
    handleToggleActive,
    handleDeleteTemplate,
    handleAddCompetency,
    handleRemoveCompetency,
    handleUpdateWeight,
    handleOpenAddRole,
    handleOpenEditRole,
    handleToggleRoleRequirement,
    handleSetRoleTargetLevel,
    handleSaveRoleProfile,
    handleDeleteRoleProfile,
  } = useTemplateDetail(template);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <TemplateDetailHeader
        template={template}
        isSubmitting={isSubmitting}
        onEditDetails={() => setIsEditingMetadata(true)}
        onToggleActive={handleToggleActive}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start space-x-2">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-start space-x-2">
          <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <div className="border-b border-stone-200/80">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('competencies')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 cursor-pointer ${
              activeTab === 'competencies'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-stone-500 hover:text-neutral-700 hover:border-stone-300'
            }`}
          >
            <span>Competency Library</span>
            <span className="bg-stone-100 text-stone-700 text-[10px] px-2 py-0.5 rounded-full border border-stone-200/80">
              {template.competencies.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 cursor-pointer ${
              activeTab === 'roles'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-stone-500 hover:text-neutral-700 hover:border-stone-300'
            }`}
          >
            <span>Predefined Role Profiles</span>
            <span className="bg-stone-100 text-stone-700 text-[10px] px-2 py-0.5 rounded-full border border-stone-200/80">
              {template.roleProfiles.length}
            </span>
          </button>
        </nav>
      </div>

      {activeTab === 'competencies' && (
        <TemplateCompetenciesTab
          template={template}
          availableToAddCount={availableToAdd.length}
          technicalIncluded={technicalIncluded}
          behavioralIncluded={behavioralIncluded}
          editingWeightCompId={editingWeightCompId}
          weightValue={weightValue}
          isSubmitting={isSubmitting}
          onOpenAddCompetency={() => setIsAddingCompetency(true)}
          onSetEditingWeightCompId={setEditingWeightCompId}
          onSetWeightValue={setWeightValue}
          onUpdateWeight={handleUpdateWeight}
          onRemoveCompetency={handleRemoveCompetency}
        />
      )}

      {activeTab === 'roles' && (
        <TemplateRolesTab
          template={template}
          onOpenAddRole={handleOpenAddRole}
          onOpenEditRole={handleOpenEditRole}
          onDeleteRoleProfile={handleDeleteRoleProfile}
        />
      )}

      <EditMetadataModal
        isOpen={isEditingMetadata}
        isSubmitting={isSubmitting}
        metaName={metaName}
        metaDescription={metaDescription}
        onClose={() => setIsEditingMetadata(false)}
        onNameChange={setMetaName}
        onDescriptionChange={setMetaDescription}
        onSubmit={handleSaveMetadata}
      />

      <AddCompetencyModal
        isOpen={isAddingCompetency}
        isSubmitting={isSubmitting}
        frameworkVersion={template.frameworkVersion.version}
        selectedCompToAdd={selectedCompToAdd}
        availableToAdd={availableToAdd}
        onClose={() => setIsAddingCompetency(false)}
        onSelectComp={setSelectedCompToAdd}
        onSubmit={handleAddCompetency}
      />

      <RoleProfileModal
        isOpen={roleModalOpen}
        isSubmitting={isSubmitting}
        editingRoleId={editingRoleId}
        roleName={roleName}
        roleDescription={roleDescription}
        roleRequirements={roleRequirements}
        templateCompetencies={template.competencies}
        onClose={() => setRoleModalOpen(false)}
        onRoleNameChange={setRoleName}
        onRoleDescriptionChange={setRoleDescription}
        onToggleRoleRequirement={handleToggleRoleRequirement}
        onSetRoleTargetLevel={handleSetRoleTargetLevel}
        onSubmit={handleSaveRoleProfile}
      />
    </div>
  );
}
