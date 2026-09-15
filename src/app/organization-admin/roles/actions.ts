'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireTenantUser } from '@/lib/auth';
import { createRoleProfileSchema } from '@/lib/validation';
import { createRoleProfile } from '@/services';
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

  const status =
    submitAction === 'publish'
      ? RoleProfileStatus.PUBLISHED
      : RoleProfileStatus.DRAFT;

  // Extract selected competency target levels from form
  // Keys will be in format: "competency_<competencyId>"
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
