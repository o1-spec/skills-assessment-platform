'use server';

import { acceptTenantAdminInvitation } from '@/services/invitations';
import { acceptInvitationSchema } from '@/lib/validation/invitations';
import { createSession } from '@/lib/auth/service';

export async function acceptInvitationAction(formData: FormData) {
  try {
    const rawData = {
      token: formData.get('token'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    };

    const parsed = acceptInvitationSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid registration data.' };
    }

    const result = await acceptTenantAdminInvitation(parsed.data);

    await createSession(result.user.id);

    let redirectUrl = '/staff';
    if (result.user.role === 'ORGANIZATION_ADMIN') {
      redirectUrl = '/organization-admin';
    } else if (result.user.role === 'MANAGER') {
      redirectUrl = '/manager';
    }

    return {
      success: true,
      user: result.user,
      tenant: result.tenant,
      redirectUrl,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
