'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireTenantUser } from '@/lib/auth';
import { submitCorroborationSchema } from '@/lib/validation';
import { submitCorroboration } from '@/services';
import { UserRole } from '@prisma/client';

export interface CorroborationFormActionState {
  error?: string;
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function submitCorroborationAction(
  prevState: CorroborationFormActionState | undefined,
  formData: FormData
): Promise<CorroborationFormActionState> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.MANAGER) {
    return {
      error: 'Only managers can submit corroboration reviews.',
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
      error: 'Invalid review payload structure.',
    };
  }

  const validated = submitCorroborationSchema.safeParse({
    assessmentId: typeof assessmentId === 'string' ? assessmentId : '',
    items: parsedItems,
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      error:
        flattened.formErrors[0] ||
        'Please provide valid ratings and justifications for all competencies.',
    };
  }

  try {
    await submitCorroboration(user.id, user.tenantId, validated.data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to complete corroboration review.';
    return {
      error: message,
    };
  }

  revalidatePath('/manager');
  revalidatePath('/manager/corroborations');
  revalidatePath(`/manager/corroborations/${validated.data.assessmentId}`);
  redirect(`/manager/corroborations/${validated.data.assessmentId}`);
}
