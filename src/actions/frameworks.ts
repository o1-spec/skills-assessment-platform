'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import {
  createFrameworkDraftSchema,
  createCategorySchema,
  updateCategorySchema,
  createCompetencySchema,
  updateCompetencySchema,
  createLevelSchema,
  updateLevelSchema,
  createDraftFromPublishedSchema,
} from '@/lib/validation/framework';
import {
  createFrameworkDraft,
  createFrameworkCategory,
  updateFrameworkCategory,
  deleteFrameworkCategory,
  createFrameworkCompetency,
  updateFrameworkCompetency,
  deleteFrameworkCompetency,
  createFrameworkLevel,
  updateFrameworkLevel,
  deleteFrameworkLevel,
  publishFrameworkVersion,
  createDraftFromPublishedVersion,
} from '@/services/frameworks';

export async function createFrameworkDraftAction(formData: FormData) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      version: formData.get('version'),
      description: formData.get('description'),
    };

    const parsed = createFrameworkDraftSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    const draft = await createFrameworkDraft(parsed.data);
    revalidatePath('/platform-admin/frameworks');
    return { success: true, frameworkId: draft.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function createCategoryAction(frameworkVersionId: string, formData: FormData) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      name: formData.get('name'),
      description: formData.get('description'),
      type: formData.get('type'),
      parentId: formData.get('parentId') || null,
    };

    const parsed = createCategorySchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    await createFrameworkCategory(frameworkVersionId, parsed.data);
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function updateCategoryAction(
  frameworkVersionId: string,
  categoryId: string,
  formData: FormData
) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      name: formData.get('name') || undefined,
      description: formData.get('description') || undefined,
    };

    const parsed = updateCategorySchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    await updateFrameworkCategory(categoryId, parsed.data);
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function deleteCategoryAction(frameworkVersionId: string, categoryId: string) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    await deleteFrameworkCategory(categoryId);
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function createCompetencyAction(frameworkVersionId: string, formData: FormData) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      categoryId: formData.get('categoryId'),
      name: formData.get('name'),
      description: formData.get('description'),
    };

    const parsed = createCompetencySchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    await createFrameworkCompetency(frameworkVersionId, parsed.data);
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function updateCompetencyAction(
  frameworkVersionId: string,
  competencyId: string,
  formData: FormData
) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      name: formData.get('name') || undefined,
      description: formData.get('description') || undefined,
      categoryId: formData.get('categoryId') || undefined,
    };

    const parsed = updateCompetencySchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    await updateFrameworkCompetency(competencyId, parsed.data);
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function deleteCompetencyAction(frameworkVersionId: string, competencyId: string) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    await deleteFrameworkCompetency(competencyId);
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function createLevelAction(frameworkVersionId: string, formData: FormData) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const levelStr = formData.get('level');
    const rawData = {
      frameworkCompetencyId: formData.get('frameworkCompetencyId'),
      level: levelStr ? parseInt(String(levelStr), 10) : undefined,
      description: formData.get('description'),
      evidencePrompt: formData.get('evidencePrompt') || undefined,
    };

    const parsed = createLevelSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    await createFrameworkLevel(frameworkVersionId, parsed.data);
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function updateLevelAction(
  frameworkVersionId: string,
  levelId: string,
  formData: FormData
) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const levelStr = formData.get('level');
    const rawData = {
      level: levelStr ? parseInt(String(levelStr), 10) : undefined,
      description: formData.get('description') || undefined,
      evidencePrompt: formData.get('evidencePrompt') || undefined,
    };

    const parsed = updateLevelSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    await updateFrameworkLevel(levelId, parsed.data);
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function deleteLevelAction(frameworkVersionId: string, levelId: string) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    await deleteFrameworkLevel(levelId);
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function publishFrameworkAction(frameworkVersionId: string) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    await publishFrameworkVersion(frameworkVersionId);
    revalidatePath('/platform-admin/frameworks');
    revalidatePath(`/platform-admin/frameworks/${frameworkVersionId}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function createDraftFromPublishedAction(formData: FormData) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      sourceVersionId: formData.get('sourceVersionId'),
      newVersion: formData.get('newVersion'),
      description: formData.get('description') || undefined,
    };

    const parsed = createDraftFromPublishedSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    const newDraft = await createDraftFromPublishedVersion(
      parsed.data.sourceVersionId,
      parsed.data.newVersion,
      parsed.data.description
    );

    revalidatePath('/platform-admin/frameworks');
    return { success: true, frameworkId: newDraft.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}
