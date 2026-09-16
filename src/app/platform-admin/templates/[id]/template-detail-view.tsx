'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FullIndustryTemplate } from '@/services/industry-templates';
import {
  updateIndustryTemplateAction,
  toggleIndustryTemplateActiveAction,
  deleteIndustryTemplateAction,
  addTemplateCompetencyAction,
  updateTemplateCompetencyWeightAction,
  removeTemplateCompetencyAction,
  createTemplateRoleProfileAction,
  updateTemplateRoleProfileAction,
  deleteTemplateRoleProfileAction,
} from '@/actions/industry-templates';

interface TemplateDetailViewProps {
  template: FullIndustryTemplate;
}

export function TemplateDetailView({ template }: TemplateDetailViewProps) {
  const router = useRouter();

  // Modals & UI state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metaName, setMetaName] = useState(template.name);
  const [metaDescription, setMetaDescription] = useState(template.description || '');

  const [isAddingCompetency, setIsAddingCompetency] = useState(false);
  const [selectedCompToAdd, setSelectedCompToAdd] = useState('');

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleRequirements, setRoleRequirements] = useState<{ frameworkCompetencyId: string; targetLevel: number }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Competency weight editing state
  const [editingWeightCompId, setEditingWeightCompId] = useState<string | null>(null);
  const [weightValue, setWeightValue] = useState<number>(100);

  // Active tab inside template detail: 'competencies' | 'roles'
  const [activeTab, setActiveTab] = useState<'competencies' | 'roles'>('competencies');

  // Included competency IDs
  const includedCompIds = new Set(template.competencies.map((c) => c.frameworkCompetencyId));

  // Collect all available framework competencies in this framework version that are not yet added
  const allFrameworkCompetencies = template.frameworkVersion.categories.flatMap((cat) => {
    const direct = cat.competencies.map((c) => ({
      ...c,
      categoryName: cat.name,
      type: cat.type,
    }));
    const childComps = cat.children.flatMap((sub) =>
      sub.competencies.map((c) => ({
        ...c,
        categoryName: `${cat.name} → ${sub.name}`,
        type: sub.type,
      }))
    );
    return [...direct, ...childComps];
  });

  const availableToAdd = allFrameworkCompetencies.filter((c) => !includedCompIds.has(c.id));

  // Group included competencies
  const technicalIncluded = template.competencies.filter(
    (c) => c.frameworkCompetency.category.type === 'TECHNICAL'
  );
  const behavioralIncluded = template.competencies.filter(
    (c) => c.frameworkCompetency.category.type === 'BEHAVIORAL'
  );

  // ----------------------------------------------------
  // Handlers: Metadata
  // ----------------------------------------------------
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await updateIndustryTemplateAction(template.id, {
        name: metaName.trim(),
        description: metaDescription.trim() || undefined,
      });
      if (!res.success) {
        setError(res.error || 'Failed to update template metadata.');
        setIsSubmitting(false);
        return;
      }
      setIsEditingMetadata(false);
      setSuccessMsg('Template metadata updated successfully.');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await toggleIndustryTemplateActiveAction(template.id);
      if (!res.success) {
        setError(res.error || 'Failed to toggle status.');
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg(`Template is now ${res.template.isActive ? 'Active' : 'Inactive'}.`);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!confirm(`Are you sure you want to delete template "${template.name}"? This action cannot be undone.`)) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await deleteIndustryTemplateAction(template.id);
      if (!res.success) {
        setError(res.error || 'Failed to delete template.');
        setIsSubmitting(false);
        return;
      }
      router.push('/platform-admin/templates');
    } catch {
      setError('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Handlers: Competencies
  // ----------------------------------------------------
  const handleAddCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompToAdd) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await addTemplateCompetencyAction(template.id, selectedCompToAdd);
      if (!res.success) {
        setError(res.error || 'Failed to add competency.');
        setIsSubmitting(false);
        return;
      }
      setSelectedCompToAdd('');
      setIsAddingCompetency(false);
      setSuccessMsg('Competency added to template.');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCompetency = async (frameworkCompetencyId: string, compName: string) => {
    if (!confirm(`Remove "${compName}" from this template? Any role benchmark requirements using this competency will also be removed.`)) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await removeTemplateCompetencyAction(template.id, frameworkCompetencyId);
      if (!res.success) {
        setError(res.error || 'Failed to remove competency.');
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg(`"${compName}" removed from template.`);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateWeight = async (frameworkCompetencyId: string, weight: number) => {
    if (weight <= 0) {
      setError('Weight must be a positive integer.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await updateTemplateCompetencyWeightAction(template.id, frameworkCompetencyId, weight);
      if (!res.success) {
        setError(res.error || 'Failed to update competency weight.');
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg('Competency weight updated.');
      setEditingWeightCompId(null);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Handlers: Role Profile Builder
  // ----------------------------------------------------
  const handleOpenAddRole = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDescription('');
    setRoleRequirements([]);
    setError(null);
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: typeof template.roleProfiles[0]) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleRequirements(
      role.requirements.map((r) => ({
        frameworkCompetencyId: r.frameworkCompetencyId,
        targetLevel: r.targetLevel,
      }))
    );
    setError(null);
    setRoleModalOpen(true);
  };

  const handleToggleRoleRequirement = (frameworkCompetencyId: string) => {
    setRoleRequirements((prev) => {
      const exists = prev.find((r) => r.frameworkCompetencyId === frameworkCompetencyId);
      if (exists) {
        return prev.filter((r) => r.frameworkCompetencyId !== frameworkCompetencyId);
      } else {
        // Default to level 1 or first available level
        const comp = template.competencies.find((c) => c.frameworkCompetencyId === frameworkCompetencyId);
        const firstLevel = comp?.frameworkCompetency.levels[0]?.level || 1;
        return [...prev, { frameworkCompetencyId, targetLevel: firstLevel }];
      }
    });
  };

  const handleSetRoleTargetLevel = (frameworkCompetencyId: string, targetLevel: number) => {
    setRoleRequirements((prev) =>
      prev.map((r) => (r.frameworkCompetencyId === frameworkCompetencyId ? { ...r, targetLevel } : r))
    );
  };

  const handleSaveRoleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setError('Role profile name is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (editingRoleId) {
        const res = await updateTemplateRoleProfileAction(editingRoleId, template.id, {
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          requirements: roleRequirements,
        });
        if (!res.success) {
          setError(res.error || 'Failed to update role profile.');
          setIsSubmitting(false);
          return;
        }
        setSuccessMsg('Role profile updated.');
      } else {
        const res = await createTemplateRoleProfileAction({
          industryTemplateId: template.id,
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          requirements: roleRequirements,
        });
        if (!res.success) {
          setError(res.error || 'Failed to create role profile.');
          setIsSubmitting(false);
          return;
        }
        setSuccessMsg('Predefined role profile created.');
      }

      setRoleModalOpen(false);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoleProfile = async (roleId: string, name: string) => {
    if (!confirm(`Delete role profile "${name}"?`)) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await deleteTemplateRoleProfileAction(roleId, template.id);
      if (!res.success) {
        setError(res.error || 'Failed to delete role profile.');
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg(`Role profile "${name}" deleted.`);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back Link */}
      <div className="flex items-center space-x-4">
        <Link
          href="/platform-admin/templates"
          className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Industry Templates</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
              {template.isActive ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  Inactive
                </span>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Bound to Framework Version {template.frameworkVersion.version}
              </span>
            </div>

            {template.description && (
              <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">{template.description}</p>
            )}

            <div className="flex items-center space-x-4 text-xs text-gray-500 pt-1">
              <span>
                <strong>{template.competencies.length}</strong> canonical competencies
              </span>
              <span>&bull;</span>
              <span>
                <strong>{template.roleProfiles.length}</strong> predefined role profiles
              </span>
              <span>&bull;</span>
              <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingMetadata(true)}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isSubmitting}
              className={`px-3 py-1.5 border rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 ${
                template.isActive
                  ? 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                  : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              {template.isActive ? 'Deactivate Template' : 'Activate Template'}
            </button>
            <button
              type="button"
              onClick={handleDeleteTemplate}
              disabled={isSubmitting}
              className="px-3 py-1.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

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

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('competencies')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-semibold transition-colors flex items-center space-x-2 ${
              activeTab === 'competencies'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>Competency Library</span>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              {template.competencies.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-semibold transition-colors flex items-center space-x-2 ${
              activeTab === 'roles'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>Predefined Role Profiles</span>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              {template.roleProfiles.length}
            </span>
          </button>
        </nav>
      </div>

      {/* TAB 1: Competencies */}
      {activeTab === 'competencies' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Included Competencies</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Canonical skills from Framework Version {template.frameworkVersion.version} available in this template.
              </p>
            </div>
            {availableToAdd.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAddingCompetency(true)}
                className="inline-flex items-center px-3.5 py-1.5 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                + Add Competency
              </button>
            )}
          </div>

          {template.competencies.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              <p className="text-sm font-medium text-gray-900">No competencies included yet</p>
              <p className="text-xs text-gray-500 mt-1">Add competencies from Framework Version {template.frameworkVersion.version}.</p>
              {availableToAdd.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingCompetency(true)}
                  className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add Competencies
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Technical Section */}
              {technicalIncluded.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
                  <div className="bg-blue-50/70 px-4 py-2.5 border-b border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Technical Competencies ({technicalIncluded.length})
                    </span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {technicalIncluded.map((tc) => (
                      <div key={tc.id} className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                        <div className="space-y-1 max-w-3xl">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {tc.frameworkCompetency.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              &bull; {tc.frameworkCompetency.category.name}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                              {tc.frameworkCompetency.levels.length} levels
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {tc.frameworkCompetency.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {tc.frameworkCompetency.levels.map((lvl) => (
                              <span
                                key={lvl.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                title={lvl.description}
                              >
                                L{lvl.level}: {lvl.description.slice(0, 40)}...
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-start shrink-0">
                          {editingWeightCompId === tc.frameworkCompetencyId ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min={1}
                                max={1000}
                                value={weightValue}
                                onChange={(e) => setWeightValue(parseInt(e.target.value, 10) || 100)}
                                className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded"
                              />
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleUpdateWeight(tc.frameworkCompetencyId, weightValue)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingWeightCompId(null)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs text-gray-600 font-medium">Weight: {tc.weight ?? 100}%</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingWeightCompId(tc.frameworkCompetencyId);
                                  setWeightValue(tc.weight ?? 100);
                                }}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 underline"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCompetency(tc.frameworkCompetencyId, tc.frameworkCompetency.name)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavioral Section */}
              {behavioralIncluded.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
                  <div className="bg-purple-50/70 px-4 py-2.5 border-b border-purple-100 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                      Behavioral Competencies ({behavioralIncluded.length})
                    </span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {behavioralIncluded.map((bc) => (
                      <div key={bc.id} className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                        <div className="space-y-1 max-w-3xl">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {bc.frameworkCompetency.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              &bull; {bc.frameworkCompetency.category.name}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                              {bc.frameworkCompetency.levels.length} levels
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {bc.frameworkCompetency.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {bc.frameworkCompetency.levels.map((lvl) => (
                              <span
                                key={lvl.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100"
                                title={lvl.description}
                              >
                                L{lvl.level}: {lvl.description.slice(0, 40)}...
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-start shrink-0">
                          {editingWeightCompId === bc.frameworkCompetencyId ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min={1}
                                max={1000}
                                value={weightValue}
                                onChange={(e) => setWeightValue(parseInt(e.target.value, 10) || 100)}
                                className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded"
                              />
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleUpdateWeight(bc.frameworkCompetencyId, weightValue)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingWeightCompId(null)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs text-gray-600 font-medium">Weight: {bc.weight ?? 100}%</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingWeightCompId(bc.frameworkCompetencyId);
                                  setWeightValue(bc.weight ?? 100);
                                }}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 underline"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCompetency(bc.frameworkCompetencyId, bc.frameworkCompetency.name)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800"
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
      )}

      {/* TAB 2: Predefined Role Profiles */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Predefined Role Profiles</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Standard job role templates and target level benchmark requirements for onboarding organizations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddRole}
              disabled={template.competencies.length === 0}
              className="inline-flex items-center px-3.5 py-1.5 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              + Add Role Template
            </button>
          </div>

          {template.roleProfiles.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              <p className="text-sm font-medium text-gray-900">No role profiles defined yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Create role templates (e.g. Backend Engineer, Frontend Engineer) with competency benchmarks.
              </p>
              {template.competencies.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenAddRole}
                  className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create Role Template
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {template.roleProfiles.map((role) => (
                <div
                  key={role.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden"
                >
                  <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{role.name}</h3>
                      {role.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {role.requirements.length} requirements
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditRole(role)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Edit Role
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoleProfile(role.id, role.name)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Competency
                          </th>
                          <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Type & Category
                          </th>
                          <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Target Benchmark
                          </th>
                          <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Level Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {role.requirements.map((req) => {
                          const levelDesc =
                            req.frameworkCompetency.levels.find((l) => l.level === req.targetLevel)
                              ?.description || '—';
                          return (
                            <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-2.5 whitespace-nowrap text-xs font-semibold text-gray-900">
                                {req.frameworkCompetency.name}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    req.frameworkCompetency.category.type === 'TECHNICAL'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-purple-50 text-purple-700'
                                  }`}
                                >
                                  {req.frameworkCompetency.category.type}
                                </span>
                                <span className="ml-1.5 text-gray-400">
                                  {req.frameworkCompetency.category.name}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                                <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Level {req.targetLevel}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-600 max-w-md">
                                {levelDesc}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Edit Template Metadata */}
      {/* ---------------------------------------------------- */}
      {isEditingMetadata && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Edit Template Metadata</h3>
            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditingMetadata(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Add Competency to Template */}
      {/* ---------------------------------------------------- */}
      {isAddingCompetency && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Add Canonical Competency</h3>
            <p className="text-xs text-gray-500">
              Select a canonical competency from Framework Version {template.frameworkVersion.version} to include in this template.
            </p>

            <form onSubmit={handleAddCompetency} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Select Competency <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedCompToAdd}
                  onChange={(e) => setSelectedCompToAdd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">-- Choose Competency --</option>
                  {availableToAdd.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      [{comp.type}] {comp.name} ({comp.categoryName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddingCompetency(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCompToAdd}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add Competency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Role Template Builder (Add / Edit) */}
      {/* ---------------------------------------------------- */}
      {roleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">
                {editingRoleId ? 'Edit Role Profile Template' : 'Create Role Profile Template'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Define the role name, description, and benchmark requirements using this template’s competency library.
              </p>
            </div>

            <form onSubmit={handleSaveRoleProfile} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Role Profile Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Backend Engineer, Frontend Engineer, Tech Lead"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Role Description
                  </label>
                  <textarea
                    rows={2}
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Describe role expectations and scope..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Requirement Selection */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Competency Benchmark Requirements ({roleRequirements.length} selected)
                  </label>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {template.competencies.map((tc) => {
                    const comp = tc.frameworkCompetency;
                    const selectedReq = roleRequirements.find((r) => r.frameworkCompetencyId === comp.id);
                    const isChecked = !!selectedReq;

                    return (
                      <div
                        key={comp.id}
                        className={`p-3 rounded-md border transition-colors ${
                          isChecked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start space-x-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRoleRequirement(comp.id)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                            />
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-gray-900 flex items-center space-x-2">
                                <span>{comp.name}</span>
                                <span className="text-[10px] text-gray-400 font-normal">
                                  ({comp.category.name})
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500 line-clamp-1">
                                {comp.description}
                              </div>
                            </div>
                          </label>

                          {/* Level Selector */}
                          {isChecked && (
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[11px] font-medium text-gray-600">Target Level:</span>
                              <select
                                value={selectedReq.targetLevel}
                                onChange={(e) =>
                                  handleSetRoleTargetLevel(comp.id, parseInt(e.target.value, 10))
                                }
                                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-indigo-700"
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

                        {/* Show selected level description */}
                        {isChecked && (
                          <div className="mt-2 pl-6 pt-2 border-t border-indigo-100/60 text-[11px] text-gray-600">
                            <strong>Level {selectedReq.targetLevel} Expectation:</strong>{' '}
                            {comp.levels.find((l) => l.level === selectedReq.targetLevel)?.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingRoleId ? 'Update Role Template' : 'Create Role Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
