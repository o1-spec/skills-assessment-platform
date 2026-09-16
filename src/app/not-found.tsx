import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-md mx-auto">
          <svg
            className="w-8 h-8 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-8 shadow-xs space-y-5">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
              Error 404
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto">
              The page or resource you are looking for does not exist, has been archived, or you may have followed an outdated link.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              Return to Home
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50 text-neutral-700 text-xs font-semibold shadow-2xs transition-colors"
            >
              Sign In to Portal
            </Link>
          </div>
        </div>

        <div className="text-[11px] text-neutral-400 font-mono">
          Skills Assessment Platform &bull; SaaS Control Plane
        </div>
      </div>
    </div>
  );
}
