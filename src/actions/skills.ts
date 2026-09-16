'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, CompetencyType } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import {
  createCustomCompetencySchema,
  updateCustomCompetencySchema,
} from '@/lib/validation/custom-competency';
import {
  adoptFrameworkVersion,
} from '@/services/framework-adoption';
import {
  createCustomCompetency,
  updateCustomCompetency,
  toggleCompetencyActive,
  deleteUnusedCustomCompetency,
  updateCompetencyWeight,
} from '@/services/competencies';

export async function adoptFrameworkAction(frameworkVersionId: string) {
  try {
    const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
    if (!user.tenantId) {
      return { success: false, error: 'User does not belong to an organization.' };
    }

    await adoptFrameworkVersion(user.tenantId, frameworkVersionId);

    revalidatePath('/organization-admin/skills');
    revalidatePath('/organization-admin/roles/new');
    revalidatePath('/organization-admin/campaigns/new');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function createCustomCompetencyAction(formData: FormData) {
  try {
    const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
    if (!user.tenantId) {
      return { success: false, error: 'User does not belong to an organization.' };
    }

    const levelsJson = formData.get('levels');
    let parsedLevels: unknown[] = [];
    try {
      parsedLevels = levelsJson ? (JSON.parse(String(levelsJson)) as unknown[]) : [];
    } catch {
      return { success: false, error: 'Invalid levels format' };
    }

    const rawData = {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      type: formData.get('type') as CompetencyType,
      levels: parsedLevels,
    };

    const parsed = createCustomCompetencySchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    const comp = await createCustomCompetency(user.tenantId, parsed.data);

    revalidatePath('/organization-admin/skills');
    revalidatePath('/organization-admin/roles/new');
    revalidatePath('/organization-admin/campaigns/new');
    return { success: true, competencyId: comp.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function updateCustomCompetencyAction(id: string, formData: FormData) {
  try {
    const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
    if (!user.tenantId) {
      return { success: false, error: 'User does not belong to an organization.' };
    }

    const levelsJson = formData.get('levels');
    let parsedLevels: unknown[] = [];
    try {
      parsedLevels = levelsJson ? (JSON.parse(String(levelsJson)) as unknown[]) : [];
    } catch {
      return { success: false, error: 'Invalid levels format' };
    }

    const rawData = {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      type: formData.get('type') as CompetencyType,
      levels: parsedLevels,
    };

    const parsed = updateCustomCompetencySchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid form data' };
    }

    await updateCustomCompetency(user.tenantId, id, parsed.data);

    revalidatePath('/organization-admin/skills');
    revalidatePath(`/organization-admin/skills/${id}`);
    revalidatePath('/organization-admin/roles/new');
    revalidatePath('/organization-admin/campaigns/new');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function toggleCompetencyActiveAction(id: string, isActive: boolean) {
  try {
    const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
    if (!user.tenantId) {
      return { success: false, error: 'User does not belong to an organization.' };
    }

    await toggleCompetencyActive(user.tenantId, id, isActive);

    revalidatePath('/organization-admin/skills');
    revalidatePath(`/organization-admin/skills/${id}`);
    revalidatePath('/organization-admin/roles/new');
    revalidatePath('/organization-admin/campaigns/new');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function deleteCustomCompetencyAction(id: string) {
  try {
    const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
    if (!user.tenantId) {
      return { success: false, error: 'User does not belong to an organization.' };
    }

    await deleteUnusedCustomCompetency(user.tenantId, id);

    revalidatePath('/organization-admin/skills');
    revalidatePath('/organization-admin/roles/new');
    revalidatePath('/organization-admin/campaigns/new');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function updateCompetencyWeightAction(id: string, weight: number) {
  try {
    const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
    if (!user.tenantId) {
      return { success: false, error: 'User does not belong to an organization.' };
    }

    await updateCompetencyWeight(user.tenantId, id, weight, {
      actorId: user.id,
    });

    revalidatePath('/organization-admin/skills');
    revalidatePath(`/organization-admin/skills/${id}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

