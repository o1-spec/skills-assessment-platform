'use client';

import { useState } from 'react';
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

export function useTemplateDetail(template: FullIndustryTemplate) {
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

  return {
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
  };
}
