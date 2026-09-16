import React from 'react';
import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="bg-[#faf9f6] border-t border-stone-200 text-neutral-600 text-xs py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center text-white text-xs font-bold">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-semibold text-neutral-900 text-sm tracking-tight">
                Skills Assessment Platform
              </span>
            </Link>
            <p className="text-neutral-500 max-w-sm leading-relaxed">
              Enterprise-grade skills intelligence inspired by the SFIA competency model. Built to satisfy Training Heights technical specifications.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-neutral-700 font-medium">All systems operational · Version 1.0</span>
            </div>
          </div>

          {/* Column 1: Capabilities */}
          <div>
            <h4 className="font-semibold text-neutral-900 mb-3 uppercase tracking-wider text-[11px]">
              Platform
            </h4>
            <ul className="space-y-2 text-neutral-500">
              <li>
                <a href="#features" className="hover:text-neutral-900 transition-colors">
                  Skill Assessments
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-neutral-900 transition-colors">
                  Role Benchmarking
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-neutral-900 transition-colors">
                  Gap Analysis
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-neutral-900 transition-colors">
                  Career Progression
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-neutral-900 transition-colors">
                  Excel Reporting
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Portals */}
          <div>
            <h4 className="font-semibold text-neutral-900 mb-3 uppercase tracking-wider text-[11px]">
              Portals
            </h4>
            <ul className="space-y-2 text-neutral-500">
              <li>
                <Link href="/login" className="hover:text-neutral-900 transition-colors">
                  Staff Self-Assessment
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-neutral-900 transition-colors">
                  Manager Corroboration
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-neutral-900 transition-colors">
                  Organization Admin
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-neutral-900 transition-colors">
                  Platform Admin
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-neutral-900 transition-colors">
                  Support Impersonation
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Specs */}
          <div>
            <h4 className="font-semibold text-neutral-900 mb-3 uppercase tracking-wider text-[11px]">
              Specifications
            </h4>
            <ul className="space-y-2 text-neutral-500">
              <li>
                <a href="#trust" className="hover:text-neutral-900 transition-colors">
                  Multi-Tenant Security
                </a>
              </li>
              <li>
                <a href="#trust" className="hover:text-neutral-900 transition-colors">
                  Audit Trail Architecture
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-neutral-900 transition-colors">
                  Integration Registry
                </Link>
              </li>
              <li>
                <a href="#trust" className="hover:text-neutral-900 transition-colors">
                  22 Regression Suites
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-500">
          <div>
            © {new Date().getFullYear()} Skills Assessment Platform. Prepared for Training Heights Evaluation.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-neutral-900 transition-colors">
              Terms of Service
            </Link>
            <Link href="/login" className="hover:text-neutral-900 transition-colors">
              Privacy Notice
            </Link>
            <Link href="/login" className="hover:text-neutral-900 transition-colors font-medium text-neutral-800">
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
