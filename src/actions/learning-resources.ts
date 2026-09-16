'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireTenantUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import {
  createLearningResourceSchema,
  updateLearningResourceSchema,
  CreateLearningResourceInput,
  UpdateLearningResourceInput,
} from '@/lib/validation/learning-resources';
import {
  createLearningResource,
  updateLearningResource,
  toggleLearningResourceActive,
  deleteLearningResource,
} from '@/services/learning-resources';
import { extractClientRequestContext } from '@/services/audit';

export async function createLearningResourceAction(input: CreateLearningResourceInput) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can manage learning resources.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    const parsed = createLearningResourceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid learning resource data.' };
    }

    const resource = await createLearningResource(user.tenantId, parsed.data, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/learning-resources');
    revalidatePath('/staff/learning');
    return { success: true, resourceId: resource.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function updateLearningResourceAction(id: string, input: UpdateLearningResourceInput) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can manage learning resources.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    const parsed = updateLearningResourceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid learning resource data.' };
    }

    const resource = await updateLearningResource(user.tenantId, id, parsed.data, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/learning-resources');
    revalidatePath(`/organization-admin/learning-resources/${id}`);
    revalidatePath('/staff/learning');
    return { success: true, resourceId: resource.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function toggleLearningResourceActiveAction(id: string) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can manage learning resources.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    const updated = await toggleLearningResourceActive(user.tenantId, id, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/learning-resources');
    revalidatePath(`/organization-admin/learning-resources/${id}`);
    revalidatePath('/staff/learning');
    return { success: true, isActive: updated.isActive };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function deleteLearningResourceAction(id: string) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can manage learning resources.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    await deleteLearningResource(user.tenantId, id, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/learning-resources');
    revalidatePath('/staff/learning');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
