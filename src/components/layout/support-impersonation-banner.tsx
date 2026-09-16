import { getCurrentUser } from '@/lib/auth/service';
import { endImpersonationAction } from '@/actions/impersonation';

export async function SupportImpersonationBanner() {
  const user = await getCurrentUser();
  if (!user || !user.impersonation?.isImpersonating) {
    return null;
  }

  return (
    <aside
      aria-label="Active Support Session"
      className="bg-amber-500 text-amber-950 px-4 py-2.5 shadow-sm border-b border-amber-600 flex flex-wrap items-center justify-between gap-3 text-sm z-50 sticky top-0"
    >
      <div className="flex items-center space-x-2">
        <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
        <span className="font-bold uppercase tracking-wider text-xs bg-amber-600/30 px-2 py-0.5 rounded text-amber-950">
          Support Troubleshooting Session
        </span>
        <span className="font-medium">
          Accessing: <strong className="font-semibold">{user.impersonation.impersonatedTenantName}</strong>
        </span>
        {user.impersonation.reason && (
          <span className="hidden md:inline text-amber-900/90 text-xs border-l border-amber-600/40 pl-2">
            Reason: &ldquo;{user.impersonation.reason}&rdquo;
          </span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <span className="text-xs text-amber-900 hidden sm:inline">
          Logged in as: {user.name} ({user.role})
        </span>
        <form action={endImpersonationAction}>
          <button
            type="submit"
            className="inline-flex items-center justify-center px-3 py-1 bg-amber-950 text-white rounded text-xs font-semibold hover:bg-black transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Exit Troubleshooting Session
          </button>
        </form>
      </div>
    </aside>
  );
}
