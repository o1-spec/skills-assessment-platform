'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireTenantUser } from '@/lib/auth';
import {
  saveAssessmentDraftSchema,
  submitAssessmentSchema,
} from '@/lib/validation';
import { saveAssessmentDraft, submitAssessment } from '@/services';
import { UserRole } from '@prisma/client';

export interface AssessmentFormActionState {
  error?: string;
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function saveAssessmentDraftAction(
  prevState: AssessmentFormActionState | undefined,
  formData: FormData
): Promise<AssessmentFormActionState> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    return {
      error: 'Only staff members can update assessments.',
    };
  }

  const assessmentId = formData.get('assessmentId');
  const itemsJson = formData.get('items');

  let parsedItems = [];
  try {
    if (typeof itemsJson === 'string') {
      parsedItems = JSON.parse(itemsJson);
    }
  } catch {
    return {
      error: 'Invalid payload structure.',
    };
  }

  const validated = saveAssessmentDraftSchema.safeParse({
    assessmentId: typeof assessmentId === 'string' ? assessmentId : '',
    items: parsedItems,
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      error: flattened.formErrors[0] || 'Please check your inputs.',
    };
  }

  try {
    await saveAssessmentDraft(user.id, user.tenantId, validated.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save assessment draft.';
    return {
      error: message,
    };
  }

  revalidatePath('/staff/assessments');
  revalidatePath(`/staff/assessments/${validated.data.assessmentId}`);

  return {
    success: true,
    message: 'Draft saved successfully.',
  };
}

export async function submitAssessmentAction(
  prevState: AssessmentFormActionState | undefined,
  formData: FormData
): Promise<AssessmentFormActionState> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    return {
      error: 'Only staff members can submit assessments.',
    };
  }

  const assessmentId = formData.get('assessmentId');
  const itemsJson = formData.get('items');

  let parsedItems = [];
  try {
    if (typeof itemsJson === 'string') {
      parsedItems = JSON.parse(itemsJson);
    }
  } catch {
    return {
      error: 'Invalid payload structure.',
    };
  }

  const validated = submitAssessmentSchema.safeParse({
    assessmentId: typeof assessmentId === 'string' ? assessmentId : '',
    items: parsedItems,
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      error: flattened.formErrors[0] || 'Please complete all required competency ratings and evidence.',
    };
  }

  try {
    await submitAssessment(user.id, user.tenantId, validated.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit assessment.';
    return {
      error: message,
    };
  }

  revalidatePath('/staff/assessments');
  revalidatePath(`/staff/assessments/${validated.data.assessmentId}`);
  redirect(`/staff/assessments/${validated.data.assessmentId}`);
}
