'use server';

import { redirect } from 'next/navigation';
import { loginSchema } from '@/lib/validation';
import { authenticateUser, createSession, deleteSession } from '@/lib/auth/service';
import { getRoleDashboardPath } from '@/lib/auth/guards';

export interface LoginFormState {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
}

export async function loginAction(
  prevState: LoginFormState | undefined,
  formData: FormData
): Promise<LoginFormState | undefined> {
  const rawEmail = formData.get('email');
  const rawPassword = formData.get('password');

  const validated = loginSchema.safeParse({
    email: typeof rawEmail === 'string' ? rawEmail : '',
    password: typeof rawPassword === 'string' ? rawPassword : '',
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      fieldErrors: flattened.fieldErrors,
      error: 'Please enter a valid email and password.',
    };
  }

  const { email, password } = validated.data;
  const user = await authenticateUser(email, password);

  if (!user) {
    return {
      error: 'Invalid email or password.',
    };
  }

  await createSession(user.id);
  redirect(getRoleDashboardPath(user.role));
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
