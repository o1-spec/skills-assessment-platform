'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { updateOrganizationProfile, applyIndustryTemplateCompetencies } from '@/services/tenants';
import { headers } from 'next/headers';

async function getActorContext() {
  const h = await headers();
  return {
    ipAddress: h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? null,
    userAgent: h.get('user-agent') ?? null,
  };
}

export async function updateOrganizationProfileAction(formData: FormData) {
  try {
    const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
    if (!user.tenantId) {
      return { success: false, error: 'User does not belong to an organization.' };
    }
    const ctx = await getActorContext();

    const name = formData.get('name') !== null
      ? String(formData.get('name'))
      : undefined;
    const logoUrl = formData.get('logoUrl') !== null
      ? String(formData.get('logoUrl')) || null
      : undefined;
    const industryTemplateId = formData.get('industryTemplateId') !== null
      ? String(formData.get('industryTemplateId')) || null
      : undefined;

    await updateOrganizationProfile(
      user.tenantId,
      user.id,
      { name, logoUrl, industryTemplateId },
      ctx
    );

    revalidatePath('/organization-admin/organization');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function applyIndustryTemplateCompetenciesAction(industryTemplateId: string) {
  try {
    const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
    if (!user.tenantId) {
      return { success: false, error: 'User does not belong to an organization.' };
    }
    const ctx = await getActorContext();

    const result = await applyIndustryTemplateCompetencies(
      user.tenantId,
      industryTemplateId,
      user.id,
      ctx
    );

    revalidatePath('/organization-admin/skills');
    revalidatePath('/organization-admin/organization');
    return { success: true, added: result.added, skipped: result.skipped };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}
