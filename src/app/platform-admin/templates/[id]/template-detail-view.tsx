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

  const [editingWeightCompId, setEditingWeightCompId] = useState<string | null>(null);
  const [weightValue, setWeightValue] = useState<number>(100);

  const [activeTab, setActiveTab] = useState<'competencies' | 'roles'>('competencies');

  const includedCompIds = new Set(template.competencies.map((c) => c.frameworkCompetencyId));

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

  const technicalIncluded = template.competencies.filter(
    (c) => c.frameworkCompetency.category.type === 'TECHNICAL'
  );
  const behavioralIncluded = template.competencies.filter(
    (c) => c.frameworkCompetency.category.type === 'BEHAVIORAL'
  );

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
      <div className="flex items-center space-x-4">
        <Link
          href="/platform-admin/templates"
          className="text-neutral-700 hover:text-neutral-900 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Industry Templates</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{template.name}</h1>
              {template.isActive ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/80">
                  Inactive
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                Bound to Framework Version {template.frameworkVersion.version}
              </span>
            </div>

            {template.description && (
              <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">{template.description}</p>
            )}

            <div className="flex items-center space-x-4 text-xs text-stone-500 pt-1">
              <span>
                <strong className="text-neutral-900">{template.competencies.length}</strong> canonical competencies
              </span>
              <span>&bull;</span>
              <span>
                <strong className="text-neutral-900">{template.roleProfiles.length}</strong> predefined role profiles
              </span>
              <span>&bull;</span>
              <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingMetadata(true)}
              className="px-3.5 py-2 border border-stone-200/80 text-neutral-700 bg-white hover:bg-stone-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isSubmitting}
              className={`px-3.5 py-2 border rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer ${
                template.isActive
                  ? 'border-amber-200/80 text-amber-800 bg-amber-50 hover:bg-amber-100'
                  : 'border-emerald-200/80 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              {template.isActive ? 'Deactivate Template' : 'Activate Template'}
            </button>
            <button
              type="button"
              onClick={handleDeleteTemplate}
              disabled={isSubmitting}
              className="px-3.5 py-2 border border-rose-200/80 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
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
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Included Competencies</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Canonical skills from Framework Version {template.frameworkVersion.version} available in this template.
              </p>
            </div>
            {availableToAdd.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAddingCompetency(true)}
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
              {availableToAdd.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingCompetency(true)}
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
                                onChange={(e) => setWeightValue(parseInt(e.target.value, 10) || 100)}
                                className="w-16 px-2 py-1 text-xs border border-stone-200/80 rounded-lg shadow-2xs"
                              />
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleUpdateWeight(tc.frameworkCompetencyId, weightValue)}
                                className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 disabled:opacity-50 cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingWeightCompId(null)}
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
                                  setEditingWeightCompId(tc.frameworkCompetencyId);
                                  setWeightValue(tc.weight ?? 100);
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
                            onClick={() => handleRemoveCompetency(tc.frameworkCompetencyId, tc.frameworkCompetency.name)}
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
                                onChange={(e) => setWeightValue(parseInt(e.target.value, 10) || 100)}
                                className="w-16 px-2 py-1 text-xs border border-stone-200/80 rounded-lg shadow-2xs"
                              />
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleUpdateWeight(bc.frameworkCompetencyId, weightValue)}
                                className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 disabled:opacity-50 cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingWeightCompId(null)}
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
                                  setEditingWeightCompId(bc.frameworkCompetencyId);
                                  setWeightValue(bc.weight ?? 100);
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
                            onClick={() => handleRemoveCompetency(bc.frameworkCompetencyId, bc.frameworkCompetency.name)}
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
      )}

      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Predefined Role Profiles</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Standard job role templates and target level benchmark requirements for onboarding organizations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddRole}
              disabled={template.competencies.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              + Add Role Template
            </button>
          </div>

          {template.roleProfiles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200/80 p-8 text-center text-stone-500 shadow-xs">
              <p className="text-sm font-bold text-neutral-900">No role profiles defined yet</p>
              <p className="text-xs text-stone-500 mt-1">
                Create role templates (e.g. Backend Engineer, Frontend Engineer) with competency benchmarks.
              </p>
              {template.competencies.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenAddRole}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs cursor-pointer"
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
                  className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden"
                >
                  <div className="p-4 bg-stone-50/70 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">{role.name}</h3>
                      {role.description && (
                        <p className="text-xs text-stone-500 mt-0.5">{role.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-[11px] font-semibold text-neutral-800 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200/80">
                        {role.requirements.length} requirements
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditRole(role)}
                        className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 cursor-pointer"
                      >
                        Edit Role
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoleProfile(role.id, role.name)}
                        className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-stone-100 text-left">
                      <thead className="bg-stone-50/50">
                        <tr>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                            Competency
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                            Type & Category
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                            Target Benchmark
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                            Level Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-white text-xs">
                        {role.requirements.map((req) => {
                          const levelDesc =
                            req.frameworkCompetency.levels.find((l) => l.level === req.targetLevel)
                              ?.description || '—';
                          return (
                            <tr key={req.id} className="hover:bg-stone-50/60 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap font-semibold text-neutral-900">
                                {req.frameworkCompetency.name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-stone-500">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                                    req.frameworkCompetency.category.type === 'TECHNICAL'
                                      ? 'bg-stone-100 text-stone-800 border-stone-200/80'
                                      : 'bg-purple-50 text-purple-700 border-purple-200/60'
                                  }`}
                                >
                                  {req.frameworkCompetency.category.type}
                                </span>
                                <span className="ml-1.5 text-stone-400">
                                  {req.frameworkCompetency.category.name}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg font-bold bg-stone-100 text-stone-800 border border-stone-200/80">
                                  Level {req.targetLevel}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-stone-600 max-w-md leading-relaxed">
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

      {isEditingMetadata && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900">Edit Template Metadata</h3>
            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditingMetadata(false)}
                  className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingCompetency && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900">Add Canonical Competency</h3>
            <p className="text-xs text-stone-500">
              Select a canonical competency from Framework Version {template.frameworkVersion.version} to include in this template.
            </p>

            <form onSubmit={handleAddCompetency} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Select Competency <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedCompToAdd}
                  onChange={(e) => setSelectedCompToAdd(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 bg-white shadow-2xs font-medium"
                >
                  <option value="">-- Choose Competency --</option>
                  {availableToAdd.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      [{comp.type}] {comp.name} ({comp.categoryName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddingCompetency(false)}
                  className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCompToAdd}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  Add Competency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roleModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 bg-stone-50/70">
              <h3 className="text-base font-bold text-neutral-900">
                {editingRoleId ? 'Edit Role Profile Template' : 'Create Role Profile Template'}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Define the role name, description, and benchmark requirements using this template’s competency library.
              </p>
            </div>

            <form onSubmit={handleSaveRoleProfile} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Role Profile Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Backend Engineer, Frontend Engineer, Tech Lead"
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Role Description
                  </label>
                  <textarea
                    rows={2}
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Describe role expectations and scope..."
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
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
                        className={`p-3.5 rounded-xl border transition-colors shadow-2xs ${
                          isChecked ? 'bg-stone-100/70 border-neutral-900 ring-1 ring-neutral-900' : 'bg-white border-stone-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start space-x-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRoleRequirement(comp.id)}
                              className="h-4 w-4 rounded border-stone-300 text-neutral-900 accent-neutral-900 focus:ring-neutral-900 mt-0.5"
                            />
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-neutral-900 flex items-center space-x-2">
                                <span>{comp.name}</span>
                                <span className="text-[10px] text-stone-400 font-normal">
                                  ({comp.category.name})
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-500 line-clamp-1 leading-relaxed">
                                {comp.description}
                              </div>
                            </div>
                          </label>

                          {isChecked && (
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[11px] font-medium text-stone-600">Target Level:</span>
                              <select
                                value={selectedReq.targetLevel}
                                onChange={(e) =>
                                  handleSetRoleTargetLevel(comp.id, parseInt(e.target.value, 10))
                                }
                                className="px-2.5 py-1 text-xs border border-stone-200/80 rounded-lg focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 bg-white font-bold text-neutral-900 shadow-2xs"
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

                        {isChecked && (
                          <div className="mt-2.5 pl-6 pt-2 border-t border-stone-200/60 text-[11px] text-stone-600 leading-relaxed">
                            <strong className="text-neutral-900">Level {selectedReq.targetLevel} Expectation:</strong>{' '}
                            {comp.levels.find((l) => l.level === selectedReq.targetLevel)?.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 shadow-2xs cursor-pointer"
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
