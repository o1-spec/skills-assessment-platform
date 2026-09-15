import { getInvitationByRawToken } from '@/services/invitations';
import { AcceptInvitationForm } from './accept-invitation-form';
import Link from 'next/link';

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string }>;
}

export const metadata = {
  title: 'Accept Administrator Invitation | Skills Assessment Platform',
  description: 'Activate your organization administrator account.',
};

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Missing Invitation Link</h2>
            <p className="text-sm text-gray-500">
              No invitation token was provided. Please use the complete invitation URL received from your platform administrator.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Return to Login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const invitation = await getInvitationByRawToken(token);

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Invalid Invitation Link</h2>
            <p className="text-sm text-gray-500">
              The invitation link provided is invalid or does not exist. Please request a new invitation from your platform administrator.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Return to Login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (invitation.acceptedAt) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Invitation Already Accepted</h2>
            <p className="text-sm text-gray-500">
              This administrator invitation for <strong>{invitation.email}</strong> was already accepted on{' '}
              {new Date(invitation.acceptedAt).toLocaleDateString()}. Please sign in with your password.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-xs"
              >
                Sign In to Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Invitation Expired</h2>
            <p className="text-sm text-gray-500">
              This invitation expired on {new Date(invitation.expiresAt).toLocaleDateString()}. Please contact your platform administrator for a new invitation link.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Return to Login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Skills Assessment Platform</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete your Organization Administrator account setup
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-gray-200 sm:px-10 space-y-6">
          <AcceptInvitationForm token={token} invitation={invitation} />
        </div>
      </div>
    </div>
  );
}
