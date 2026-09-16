'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireTenantUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import {
  saveInterviewQuestionSetSchema,
  updateInterviewQuestionSetSchema,
  SaveInterviewQuestionSetInput,
  UpdateInterviewQuestionSetInput,
} from '@/lib/validation/interview-questions';
import {
  generateDraftInterviewQuestions,
  createInterviewQuestionSet,
  updateInterviewQuestionSet,
  deleteInterviewQuestionSet,
} from '@/services/interview-questions';
import { extractClientRequestContext } from '@/services/audit';

export async function generateDraftInterviewQuestionsAction(roleProfileId: string) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can generate interview questions.' };
    }

    const data = await generateDraftInterviewQuestions(user.tenantId, roleProfileId);
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function createInterviewQuestionSetAction(input: SaveInterviewQuestionSetInput) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can manage interview questions.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    const parsed = saveInterviewQuestionSetSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid interview question set data.' };
    }

    const questionSet = await createInterviewQuestionSet(user.tenantId, parsed.data, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/interview-questions');
    return { success: true, questionSetId: questionSet.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function updateInterviewQuestionSetAction(id: string, input: UpdateInterviewQuestionSetInput) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can manage interview questions.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    const parsed = updateInterviewQuestionSetSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid interview question set data.' };
    }

    const questionSet = await updateInterviewQuestionSet(user.tenantId, id, parsed.data, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/interview-questions');
    revalidatePath(`/organization-admin/interview-questions/${id}`);
    return { success: true, questionSetId: questionSet.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function deleteInterviewQuestionSetAction(id: string) {
  try {
    const user = await requireTenantUser();
    if (user.role !== UserRole.ORGANIZATION_ADMIN) {
      return { success: false, error: 'Unauthorized: Only Organization Administrators can manage interview questions.' };
    }

    const headersList = await headers();
    const reqContext = extractClientRequestContext(headersList);

    await deleteInterviewQuestionSet(user.tenantId, id, {
      actorId: user.id,
      actorRole: user.role,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    revalidatePath('/organization-admin/interview-questions');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
