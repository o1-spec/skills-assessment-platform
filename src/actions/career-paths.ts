'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireTenantUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { createCareerPathSchema, updateCareerPathSchema } from '@/lib/validation';
import {
  createCareerPath,
  updateCareerPath,
  publishCareerPath,
} from '@/services/career-paths';
import { extractClientRequestContext } from '@/services/audit';

export async function createCareerPathAction(formData: FormData) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can manage career paths.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    const name = formData.get('name');
    const description = formData.get('description');
    const roleProfileIds = formData
      .getAll('roleProfileIds')
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    const parsed = createCareerPathSchema.safeParse({
      name,
      description: description || undefined,
      roleProfileIds,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid career path data.' };
    }

    const careerPath = await createCareerPath(user.tenantId, parsed.data, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/career-paths');
    return { success: true, careerPathId: careerPath.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function updateCareerPathAction(id: string, formData: FormData) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can manage career paths.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    const name = formData.get('name');
    const description = formData.get('description');
    const roleProfileIds = formData
      .getAll('roleProfileIds')
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    const parsed = updateCareerPathSchema.safeParse({
      name,
      description: description || undefined,
      roleProfileIds,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid career path data.' };
    }

    const careerPath = await updateCareerPath(user.tenantId, id, parsed.data, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/career-paths');
    revalidatePath(`/organization-admin/career-paths/${id}`);
    return { success: true, careerPathId: careerPath.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function publishCareerPathAction(id: string) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can publish career paths.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    const careerPath = await publishCareerPath(user.tenantId, id, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/career-paths');
    revalidatePath(`/organization-admin/career-paths/${id}`);
    revalidatePath('/staff/career-paths');
    return { success: true, careerPathId: careerPath.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
