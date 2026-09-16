'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface NavbarProps {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string | null;
  } | null;
  dashboardPath?: string;
}

export function LandingNavbar({ user, dashboardPath }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#faf9f6]/85 border-b border-stone-200/70 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
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

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
          <a
            href="#features"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Features
          </a>
          <a
            href="#showcase"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Showcase
          </a>
          <a
            href="#roles"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Roles
          </a>
          <a
            href="#how-it-works"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            How it Works
          </a>
          <a
            href="#trust"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Architecture
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <Link
              href={dashboardPath || '/login'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-full hover:bg-neutral-800 transition-all shadow-sm hover:shadow"
            >
              <span>Go to Workspace</span>
              <svg
                className="w-4 h-4 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-full hover:bg-neutral-800 transition-all shadow-sm hover:shadow active:scale-[0.98]"
              >
                <span>Get started</span>
                <svg
                  className="w-3.5 h-3.5 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-stone-200/50 transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-200 bg-[#faf9f6] px-4 pt-2 pb-6 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-stone-200/50"
          >
            Features
          </a>
          <a
            href="#showcase"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-stone-200/50"
          >
            Showcase
          </a>
          <a
            href="#roles"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-stone-200/50"
          >
            Roles
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-stone-200/50"
          >
            How it Works
          </a>
          <a
            href="#trust"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-stone-200/50"
          >
            Architecture
          </a>

          <div className="pt-3 border-t border-stone-200 flex flex-col gap-2">
            {user ? (
              <Link
                href={dashboardPath || '/login'}
                className="w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 rounded-full hover:bg-neutral-800 transition-colors"
              >
                Go to Workspace
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="w-full text-center px-4 py-2 text-sm font-medium text-neutral-800 bg-stone-200/70 rounded-full hover:bg-stone-300 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 rounded-full hover:bg-neutral-800 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
