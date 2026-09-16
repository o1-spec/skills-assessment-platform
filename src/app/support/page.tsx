import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export const metadata = {
  title: 'Support Dashboard | Skills Assessment Platform',
  description: 'Support account landing page.',
};

export default async function SupportPage() {
  const user = await requireRole(UserRole.SUPPORT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Support Account</h1>
        <p className="mt-1 text-sm text-slate-400">
          You are signed in with a read-only support account.
        </p>
      </div>

      {/* Identity card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-amber-400">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-slate-100">{user.name}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
          <span className="ml-auto text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
            Support
          </span>
        </div>
      </div>

      {/* Read-only notice */}
      <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-5 flex gap-4">
        <div className="shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-300">Read-only access</p>
          <p className="text-sm text-amber-400/80 mt-1">
            Support accounts have restricted access and cannot perform administrative operations.
            Contact a Platform Administrator if elevated access is required.
          </p>
        </div>
      </div>

      {/* Access summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
        {[
          { label: 'Platform user management', allowed: false },
          { label: 'Tenant management', allowed: false },
          { label: 'Framework management', allowed: false },
          { label: 'Organization configuration', allowed: false },
        ].map(({ label, allowed }) => (
          <div key={label} className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-slate-300">{label}</span>
            {allowed ? (
              <span className="text-xs font-medium text-emerald-400">Allowed</span>
            ) : (
              <span className="text-xs font-medium text-red-400">Restricted</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
