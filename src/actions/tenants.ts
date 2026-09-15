'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, TenantStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth/guards';
import {
  provisionTenant,
  updateTenantPlanAndSeatLimit,
  updateTenantStatus,
} from '@/services/tenants';
import {
  provisionTenantSchema,
  updateTenantPlanSchema,
} from '@/lib/validation/tenants';

export async function provisionTenantAction(formData: FormData) {
  try {
    const user = await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      planId: formData.get('planId'),
      seatLimit: formData.get('seatLimit'),
      domain: formData.get('domain') || undefined,
      primaryContactName: formData.get('primaryContactName') || undefined,
      primaryContactEmail: formData.get('primaryContactEmail') || undefined,
      adminName: formData.get('adminName'),
      adminEmail: formData.get('adminEmail'),
    };

    const parsed = provisionTenantSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid organization data.' };
    }

    const result = await provisionTenant(parsed.data, user.id);

    revalidatePath('/platform-admin/tenants');
    return {
      success: true,
      tenantId: result.tenant.id,
      invitationUrl: result.invitation.invitationUrl,
      invitationEmail: result.invitation.email,
      invitationName: result.invitation.name,
      rawToken: result.invitation.rawToken,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function updateTenantPlanAction(tenantId: string, formData: FormData) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      planId: formData.get('planId'),
      seatLimit: formData.get('seatLimit'),
    };

    const parsed = updateTenantPlanSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid plan/seat data.' };
    }

    const updatedTenant = await updateTenantPlanAndSeatLimit(tenantId, parsed.data);

    revalidatePath('/platform-admin/tenants');
    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return { success: true, tenantId: updatedTenant.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function updateTenantStatusAction(tenantId: string, status: TenantStatus) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const updatedTenant = await updateTenantStatus(tenantId, status);

    revalidatePath('/platform-admin/tenants');
    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return { success: true, tenantId: updatedTenant.id, status: updatedTenant.status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
