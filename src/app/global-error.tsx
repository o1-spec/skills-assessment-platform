'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#faf9f6] text-neutral-900 font-sans antialiased selection:bg-neutral-900 selection:text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-md mx-auto">
            <svg
              className="w-8 h-8 text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-8 shadow-xs space-y-5">
            <div className="space-y-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Critical Failure
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Application Error
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto">
                A critical issue prevented the application from rendering. You can attempt to restore the session below.
              </p>
              {error.digest && (
                <div className="pt-2">
                  <span className="inline-block font-mono text-[10px] text-stone-500 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                    Incident ID: {error.digest}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Reload Application
              </button>
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50 text-neutral-700 text-xs font-semibold shadow-2xs transition-colors text-center inline-block"
              >
                Return to Home
              </Link>
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 font-mono">
            Skills Assessment Platform &bull; SaaS Control Plane
          </div>
        </div>
      </body>
    </html>
  );
}
