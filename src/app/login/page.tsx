import { redirect } from 'next/navigation';
import { getCurrentUser, getRoleDashboardPath } from '@/lib/auth';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(getRoleDashboardPath(user.role));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Skills Assessment Platform
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your role workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-lg sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
