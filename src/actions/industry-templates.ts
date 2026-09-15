'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import {
  createIndustryTemplate,
  updateIndustryTemplate,
  toggleIndustryTemplateActive,
  deleteIndustryTemplate,
  addTemplateCompetency,
  removeTemplateCompetency,
  createTemplateRoleProfile,
  updateTemplateRoleProfile,
  deleteTemplateRoleProfile,
} from '@/services/industry-templates';
import {
  createIndustryTemplateSchema,
  updateIndustryTemplateSchema,
  createTemplateRoleProfileSchema,
  updateTemplateRoleProfileSchema,
  CreateIndustryTemplateInput,
  UpdateIndustryTemplateInput,
  CreateTemplateRoleProfileInput,
  UpdateTemplateRoleProfileInput,
} from '@/lib/validation/industry-templates';

export async function createIndustryTemplateAction(input: CreateIndustryTemplateInput) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const parsed = createIndustryTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid template data.',
    };
  }

  try {
    const template = await createIndustryTemplate(parsed.data);
    revalidatePath('/platform-admin/templates');
    return {
      success: true as const,
      template,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to create industry template.',
    };
  }
}

export async function updateIndustryTemplateAction(
  id: string,
  input: UpdateIndustryTemplateInput
) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const parsed = updateIndustryTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid template data.',
    };
  }

  try {
    const template = await updateIndustryTemplate(id, parsed.data);
    revalidatePath('/platform-admin/templates');
    revalidatePath(`/platform-admin/templates/${id}`);
    return {
      success: true as const,
      template,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to update industry template.',
    };
  }
}

export async function toggleIndustryTemplateActiveAction(id: string) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  try {
    const template = await toggleIndustryTemplateActive(id);
    revalidatePath('/platform-admin/templates');
    revalidatePath(`/platform-admin/templates/${id}`);
    return {
      success: true as const,
      template,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to toggle template status.',
    };
  }
}

export async function deleteIndustryTemplateAction(id: string) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  try {
    await deleteIndustryTemplate(id);
    revalidatePath('/platform-admin/templates');
    return {
      success: true as const,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to delete industry template.',
    };
  }
}

export async function addTemplateCompetencyAction(
  industryTemplateId: string,
  frameworkCompetencyId: string
) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  try {
    await addTemplateCompetency(industryTemplateId, frameworkCompetencyId);
    revalidatePath(`/platform-admin/templates/${industryTemplateId}`);
    return {
      success: true as const,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to add competency to template.',
    };
  }
}

export async function removeTemplateCompetencyAction(
  industryTemplateId: string,
  frameworkCompetencyId: string
) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  try {
    await removeTemplateCompetency(industryTemplateId, frameworkCompetencyId);
    revalidatePath(`/platform-admin/templates/${industryTemplateId}`);
    return {
      success: true as const,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to remove competency from template.',
    };
  }
}

export async function createTemplateRoleProfileAction(input: CreateTemplateRoleProfileInput) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const parsed = createTemplateRoleProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid role profile data.',
    };
  }

  try {
    const roleProfile = await createTemplateRoleProfile(parsed.data.industryTemplateId, {
      name: parsed.data.name,
      description: parsed.data.description,
      requirements: parsed.data.requirements,
    });
    revalidatePath(`/platform-admin/templates/${parsed.data.industryTemplateId}`);
    return {
      success: true as const,
      roleProfile,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to create template role profile.',
    };
  }
}

export async function updateTemplateRoleProfileAction(
  id: string,
  industryTemplateId: string,
  input: UpdateTemplateRoleProfileInput
) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const parsed = updateTemplateRoleProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid role profile data.',
    };
  }

  try {
    const roleProfile = await updateTemplateRoleProfile(id, parsed.data);
    revalidatePath(`/platform-admin/templates/${industryTemplateId}`);
    return {
      success: true as const,
      roleProfile,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to update template role profile.',
    };
  }
}

export async function deleteTemplateRoleProfileAction(id: string, industryTemplateId: string) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  try {
    await deleteTemplateRoleProfile(id);
    revalidatePath(`/platform-admin/templates/${industryTemplateId}`);
    return {
      success: true as const,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to delete template role profile.',
    };
  }
}
