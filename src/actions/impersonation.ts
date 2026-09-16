'use server';

import { getCurrentUser, createImpersonationSession, endImpersonationSession } from '@/lib/auth/service';
import { startSupportImpersonation, endSupportImpersonation } from '@/services/impersonation';
import { UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function startImpersonationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  if (user.role !== UserRole.SUPPORT && user.role !== UserRole.PLATFORM_ADMIN) {
    throw new Error('Unauthorized: Only Support and Platform Admin can access tenant troubleshooting mode.');
  }

  const tenantId = formData.get('tenantId')?.toString();
  const reason = formData.get('reason')?.toString();

  if (!tenantId) {
    throw new Error('Organization ID is required.');
  }

  if (!reason || reason.trim().length < 5) {
    throw new Error('A valid, descriptive reason (minimum 5 characters) is required.');
  }

  await startSupportImpersonation(user.id, user.role, tenantId, reason);
  await createImpersonationSession(user.id, tenantId, reason);

  revalidatePath('/', 'layout');
  redirect('/organization-admin/dashboard');
}

export async function endImpersonationAction() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const tenantId = user.impersonation?.impersonatedTenantId || user.tenantId;

  if (tenantId) {
    await endSupportImpersonation(user.id, user.role, tenantId);
  }

  await endImpersonationSession(user.id);

  revalidatePath('/', 'layout');
  const returnPath = user.role === UserRole.SUPPORT ? '/support' : '/platform-admin';
  redirect(returnPath);
}
