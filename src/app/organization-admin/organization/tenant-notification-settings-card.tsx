'use client';

import { useState, useTransition } from 'react';
import { updateTenantNotificationSettingsAction } from '@/actions/tenant-notification-settings';
import type { TenantNotificationSettingsDTO } from '@/services/tenant-notification-settings';

interface Props {
  initialSettings: TenantNotificationSettingsDTO;
}

export function TenantNotificationSettingsCard({ initialSettings }: Props) {
  const [isPending, startTransition] = useTransition();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavedMessage(null);
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateTenantNotificationSettingsAction(formData);
        setSavedMessage('Notification settings updated successfully.');
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to update settings');
      }
    });
  };

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-8 shadow-xs mb-8">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Notification &amp; Reminder Preferences</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure automated assessment reminder cadences and manager review thresholds for your organization.
          </p>
        </div>
        {initialSettings.isCustom ? (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200/80">
            Custom Settings Active
          </span>
        ) : (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200/60">
            Using System Defaults
          </span>
        )}
      </div>

      {savedMessage && (
        <div className="mb-4 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5">
          {savedMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200/80 rounded-xl p-3.5">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label htmlFor="assessmentReminderDays" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Assessment Deadline Reminders (Days Before Due)
          </label>
          <input
            id="assessmentReminderDays"
            name="assessmentReminderDays"
            type="text"
            required
            defaultValue={initialSettings.assessmentReminderDays}
            placeholder="e.g., 3, 1"
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          />
          <p className="text-xs text-stone-500 mt-1">
            Comma-separated list of days before deadline (e.g. &ldquo;7, 3, 1&rdquo;). Max 10 offsets between 1 and 365 days.
          </p>
        </div>

        <div>
          <label htmlFor="corroborationOverdueBusinessDays" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Manager Review Overdue Threshold (Business Days)
          </label>
          <input
            id="corroborationOverdueBusinessDays"
            name="corroborationOverdueBusinessDays"
            type="number"
            min={1}
            max={60}
            required
            defaultValue={initialSettings.corroborationOverdueBusinessDays}
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          />
          <p className="text-xs text-stone-500 mt-1">
            Business days after submission before a pending manager corroboration is marked overdue and escalates reminder alerts.
          </p>
        </div>

        <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="emailEnabled"
              value="true"
              defaultChecked={initialSettings.emailEnabled}
              className="h-4 w-4 rounded border-stone-300 text-neutral-900 accent-neutral-900 focus:ring-neutral-900"
            />
            <span className="text-sm font-medium text-neutral-800">Dispatch Email Notifications</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="inAppEnabled"
              value="true"
              defaultChecked={initialSettings.inAppEnabled}
              className="h-4 w-4 rounded border-stone-300 text-neutral-900 accent-neutral-900 focus:ring-neutral-900"
            />
            <span className="text-sm font-medium text-neutral-800">In-App Notifications</span>
          </label>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            {isPending ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
