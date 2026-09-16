'use client';

import { useState, useTransition } from 'react';
import { updateOrganizationProfileAction, applyIndustryTemplateCompetenciesAction } from '@/actions/org-profile';

interface IndustryTemplateOption {
  id: string;
  name: string;
  description: string | null;
  frameworkVersionId: string;
}

interface OrgProfileActionsProps {
  initialProfile: {
    id: string;
    name: string;
    logoUrl: string | null;
    industryTemplateId: string | null;
    industryTemplate: {
      id: string;
      name: string;
      description: string | null;
      frameworkVersionId: string;
    } | null;
  };
  templates: IndustryTemplateOption[];
}

export function OrgProfileActions({ initialProfile, templates }: OrgProfileActionsProps) {
  const [name, setName] = useState(initialProfile.name);
  const [logoUrl, setLogoUrl] = useState(initialProfile.logoUrl || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialProfile.industryTemplateId || '');

  const [profilePending, startProfileTransition] = useTransition();
  const [applyPending, startApplyTransition] = useTransition();

  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [applyMessage, setApplyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || initialProfile.industryTemplate;

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    const formData = new FormData();
    formData.set('name', name);
    formData.set('logoUrl', logoUrl);
    formData.set('industryTemplateId', selectedTemplateId);

    startProfileTransition(async () => {
      const res = await updateOrganizationProfileAction(formData);
      if (res.success) {
        setProfileMessage({ type: 'success', text: 'Organization profile updated successfully.' });
      } else {
        setProfileMessage({ type: 'error', text: res.error || 'Failed to update profile.' });
      }
    });
  };

  const handleApplyCompetencies = () => {
    if (!selectedTemplateId) return;
    setApplyMessage(null);

    startApplyTransition(async () => {
      const res = await applyIndustryTemplateCompetenciesAction(selectedTemplateId);
      if (res.success) {
        setApplyMessage({
          type: 'success',
          text: `Competencies applied: ${res.added} new added, ${res.skipped} already in your skills library.`,
        });
      } else {
        setApplyMessage({ type: 'error', text: res.error || 'Failed to apply template competencies.' });
      }
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs mb-10">
      <div className="border-b border-gray-100 pb-5 mb-6">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Organization Profile & Template</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure your organization brand details and industry competency framework preference.
        </p>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        {profileMessage && (
          <div
            className={`p-4 rounded-xl text-sm font-medium border ${
              profileMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {profileMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="org-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              id="org-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              placeholder="e.g. Acme Corporation"
            />
          </div>

          <div>
            <label htmlFor="org-logo" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Logo URL <span className="text-gray-400 font-normal">(HTTPS only)</span>
            </label>
            <div className="flex gap-3 items-center">
              <input
                id="org-logo"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="https://example.com/logo.png"
              />
              {logoUrl && logoUrl.startsWith('https://') && (
                <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Only secure HTTPS links are permitted.</p>
          </div>
        </div>

        <div>
          <label htmlFor="industry-template" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Industry Template
          </label>
          <select
            id="industry-template"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          >
            <option value="">None / Custom Organization</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1.5">
            Associating a template records your industry alignment preference without modifying your active competency library.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={profilePending}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {profilePending ? 'Saving Profile...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* Explicit Industry Template Competency Adoption */}
      {selectedTemplateId && currentTemplate && (
        <div className="mt-8 pt-8 border-t border-gray-100">
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h3 className="text-sm font-bold text-blue-950">
                    Industry Template: {currentTemplate.name}
                  </h3>
                </div>
                {currentTemplate.description && (
                  <p className="text-xs text-blue-800/80 mt-1">{currentTemplate.description}</p>
                )}
                <p className="text-xs text-blue-700 mt-2 font-medium">
                  Missing competencies from this template can be imported into your skills library with one click.
                  Existing competencies are never overwritten or deleted.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyCompetencies}
                disabled={applyPending}
                className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {applyPending ? 'Applying Competencies...' : 'Apply Missing Competencies'}
              </button>
            </div>

            {applyMessage && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs font-semibold border ${
                  applyMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-red-50 text-red-900 border-red-200'
                }`}
              >
                {applyMessage.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
