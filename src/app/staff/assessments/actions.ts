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

export async function uploadEvidenceAttachmentAction(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
  attachment?: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    createdAt: Date;
  };
}> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    return { error: 'Only staff members can upload evidence.' };
  }

  const assessmentItemId = formData.get('assessmentItemId');
  const assessmentId = formData.get('assessmentId');
  const file = formData.get('file');

  if (typeof assessmentItemId !== 'string' || !assessmentItemId) {
    return { error: 'Assessment item ID is missing.' };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Please select a valid file to upload.' };
  }

  try {
    const { uploadEvidenceAttachment } = await import('@/services');
    const buffer = Buffer.from(await file.arrayBuffer());

    const attachment = await uploadEvidenceAttachment(
      user.id,
      user.tenantId,
      assessmentItemId,
      {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        buffer,
      }
    );

    if (typeof assessmentId === 'string' && assessmentId) {
      revalidatePath(`/staff/assessments/${assessmentId}`);
    }
    revalidatePath('/staff/assessments');

    return {
      success: true,
      attachment: {
        id: attachment.id,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        createdAt: attachment.createdAt,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload evidence attachment.';
    return { error: message };
  }
}

export async function deleteEvidenceAttachmentAction(
  attachmentId: string,
  assessmentId?: string
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    return { error: 'Only staff members can delete evidence attachments.' };
  }

  try {
    const { deleteEvidenceAttachment } = await import('@/services');
    await deleteEvidenceAttachment(user.id, user.tenantId, attachmentId);

    if (assessmentId) {
      revalidatePath(`/staff/assessments/${assessmentId}`);
    }
    revalidatePath('/staff/assessments');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete evidence attachment.';
    return { error: message };
  }
}

export async function getStaffEvidenceSignedUrlAction(
  attachmentId: string
): Promise<{ success?: boolean; url?: string; fileName?: string; error?: string }> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    return { error: 'Only staff members can view evidence attachments.' };
  }

  try {
    const { getEvidenceAttachmentSignedUrl } = await import('@/services');
    const res = await getEvidenceAttachmentSignedUrl(
      user.id,
      user.role,
      user.tenantId,
      attachmentId
    );
    return { success: true, url: res.url, fileName: res.fileName };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve attachment URL.';
    return { error: message };
  }
}

