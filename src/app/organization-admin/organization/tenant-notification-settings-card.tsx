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
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notification &amp; Reminder Preferences</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure automated assessment reminder cadences and manager review thresholds for your organization.
          </p>
        </div>
        {initialSettings.isCustom ? (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Custom Settings Active
          </span>
        ) : (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
            Using System Defaults
          </span>
        )}
      </div>

      {savedMessage && (
        <div className="mb-4 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          {savedMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label htmlFor="assessmentReminderDays" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Assessment Deadline Reminders (Days Before Due)
          </label>
          <input
            id="assessmentReminderDays"
            name="assessmentReminderDays"
            type="text"
            required
            defaultValue={initialSettings.assessmentReminderDays}
            placeholder="e.g., 3, 1"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Comma-separated list of days before deadline (e.g. &ldquo;7, 3, 1&rdquo;). Max 10 offsets between 1 and 365 days.
          </p>
        </div>

        <div>
          <label htmlFor="corroborationOverdueBusinessDays" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Business days after submission before a pending manager corroboration is marked overdue and escalates reminder alerts.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="emailEnabled"
              value="true"
              defaultChecked={initialSettings.emailEnabled}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Dispatch Email Notifications</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="inAppEnabled"
              value="true"
              defaultChecked={initialSettings.inAppEnabled}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">In-App Notifications</span>
          </label>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
          >
            {isPending ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
