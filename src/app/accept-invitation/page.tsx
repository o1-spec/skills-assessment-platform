import { getInvitationByRawToken } from '@/services/invitations';
import { getPlatformInvitationByRawToken } from '@/services/platform-users';
import { AuthShell, AuthFormCard } from '@/components/auth';
import { AcceptInvitationForm } from './accept-invitation-form';
import { AcceptPlatformInvitationForm } from './accept-platform-form';
import Link from 'next/link';

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string; type?: string }>;
}

export const metadata = {
  title: 'Accept Invitation | SkillsIQ Skills Assessment Platform',
  description: 'Activate your account on the SkillsIQ platform.',
};

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const { token, type } = await searchParams;
  const isPlatform = type === 'platform';

  if (isPlatform) {
    if (!token) {
      return (
        <AuthShell mode="invitation">
          <AuthFormCard
            title="Missing Invitation Link"
            subtitle="No platform invitation token was provided."
            badge="Platform Access"
          >
            <div className="space-y-4 text-center">
              <p className="text-xs text-neutral-600 leading-relaxed">
                Please use the complete invitation URL received from your platform administrator email.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
              >
                Return to Login →
              </Link>
            </div>
          </AuthFormCard>
        </AuthShell>
      );
    }

    const platformInvitation = await getPlatformInvitationByRawToken(token);

    if (!platformInvitation) {
      return (
        <AuthShell mode="invitation">
          <AuthFormCard
            title="Invalid Platform Invitation"
            subtitle="This invitation link is invalid or does not exist."
            badge="Security Notice"
          >
            <div className="space-y-4 text-center">
              <p className="text-xs text-neutral-600 leading-relaxed">
                The security token could not be verified. Contact a Platform Administrator to request a new invitation.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
              >
                Return to Login →
              </Link>
            </div>
          </AuthFormCard>
        </AuthShell>
      );
    }

    if (platformInvitation.acceptedAt) {
      return (
        <AuthShell mode="invitation">
          <AuthFormCard
            title="Invitation Already Accepted"
            subtitle={`This invitation for ${platformInvitation.email} was previously accepted.`}
            badge="Account Active"
          >
            <div className="space-y-4 text-center">
              <p className="text-xs text-neutral-600 leading-relaxed">
                Accepted on {new Date(platformInvitation.acceptedAt).toLocaleDateString()}. Please sign in with your password.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
              >
                Sign In to Workspace →
              </Link>
            </div>
          </AuthFormCard>
        </AuthShell>
      );
    }

    if (new Date(platformInvitation.expiresAt) < new Date()) {
      return (
        <AuthShell mode="invitation">
          <AuthFormCard
            title="Invitation Expired"
            subtitle={`This platform invitation expired on ${new Date(platformInvitation.expiresAt).toLocaleDateString()}.`}
            badge="Expired Link"
          >
            <div className="space-y-4 text-center">
              <p className="text-xs text-neutral-600 leading-relaxed">
                For security reasons, platform invitation links expire after 7 days. Contact a Platform Administrator for a fresh link.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
              >
                Return to Login →
              </Link>
            </div>
          </AuthFormCard>
        </AuthShell>
      );
    }

    return (
      <AuthShell mode="invitation">
        <AuthFormCard
          title="Activate Platform Account"
          subtitle="Set your password to complete your platform account setup."
          badge="Platform Operations"
        >
          <AcceptPlatformInvitationForm token={token} invitation={platformInvitation} />
        </AuthFormCard>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell mode="invitation">
        <AuthFormCard
          title="Missing Invitation Link"
          subtitle="No organization invitation token was found in the URL."
          badge="Invitation Required"
        >
          <div className="space-y-4 text-center">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Please open the invitation link sent to your work email, or enter your invitation token below.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
            >
              Go to Invitation Gateway →
            </Link>
          </div>
        </AuthFormCard>
      </AuthShell>
    );
  }

  const invitation = await getInvitationByRawToken(token);

  if (!invitation) {
    return (
      <AuthShell mode="invitation">
        <AuthFormCard
          title="Invalid Invitation Link"
          subtitle="The invitation token provided is invalid or has been revoked."
          badge="Security Check"
        >
          <div className="space-y-4 text-center">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Please request a new invitation from your organization administrator.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
            >
              Return to Login →
            </Link>
          </div>
        </AuthFormCard>
      </AuthShell>
    );
  }

  if (invitation.acceptedAt) {
    return (
      <AuthShell mode="invitation">
        <AuthFormCard
          title="Invitation Already Accepted"
          subtitle={`The invitation for ${invitation.email} has already been accepted.`}
          badge="Active Account"
        >
          <div className="space-y-4 text-center">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Accepted on {new Date(invitation.acceptedAt).toLocaleDateString()}. You can proceed directly to sign in with your credentials.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
            >
              Sign In to Workspace →
            </Link>
          </div>
        </AuthFormCard>
      </AuthShell>
    );
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    return (
      <AuthShell mode="invitation">
        <AuthFormCard
          title="Invitation Expired"
          subtitle={`This organization invitation expired on ${new Date(invitation.expiresAt).toLocaleDateString()}.`}
          badge="Expired Link"
        >
          <div className="space-y-4 text-center">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Please contact your organization administrator to receive an updated invitation.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
            >
              Return to Login →
            </Link>
          </div>
        </AuthFormCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="invitation">
      <AuthFormCard
        title="Complete Account Setup"
        subtitle={`Welcome to ${invitation.tenant.name}. Create your password to activate your account.`}
        badge={invitation.tenant.name}
      >
        <AcceptInvitationForm token={token} invitation={invitation} />
      </AuthFormCard>
    </AuthShell>
  );
}
