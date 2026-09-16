'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompetencyType } from '@prisma/client';
import { FullFrameworkVersion } from '@/services/frameworks';
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
import { ModalState } from './framework-editor-modal';

export function useFrameworkEditor(framework: FullFrameworkVersion) {
  const router = useRouter();

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

  return {
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
    catParentId,
    setCatParentId,
    compName,
    setCompName,
    compDesc,
    setCompDesc,
    compCatId,
    setCompCatId,
    lvlNumber,
    setLvlNumber,
    lvlDesc,
    setLvlDesc,
    lvlPrompt,
    setLvlPrompt,
    lvlCompId,
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
  };
}
