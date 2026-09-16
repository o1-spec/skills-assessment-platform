'use client';

import React from 'react';
import Link from 'next/link';
import { ShowcaseTabs } from './showcase-tabs';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-20 md:pt-20 md:pb-40 bg-[#faf9f6]">
      {/* Subtle Ambient Radial Glows (Inspired by reference) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-87.5 md:w-212.5 md:h-112.5 bg-linear-to-tr from-emerald-100/40 via-teal-50/50 to-purple-100/30 blur-3xl rounded-full pointer-events-none -z-10 animate-glow-pulse" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Central Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          {/* Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6 text-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="tracking-wide">Evidence-based workforce skills intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 leading-[1.12]">
            Measure skills clearly.{' '}
            <span className="text-neutral-500 block sm:inline font-normal">
              Develop talent confidently.
            </span>
          </h1>

          {/* Supporting paragraph */}
          <p className="mt-5 text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            A multi-tenant skills assessment platform that enables organizations to define role benchmarks, run evidence-backed evaluations, uncover capability gaps, and chart transparent career ladders.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-neutral-900 rounded-full hover:bg-neutral-800 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <span>Get started with Demo</span>
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <a
              href="#showcase"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium text-neutral-700 bg-white border border-stone-200 rounded-full hover:bg-stone-50 hover:text-neutral-900 transition-all shadow-xs"
            >
              <span>Explore Interactive View</span>
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Floating Contextual Cards Container */}
        <div className="relative mt-6 max-w-5xl mx-auto">
          {/* Card 1: Top-Left Floating Info (Desktop only) */}
          <div className="hidden xl:flex absolute -top-8 -left-12 z-20 animate-float-slow">
            <div className="bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-stone-200 shadow-[0_12px_28px_rgba(0,0,0,0.06)] flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-sm">
                🎯
              </div>
              <div>
                <div className="font-semibold text-neutral-900">Campaign Launched</div>
                <div className="text-neutral-500">Acme Q3 · 94% enrolled</div>
              </div>
              <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>

          {/* Card 2: Top-Right Floating Info (Desktop only) */}
          <div className="hidden xl:flex absolute -top-10 -right-10 z-20 animate-float-reverse">
            <div className="bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-stone-200 shadow-[0_12px_28px_rgba(0,0,0,0.06)] flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-sm">
                ✍️
              </div>
              <div>
                <div className="font-semibold text-neutral-900">Corroboration Pending</div>
                <div className="text-neutral-500">Sarah Staff · 7 skills verified</div>
              </div>
            </div>
          </div>

          {/* Card 3: Bottom-Left Floating Info (Desktop only) */}
          <div className="hidden xl:flex absolute -bottom-6 -left-10 z-20 animate-float-reverse">
            <div className="bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-stone-200 shadow-[0_12px_28px_rgba(0,0,0,0.06)] flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-sm">
                📊
              </div>
              <div>
                <div className="font-semibold text-neutral-900">Gap Analysis Ready</div>
                <div className="text-emerald-700 font-medium">Net Delta: +0.4 (Above Target)</div>
              </div>
            </div>
          </div>

          {/* Card 4: Bottom-Right Floating Info (Desktop only) */}
          <div className="hidden xl:flex absolute -bottom-8 -right-8 z-20 animate-float-slow">
            <div className="bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-stone-200 shadow-[0_12px_28px_rgba(0,0,0,0.06)] flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 text-sm">
                🧭
              </div>
              <div>
                <div className="font-semibold text-neutral-900">Career Path Mapped</div>
                <div className="text-neutral-500">Backend L2 → Senior L3</div>
              </div>
            </div>
          </div>

          {/* Central Interactive Showcase Component */}
          <div id="showcase">
            <ShowcaseTabs />
          </div>
        </div>
      </div>
    </section>
  );
}
