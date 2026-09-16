import React from 'react';
import Link from 'next/link';
import { AuthBrandPanel } from './auth-brand-panel';

interface AuthShellProps {
  mode: 'login' | 'register' | 'invitation';
  children: React.ReactNode;
}

export function AuthShell({ mode, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-neutral-900 flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      {/* Top Header */}
      <header className="w-full border-b border-stone-200/70 bg-[#faf9f6]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white shadow-sm group-hover:bg-neutral-800 transition-colors">
              <svg
                className="w-4 h-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <span className="font-semibold text-neutral-900 tracking-tight text-base sm:text-lg">
              SkillsIQ
            </span>
            <span className="hidden sm:inline-block text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-stone-200/70 text-neutral-600 border border-stone-300/50">
              Enterprise
            </span>
          </Link>

          {/* Top-Right Context Switcher */}
          <div className="text-xs sm:text-sm font-medium text-neutral-600 flex items-center gap-1.5">
            {mode === 'login' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 text-xs sm:text-sm">New here?</span>
                <Link
                  href="/register"
                  className="font-semibold text-neutral-900 hover:text-neutral-700 hover:underline flex items-center gap-1 transition-colors"
                >
                  <span>Register</span>
                  <span>→</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 text-xs sm:text-sm">Already have an account?</span>
                <Link
                  href="/login"
                  className="font-semibold text-neutral-900 hover:text-neutral-700 hover:underline flex items-center gap-1 transition-colors"
                >
                  <span>Sign in</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Brand Story & Decorative Cards */}
        <AuthBrandPanel />

        {/* Right: Auth Form Container */}
        <div className="flex items-center justify-center py-10 px-4 sm:px-6 lg:px-12 w-full">
          {children}
        </div>
      </main>

      {/* Minimal Bottom Bar */}
      <footer className="w-full border-t border-stone-200/80 py-6 text-center text-xs text-neutral-500 bg-[#faf9f6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Skills Assessment Platform · Prepared for Training Heights Evaluation</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-neutral-800 transition-colors">
              Platform Overview
            </Link>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Logical Tenant Isolation Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
