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
      className="inline-flex items-center px-3.5 py-1.5 border border-stone-200/80 text-xs font-medium rounded-xl text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors shadow-xs disabled:opacity-50"
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
