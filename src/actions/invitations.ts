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

    // Create session cookie automatically for newly registered admin
    await createSession(result.user.id);

    return {
      success: true,
      user: result.user,
      tenant: result.tenant,
      redirectUrl: '/organization-admin',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
