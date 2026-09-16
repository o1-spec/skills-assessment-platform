import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';

import { SupportImpersonationBanner } from '@/components/layout';

export default async function SupportLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(UserRole.SUPPORT);
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SupportImpersonationBanner />
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-100 tracking-tight">Skills Platform</span>
            <span className="text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              Support
            </span>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-xs text-slate-400 hover:text-slate-100 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
