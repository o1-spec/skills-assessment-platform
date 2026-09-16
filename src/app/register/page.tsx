import { redirect } from 'next/navigation';
import { getCurrentUser, getRoleDashboardPath } from '@/lib/auth';
import { AuthShell, AuthFormCard } from '@/components/auth';
import { RegisterGateway } from './register-gateway';

interface RegisterPageProps {
  searchParams: Promise<{ token?: string; type?: string }>;
}

export const metadata = {
  title: 'Get Started | SkillsIQ Skills Assessment Platform',
  description: 'Join your organization or request a new SkillsIQ organization workspace.',
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { token, type } = await searchParams;

  if (token) {
    redirect(`/accept-invitation?token=${encodeURIComponent(token)}${type ? `&type=${encodeURIComponent(type)}` : ''}`);
  }

  const user = await getCurrentUser();
  if (user) {
    redirect(getRoleDashboardPath(user.role));
  }

  return (
    <AuthShell mode="register">
      <AuthFormCard
        title="Get started with SkillsIQ"
        subtitle="Join your organization or begin the process of setting up a new SkillsIQ workspace."
        maxWidth="lg"
      >
        <RegisterGateway />
      </AuthFormCard>
    </AuthShell>
  );
}
