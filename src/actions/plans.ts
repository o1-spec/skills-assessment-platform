'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth/guards';
import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
  toggleSubscriptionPlanActive,
  deleteSubscriptionPlan,
} from '@/services/plans';
import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
} from '@/lib/validation/plans';

export async function createSubscriptionPlanAction(formData: FormData) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      defaultSeatLimit: formData.get('defaultSeatLimit'),
      isActive: formData.get('isActive') === 'true' || formData.get('isActive') === 'on',
    };

    const parsed = createSubscriptionPlanSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid plan data.' };
    }

    const plan = await createSubscriptionPlan(parsed.data);

    revalidatePath('/platform-admin/plans');
    revalidatePath('/platform-admin/tenants/new');
    return { success: true, planId: plan.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function updateSubscriptionPlanAction(id: string, formData: FormData) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    const rawData = {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      defaultSeatLimit: formData.get('defaultSeatLimit'),
      isActive: formData.get('isActive') !== null ? formData.get('isActive') === 'true' || formData.get('isActive') === 'on' : undefined,
    };

    const parsed = updateSubscriptionPlanSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid plan data.' };
    }

    const plan = await updateSubscriptionPlan(id, parsed.data);

    revalidatePath('/platform-admin/plans');
    revalidatePath('/platform-admin/tenants/new');
    return { success: true, planId: plan.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function toggleSubscriptionPlanActiveAction(id: string, isActive: boolean) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    await toggleSubscriptionPlanActive(id, isActive);

    revalidatePath('/platform-admin/plans');
    revalidatePath('/platform-admin/tenants/new');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function deleteSubscriptionPlanAction(id: string) {
  try {
    await requireRole(UserRole.PLATFORM_ADMIN);

    await deleteSubscriptionPlan(id);

    revalidatePath('/platform-admin/plans');
    revalidatePath('/platform-admin/tenants/new');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
