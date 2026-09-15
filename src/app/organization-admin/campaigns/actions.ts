'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireTenantUser } from '@/lib/auth';
import { createCampaignSchema } from '@/lib/validation';
import { createAssessmentCampaign } from '@/services';
import { CampaignStatus, UserRole } from '@prisma/client';

export interface CreateCampaignFormState {
  error?: string;
  fieldErrors?: {
    name?: string[];
    description?: string[];
    deadline?: string[];
    roleProfileId?: string[];
    competencyIds?: string[];
    participantIds?: string[];
  };
}

export async function createCampaignAction(
  prevState: CreateCampaignFormState | undefined,
  formData: FormData
): Promise<CreateCampaignFormState | undefined> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    return {
      error: 'You do not have permission to perform this action.',
    };
  }

  const name = formData.get('name');
  const description = formData.get('description');
  const deadlineRaw = formData.get('deadline');
  const requiresCorroboration = formData.get('requiresCorroboration') === 'true' || formData.get('requiresCorroboration') === 'on';
  const roleProfileId = formData.get('roleProfileId');
  const submitAction = formData.get('submitAction');

  const status =
    submitAction === 'launch'
      ? CampaignStatus.ACTIVE
      : CampaignStatus.DRAFT;

  // Extract selected competencies & participants
  const competencyIds = formData
    .getAll('competencyIds')
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  const participantIds = formData
    .getAll('participantIds')
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  const validated = createCampaignSchema.safeParse({
    name: typeof name === 'string' ? name : '',
    description: typeof description === 'string' ? description : '',
    deadline: typeof deadlineRaw === 'string' ? deadlineRaw : '',
    requiresCorroboration,
    roleProfileId: typeof roleProfileId === 'string' ? roleProfileId : null,
    competencyIds,
    participantIds,
    status,
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      fieldErrors: {
        name: flattened.fieldErrors.name,
        description: flattened.fieldErrors.description,
        deadline: flattened.fieldErrors.deadline,
        roleProfileId: flattened.fieldErrors.roleProfileId,
        competencyIds: flattened.fieldErrors.competencyIds,
        participantIds: flattened.fieldErrors.participantIds,
      },
      error:
        flattened.fieldErrors.name?.[0] ||
        flattened.fieldErrors.deadline?.[0] ||
        flattened.fieldErrors.competencyIds?.[0] ||
        flattened.fieldErrors.participantIds?.[0] ||
        flattened.formErrors[0] ||
        'Please check the form for errors.',
    };
  }

  let createdCampaign;
  try {
    createdCampaign = await createAssessmentCampaign(user.tenantId, validated.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create assessment campaign.';
    return {
      error: message,
    };
  }

  revalidatePath('/organization-admin/campaigns');
  redirect(`/organization-admin/campaigns/${createdCampaign.id}`);
}
