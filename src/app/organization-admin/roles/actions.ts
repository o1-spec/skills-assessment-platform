'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireTenantUser } from '@/lib/auth';
import { createRoleProfileSchema, updateRoleProfileSchema } from '@/lib/validation';
import {
  createRoleProfile,
  updateRoleProfile,
  publishRoleProfile,
  archiveRoleProfile,
  unarchiveRoleProfile,
} from '@/services';
import { RoleProfileStatus, UserRole } from '@prisma/client';

export interface CreateRoleFormState {
  error?: string;
  fieldErrors?: {
    name?: string[];
    description?: string[];
    requirements?: string[];
  };
}

export async function createRoleProfileAction(
  prevState: CreateRoleFormState | undefined,
  formData: FormData
): Promise<CreateRoleFormState | undefined> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    return {
      error: 'You do not have permission to perform this action.',
    };
  }

  const name = formData.get('name');
  const description = formData.get('description');
  const submitAction = formData.get('submitAction');
  const templateRoleProfileId = formData.get('templateRoleProfileId');

  const status =
    submitAction === 'publish'
      ? RoleProfileStatus.PUBLISHED
      : RoleProfileStatus.DRAFT;

  const requirements: Array<{ competencyId: string; targetLevel: number }> = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('competency_') && typeof value === 'string' && value.trim() !== '') {
      const competencyId = key.replace('competency_', '');
      const parsedLevel = parseInt(value, 10);
      if (!isNaN(parsedLevel) && parsedLevel > 0) {
        requirements.push({
          competencyId,
          targetLevel: parsedLevel,
        });
      }
    }
  }

  const validated = createRoleProfileSchema.safeParse({
    name: typeof name === 'string' ? name : '',
    description: typeof description === 'string' ? description : '',
    status,
    templateRoleProfileId: typeof templateRoleProfileId === 'string' && templateRoleProfileId.trim() !== ''
      ? templateRoleProfileId.trim()
      : undefined,
    requirements,
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      fieldErrors: {
        name: flattened.fieldErrors.name,
        description: flattened.fieldErrors.description,
        requirements: flattened.fieldErrors.requirements,
      },
      error:
        flattened.fieldErrors.requirements?.[0] ||
        flattened.fieldErrors.name?.[0] ||
        flattened.formErrors[0] ||
        'Please check the form for errors.',
    };
  }

  let createdRole;
  try {
    createdRole = await createRoleProfile(user.tenantId, validated.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create role profile.';
    return {
      error: message,
    };
  }

  revalidatePath('/organization-admin/roles');
  redirect(`/organization-admin/roles/${createdRole.id}`);
}

export async function updateRoleProfileAction(
  roleProfileId: string,
  prevState: CreateRoleFormState | undefined,
  formData: FormData
): Promise<CreateRoleFormState | undefined> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    return {
      error: 'You do not have permission to perform this action.',
    };
  }

  const name = formData.get('name');
  const description = formData.get('description');
  const submitAction = formData.get('submitAction');

  const status =
    submitAction === 'publish'
      ? RoleProfileStatus.PUBLISHED
      : RoleProfileStatus.DRAFT;

  const requirements: Array<{ competencyId: string; targetLevel: number }> = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('competency_') && typeof value === 'string' && value.trim() !== '') {
      const competencyId = key.replace('competency_', '');
      const parsedLevel = parseInt(value, 10);
      if (!isNaN(parsedLevel) && parsedLevel > 0) {
        requirements.push({
          competencyId,
          targetLevel: parsedLevel,
        });
      }
    }
  }

  const validated = updateRoleProfileSchema.safeParse({
    name: typeof name === 'string' ? name : undefined,
    description: typeof description === 'string' ? description : undefined,
    status,
    requirements,
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      fieldErrors: {
        name: flattened.fieldErrors.name,
        description: flattened.fieldErrors.description,
        requirements: flattened.fieldErrors.requirements,
      },
      error:
        flattened.fieldErrors.requirements?.[0] ||
        flattened.fieldErrors.name?.[0] ||
        flattened.formErrors[0] ||
        'Please check the form for errors.',
    };
  }

  try {
    await updateRoleProfile(user.tenantId, roleProfileId, validated.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update role profile.';
    return {
      error: message,
    };
  }

  revalidatePath('/organization-admin/roles');
  revalidatePath(`/organization-admin/roles/${roleProfileId}`);
  redirect(`/organization-admin/roles/${roleProfileId}`);
}

export async function publishRoleProfileAction(roleProfileId: string) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    throw new Error('You do not have permission to perform this action.');
  }

  await publishRoleProfile(user.tenantId, roleProfileId);

  revalidatePath('/organization-admin/roles');
  revalidatePath(`/organization-admin/roles/${roleProfileId}`);
  return { success: true };
}

export async function archiveRoleProfileAction(roleProfileId: string) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    throw new Error('You do not have permission to perform this action.');
  }

  await archiveRoleProfile(user.tenantId, roleProfileId);

  revalidatePath('/organization-admin/roles');
  revalidatePath(`/organization-admin/roles/${roleProfileId}`);
  return { success: true };
}

export async function unarchiveRoleProfileAction(roleProfileId: string) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    throw new Error('You do not have permission to perform this action.');
  }

  await unarchiveRoleProfile(user.tenantId, roleProfileId);

  revalidatePath('/organization-admin/roles');
  revalidatePath(`/organization-admin/roles/${roleProfileId}`);
  return { success: true };
}
