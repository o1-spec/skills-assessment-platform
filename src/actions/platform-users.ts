'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import {
  invitePlatformUser,
  cancelPlatformInvitation,
  changePlatformUserRole,
  deactivatePlatformUser,
  reactivatePlatformUser,
  acceptPlatformInvitation,
} from '@/services/platform-users';
import { headers } from 'next/headers';

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

async function getActorContext() {
  const h = await headers();
  return {
    ipAddress: h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? null,
    userAgent: h.get('user-agent') ?? null,
  };
}

// ---------------------------------------------------------------------------
// PLATFORM ADMIN ACTIONS (require PLATFORM_ADMIN role)
// ---------------------------------------------------------------------------

export async function invitePlatformUserAction(formData: FormData) {
  try {
    const actor = await requireRole(UserRole.PLATFORM_ADMIN);
    const ctx = await getActorContext();

    const email = String(formData.get('email') ?? '').toLowerCase().trim();
    const name = String(formData.get('name') ?? '').trim();
    const role = String(formData.get('role') ?? '') as UserRole;

    if (!email) return { success: false, error: 'Email is required.' };
    if (!name) return { success: false, error: 'Name is required.' };

    await invitePlatformUser(
      actor.id,
      { email, name, role },
      ctx
    );

    revalidatePath('/platform-admin/users');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function cancelPlatformInvitationAction(invitationId: string) {
  try {
    const actor = await requireRole(UserRole.PLATFORM_ADMIN);
    const ctx = await getActorContext();

    await cancelPlatformInvitation(actor.id, invitationId, ctx);

    revalidatePath('/platform-admin/users');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function changePlatformUserRoleAction(targetUserId: string, newRole: UserRole) {
  try {
    const actor = await requireRole(UserRole.PLATFORM_ADMIN);
    const ctx = await getActorContext();

    await changePlatformUserRole(actor.id, targetUserId, newRole, ctx);

    revalidatePath('/platform-admin/users');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function deactivatePlatformUserAction(targetUserId: string) {
  try {
    const actor = await requireRole(UserRole.PLATFORM_ADMIN);
    const ctx = await getActorContext();

    await deactivatePlatformUser(actor.id, targetUserId, ctx);

    revalidatePath('/platform-admin/users');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function reactivatePlatformUserAction(targetUserId: string) {
  try {
    const actor = await requireRole(UserRole.PLATFORM_ADMIN);
    const ctx = await getActorContext();

    await reactivatePlatformUser(actor.id, targetUserId, ctx);

    revalidatePath('/platform-admin/users');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

// ---------------------------------------------------------------------------
// PUBLIC ACTION — accept platform invitation (no auth required)
// ---------------------------------------------------------------------------

export async function acceptPlatformInvitationAction(formData: FormData) {
  try {
    const token = String(formData.get('token') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (!token) return { success: false, error: 'Invitation token is missing.' };
    if (!password) return { success: false, error: 'Password is required.' };
    if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
    if (password !== confirmPassword) return { success: false, error: 'Passwords do not match.' };

    const { user } = await acceptPlatformInvitation(token, password);

    // Create session and redirect
    const sessionToken = await createSessionToken(user.id);
    await setSessionCookie(sessionToken);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }

  // Redirect outside try/catch so Next.js redirect() works correctly
  redirect('/platform-admin');
}
