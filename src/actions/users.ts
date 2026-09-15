'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import {
  cancelTenantInvitation,
  updateTenantUser,
  deactivateTenantUser,
  reactivateTenantUser,
} from '@/services/users';
import { createTenantUserInvitation } from '@/services/invitations';
import {
  inviteTenantUserSchema,
  updateTenantUserSchema,
  InviteTenantUserInput,
  UpdateTenantUserInput,
} from '@/lib/validation/users';

export async function inviteTenantUserAction(input: InviteTenantUserInput) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  if (!user.tenantId) {
    return {
      success: false as const,
      error: 'Unauthorized: User does not belong to an organization.',
    };
  }

  const parsed = inviteTenantUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid user invitation data.',
    };
  }

  try {
    const result = await createTenantUserInvitation(user.tenantId, user.id, parsed.data);
    revalidatePath('/organization-admin/users');
    return {
      success: true as const,
      invitation: result,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to create user invitation.',
    };
  }
}

export async function updateTenantUserAction(targetUserId: string, input: UpdateTenantUserInput) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  if (!user.tenantId) {
    return {
      success: false as const,
      error: 'Unauthorized: User does not belong to an organization.',
    };
  }

  const parsed = updateTenantUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid user data.',
    };
  }

  try {
    const updatedUser = await updateTenantUser(user.tenantId, user.id, targetUserId, parsed.data);
    revalidatePath('/organization-admin/users');
    revalidatePath(`/organization-admin/users/${targetUserId}`);
    return {
      success: true as const,
      user: updatedUser,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to update user.',
    };
  }
}

export async function deactivateTenantUserAction(targetUserId: string) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  if (!user.tenantId) {
    return {
      success: false as const,
      error: 'Unauthorized: User does not belong to an organization.',
    };
  }

  try {
    await deactivateTenantUser(user.tenantId, user.id, targetUserId);
    revalidatePath('/organization-admin/users');
    revalidatePath(`/organization-admin/users/${targetUserId}`);
    return {
      success: true as const,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to deactivate user.',
    };
  }
}

export async function reactivateTenantUserAction(targetUserId: string) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  if (!user.tenantId) {
    return {
      success: false as const,
      error: 'Unauthorized: User does not belong to an organization.',
    };
  }

  try {
    await reactivateTenantUser(user.tenantId, targetUserId);
    revalidatePath('/organization-admin/users');
    revalidatePath(`/organization-admin/users/${targetUserId}`);
    return {
      success: true as const,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to reactivate user.',
    };
  }
}

export async function cancelTenantInvitationAction(invitationId: string) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  if (!user.tenantId) {
    return {
      success: false as const,
      error: 'Unauthorized: User does not belong to an organization.',
    };
  }

  try {
    await cancelTenantInvitation(user.tenantId, invitationId);
    revalidatePath('/organization-admin/users');
    return {
      success: true as const,
    };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to cancel invitation.',
    };
  }
}
