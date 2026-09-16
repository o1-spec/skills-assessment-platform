'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireTenantUser } from '@/lib/auth';
import { createCampaignSchema, updateCampaignDraftSchema } from '@/lib/validation';
import {
  createAssessmentCampaign,
  updateCampaignDraft,
  launchCampaign,
} from '@/services';
import { CampaignScope, CampaignStatus, UserRole } from '@prisma/client';

export interface CreateCampaignFormState {
  error?: string;
  fieldErrors?: {
    name?: string[];
    description?: string[];
    startDate?: string[];
    deadline?: string[];
    roleProfileId?: string[];
    competencyIds?: string[];
    scope?: string[];
    teamIds?: string[];
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
  const startDateRaw = formData.get('startDate');
  const deadlineRaw = formData.get('deadline');
  const requiresCorroboration =
    formData.get('requiresCorroboration') === 'true' ||
    formData.get('requiresCorroboration') === 'on';
  const roleProfileId = formData.get('roleProfileId');
  const scopeRaw = formData.get('scope');
  const submitAction = formData.get('submitAction');

  const status =
    submitAction === 'launch'
      ? CampaignStatus.ACTIVE
      : CampaignStatus.DRAFT;

  const scope =
    scopeRaw === CampaignScope.ORGANIZATION
      ? CampaignScope.ORGANIZATION
      : scopeRaw === CampaignScope.TEAM
      ? CampaignScope.TEAM
      : CampaignScope.INDIVIDUAL;

  // Extract selected competencies, teams & participants
  const competencyIds = formData
    .getAll('competencyIds')
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  const teamIds = formData
    .getAll('teamIds')
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  const participantIds = formData
    .getAll('participantIds')
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  const validated = createCampaignSchema.safeParse({
    name,
    description: description || undefined,
    startDate: startDateRaw || undefined,
    deadline: deadlineRaw,
    requiresCorroboration,
    roleProfileId: roleProfileId || undefined,
    scope,
    competencyIds,
    teamIds,
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
        scope: flattened.fieldErrors.scope,
        teamIds: flattened.fieldErrors.teamIds,
        participantIds: flattened.fieldErrors.participantIds,
      },
      error:
        flattened.fieldErrors.name?.[0] ||
        flattened.fieldErrors.deadline?.[0] ||
        flattened.fieldErrors.competencyIds?.[0] ||
        flattened.fieldErrors.teamIds?.[0] ||
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

export async function updateCampaignDraftAction(
  campaignId: string,
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
  const startDateRaw = formData.get('startDate');
  const deadlineRaw = formData.get('deadline');
  const requiresCorroboration =
    formData.get('requiresCorroboration') === 'true' ||
    formData.get('requiresCorroboration') === 'on';
  const roleProfileId = formData.get('roleProfileId');
  const scopeRaw = formData.get('scope');
  const submitAction = formData.get('submitAction');

  const scope =
    scopeRaw === CampaignScope.ORGANIZATION
      ? CampaignScope.ORGANIZATION
      : scopeRaw === CampaignScope.TEAM
      ? CampaignScope.TEAM
      : CampaignScope.INDIVIDUAL;

  const competencyIds = formData
    .getAll('competencyIds')
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  const teamIds = formData
    .getAll('teamIds')
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  const participantIds = formData
    .getAll('participantIds')
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  const validated = updateCampaignDraftSchema.safeParse({
    name: typeof name === 'string' ? name : '',
    description: typeof description === 'string' ? description : '',
    startDate: startDateRaw || undefined,
    deadline: typeof deadlineRaw === 'string' ? deadlineRaw : '',
    requiresCorroboration,
    roleProfileId: typeof roleProfileId === 'string' ? roleProfileId : null,
    competencyIds,
    scope,
    teamIds,
    participantIds,
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
        scope: flattened.fieldErrors.scope,
        teamIds: flattened.fieldErrors.teamIds,
        participantIds: flattened.fieldErrors.participantIds,
      },
      error:
        flattened.fieldErrors.name?.[0] ||
        flattened.fieldErrors.deadline?.[0] ||
        flattened.fieldErrors.teamIds?.[0] ||
        flattened.fieldErrors.participantIds?.[0] ||
        flattened.formErrors[0] ||
        'Please check the form for errors.',
    };
  }

  try {
    await updateCampaignDraft(user.tenantId, campaignId, validated.data);

    if (submitAction === 'launch') {
      await launchCampaign(user.tenantId, campaignId);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update campaign draft.';
    return {
      error: message,
    };
  }

  revalidatePath('/organization-admin/campaigns');
  revalidatePath(`/organization-admin/campaigns/${campaignId}`);
  redirect(`/organization-admin/campaigns/${campaignId}`);
}

export async function launchCampaignAction(campaignId: string): Promise<{ success?: boolean; error?: string }> {
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    return {
      error: 'You do not have permission to perform this action.',
    };
  }

  try {
    await launchCampaign(user.tenantId, campaignId);
    revalidatePath('/organization-admin/campaigns');
    revalidatePath(`/organization-admin/campaigns/${campaignId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to launch campaign.';
    return { error: message };
  }
}
