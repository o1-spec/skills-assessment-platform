'use client';

import { useTransition } from 'react';
import { logoutAction } from '@/lib/auth/actions';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          await logoutAction();
        });
      }}
      disabled={isPending}
      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
