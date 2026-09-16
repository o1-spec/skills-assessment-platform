import { redirect } from 'next/navigation';
import { getCurrentUser, getRoleDashboardPath } from '@/lib/auth';
import { AuthShell, AuthFormCard } from '@/components/auth';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Sign In | SkillsIQ Skills Assessment Platform',
  description: 'Sign in to access your role workspace.',
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(getRoleDashboardPath(user.role));
  }

  const showDemoHelpers =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_SHOW_DEMO_HELPERS === 'true';

  return (
    <AuthShell mode="login">
      <AuthFormCard
        title="Welcome back"
        subtitle="Sign in to continue to your SkillsIQ workspace."
      >
        <LoginForm showDemoHelpers={showDemoHelpers} />
      </AuthFormCard>
    </AuthShell>
  );
}
