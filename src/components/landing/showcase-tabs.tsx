'use client';

import React, { useState } from 'react';

type TabId = 'gap-analysis' | 'campaigns' | 'career-paths' | 'corroboration';

export function ShowcaseTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('gap-analysis');

  return (
    <div className="w-full bg-white rounded-2xl md:rounded-3xl border border-stone-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="border-b border-stone-200/80 bg-stone-50/60 px-3 sm:px-6 pt-3 flex items-center justify-between overflow-x-auto scrollbar-none gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('gap-analysis')}
            className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 border-t-2 ${activeTab === 'gap-analysis'
                ? 'bg-white text-neutral-900 border-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 border-transparent hover:bg-white/50'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Gap Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 border-t-2 ${activeTab === 'campaigns'
                ? 'bg-white text-neutral-900 border-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 border-transparent hover:bg-white/50'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Campaign Tracking</span>
          </button>

          <button
            onClick={() => setActiveTab('career-paths')}
            className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 border-t-2 ${activeTab === 'career-paths'
                ? 'bg-white text-neutral-900 border-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 border-transparent hover:bg-white/50'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Career Ladders</span>
          </button>

          <button
            onClick={() => setActiveTab('corroboration')}
            className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 border-t-2 ${activeTab === 'corroboration'
                ? 'bg-white text-neutral-900 border-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 border-transparent hover:bg-white/50'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Manager Review</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-400 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-300"></span>
          <span>Live Platform Sandbox</span>
        </div>
      </div>

      <div className="p-4 sm:p-7 md:p-9 bg-white min-h-115">
        {activeTab === 'gap-analysis' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-linear-to-tr from-emerald-500 to-teal-400 text-white font-semibold flex items-center justify-center text-sm shadow-sm">
                  SS
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 text-base">
                    Sarah Staff — Capability Gap Matrix
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Target Role: <span className="font-medium text-neutral-700">Backend Engineer (Level 3)</span> · Evaluated Q3 Cycle
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Overall Fit: 92% (Role Ready)
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                  Net Delta: +0.4
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center">
                      TC
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">
                      Distributed Systems Architecture
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800">
                    Level 4 / Target 3
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-3 line-clamp-1">
                  Microservices decoupling, message broker idempotency & resilient retries
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Proficiency Score</span>
                    <span className="font-medium text-neutral-800">Exceeded (+1 Level)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center">
                      TC
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">
                      Relational Database Optimization
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800">
                    Level 3 / Target 3
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-3 line-clamp-1">
                  Query planning, composite index tuning, connection pool sizing & isolation
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Proficiency Score</span>
                    <span className="font-medium text-neutral-800">Benchmark Met (0.0)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                      BC
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">
                      Technical Mentorship & Code Review
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-800">
                    Level 2 / Target 3
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-3 line-clamp-1">
                  Guiding junior team members, asynchronous review etiquette & pair programming
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Proficiency Score</span>
                    <span className="font-medium text-amber-700">Developing (-1 Level Gap)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center">
                      TC
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">
                      Automated CI/CD & Deployment Safety
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800">
                    Level 3 / Target 3
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-3 line-clamp-1">
                  Zero-downtime migrations, automated regression pipelines & smoke verification
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Proficiency Score</span>
                    <span className="font-medium text-neutral-800">Benchmark Met (0.0)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-100/70 border border-stone-200 flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-medium">
                Recommendation: 1 targeted development action mapped to bridge Technical Mentorship.
              </span>
              <span className="text-neutral-900 font-semibold cursor-pointer hover:underline">
                View Learning Course →
              </span>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-neutral-900 text-base">
                    Acme Corp — Q3 Engineering Assessment Campaign
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Deadline: Oct 31, 2026 · Scope: Organization-wide · Corroboration: Enforced
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-neutral-900">87.5%</span>
                <p className="text-xs text-neutral-500">Cycle Completion</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50">
                <span className="text-xs text-neutral-500 font-medium">Participants</span>
                <div className="text-2xl font-bold text-neutral-900 mt-1">48</div>
                <span className="text-[11px] text-neutral-500">100% enrolled</span>
              </div>
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50">
                <span className="text-xs text-neutral-500 font-medium">Self-Assessments</span>
                <div className="text-2xl font-bold text-blue-600 mt-1">42</div>
                <span className="text-[11px] text-neutral-500">6 drafts in progress</span>
              </div>
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50">
                <span className="text-xs text-neutral-500 font-medium">Corroborations</span>
                <div className="text-2xl font-bold text-emerald-600 mt-1">38</div>
                <span className="text-[11px] text-neutral-500">4 awaiting manager</span>
              </div>
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50">
                <span className="text-xs text-neutral-500 font-medium">Reminders Sent</span>
                <div className="text-2xl font-bold text-neutral-900 mt-1">12</div>
                <span className="text-[11px] text-neutral-500">Automated cron</span>
              </div>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-stone-100/60 px-4 py-2.5 font-semibold text-neutral-700 grid grid-cols-4">
                <span>Employee</span>
                <span>Role Benchmark</span>
                <span>Self-Assessment</span>
                <span className="text-right">Manager Review</span>
              </div>
              <div className="divide-y divide-stone-100">
                <div className="px-4 py-3 grid grid-cols-4 items-center">
                  <span className="font-medium text-neutral-900">Sarah Staff</span>
                  <span className="text-neutral-600">Backend Engineer</span>
                  <span className="text-emerald-700 font-medium">Submitted (7/7)</span>
                  <span className="text-right text-amber-700 font-medium">Pending Review</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-4 items-center">
                  <span className="font-medium text-neutral-900">Alex Rivera</span>
                  <span className="text-neutral-600">Frontend Engineer</span>
                  <span className="text-emerald-700 font-medium">Submitted (7/7)</span>
                  <span className="text-right text-emerald-700 font-medium">Corroborated</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-4 items-center">
                  <span className="font-medium text-neutral-900">David Chen</span>
                  <span className="text-neutral-600">DevOps Engineer</span>
                  <span className="text-blue-700 font-medium">Draft (4/7)</span>
                  <span className="text-right text-neutral-400">Waiting submission</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'career-paths' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-100">
              <div>
                <h4 className="font-semibold text-neutral-900 text-base">
                  Track: Engineering Individual Contributor (IC)
                </h4>
                <p className="text-xs text-neutral-500">
                  Sequential role progression with dynamically computed competency deltas
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 self-start">
                3 Milestones Mapped
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/30 relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <span className="font-semibold text-neutral-900 text-sm">Junior Engineer</span>
                </div>
                <p className="text-xs text-neutral-500 mb-3">Foundational implementation & unit tests</p>
                <div className="text-[11px] space-y-1 text-stone-600">
                  <div>• Core Coding: Level 2</div>
                  <div>• Testing: Level 2</div>
                  <div>• Collaboration: Level 2</div>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-emerald-700">✓ Completed</div>
              </div>

              <div className="p-4 rounded-xl border-2 border-neutral-900 bg-white relative shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="font-semibold text-neutral-900 text-sm">Backend Engineer</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 font-semibold text-neutral-800">
                    Current
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-3">Service architecture & db schema design</p>
                <div className="text-[11px] space-y-1 text-stone-700 font-medium">
                  <div>• Distributed Systems: Level 3</div>
                  <div>• SQL & Storage: Level 3</div>
                  <div>• Code Review: Level 3</div>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-neutral-900">Current Benchmark</div>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-stone-300 bg-stone-50/60 relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-stone-300 text-stone-700 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="font-semibold text-neutral-900 text-sm">Senior Staff Engineer</span>
                </div>
                <p className="text-xs text-neutral-500 mb-3">Cross-team architecture & mentorship</p>
                <div className="text-[11px] space-y-1 text-stone-600">
                  <div>• Systems Architecture: Level 4 (+1)</div>
                  <div>• Technical Strategy: Level 4 (+1)</div>
                  <div>• Org Mentorship: Level 4 (+2)</div>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-indigo-600">Target Promotion</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs">
              <span className="text-indigo-950 font-medium">
                Progression Delta: +4 total skill points required to advance from Backend Engineer to Senior Staff.
              </span>
              <span className="text-indigo-700 font-semibold cursor-pointer hover:underline">
                Generate Growth Plan →
              </span>
            </div>
          </div>
        )}

        {activeTab === 'corroboration' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-100">
              <div>
                <h4 className="font-semibold text-neutral-900 text-base">
                  Direct Report Review: Sarah Staff
                </h4>
                <p className="text-xs text-neutral-500">
                  Manager: Michael Manager · Review enforces minimum 10-character notes on rating adjustment
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Action Required
              </span>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-neutral-900">
                    Competency: Distributed Systems & Microservices
                  </span>
                  <p className="text-xs text-neutral-500">
                    Self-Rating: <strong className="text-neutral-800">Level 4 (Proficient)</strong>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-600 bg-white border border-stone-200 px-2.5 py-1 rounded-lg shadow-2xs">
                  <span>📎</span>
                  <span className="font-medium">architecture_v2.pdf</span>
                  <span className="text-stone-400 font-mono">(1.2 MB)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white border border-stone-200/80 text-xs text-stone-700 italic">
                “Led the transition from synchronous REST calls to event-driven RabbitMQ workers, reducing 99th percentile checkout latency by 64%.”
              </div>

              <div className="pt-2 border-t border-stone-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Manager Corroborated Rating
                  </label>
                  <select className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-white font-medium text-neutral-900 focus:ring-1 focus:ring-neutral-900">
                    <option>Level 4 — Agreed (Corroborated)</option>
                    <option>Level 3 — Adjusted (Discrepancy)</option>
                    <option>Level 5 — Exceeded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Manager Review Rationale
                  </label>
                  <input
                    type="text"
                    defaultValue="Verified against production telemetry metrics. Exceptional work."
                    className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-white text-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button className="px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-stone-100 rounded-lg transition-colors">
                Save Review Draft
              </button>
              <button className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm">
                Finalize & Lock Corroboration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
