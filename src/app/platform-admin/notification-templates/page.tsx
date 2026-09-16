import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import {
  getAllNotificationTemplates,
  ALLOWED_TEMPLATE_VARIABLES,
} from '@/services/notification-templates';
import {
  updateNotificationTemplateAction,
  resetNotificationTemplateAction,
} from '@/actions/notification-templates';

export const metadata = {
  title: 'Notification Templates | Skills Assessment Platform',
  description: 'Manage system-wide notification templates and email messages.',
};

export default async function NotificationTemplatesPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const templates = await getAllNotificationTemplates();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Templates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Customize system-wide in-app notifications and email dispatch messages. All templates support dynamic variable placeholders with guaranteed built-in fallbacks.
        </p>
      </div>

      {/* Variable Reference Card */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h2 className="text-sm font-semibold text-slate-100">Allowed Dynamic Placeholders</h2>
        </div>
        <p className="text-xs text-slate-400">
          The following whitelisted variables are safely interpolated at dispatch time. Unknown variables are rejected to ensure delivery safety:
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {ALLOWED_TEMPLATE_VARIABLES.map((v) => (
            <code key={v} className="text-xs font-mono bg-slate-800 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded">
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-6">
        {templates.map((tpl) => (
          <div
            key={`${tpl.type}_${tpl.channel}`}
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <span className="text-base font-bold text-gray-900">{tpl.type}</span>
                <span className="ml-2.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                  {tpl.channel}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {tpl.isCustom ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    Custom Template
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Built-in Default
                  </span>
                )}
                {tpl.isCustom && (
                  <form action={resetNotificationTemplateAction}>
                    <input type="hidden" name="type" value={tpl.type} />
                    <input type="hidden" name="channel" value={tpl.channel} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                    >
                      Reset to Default
                    </button>
                  </form>
                )}
              </div>
            </div>

            <form action={updateNotificationTemplateAction} className="space-y-4">
              <input type="hidden" name="type" value={tpl.type} />
              <input type="hidden" name="channel" value={tpl.channel} />

              {tpl.channel === 'EMAIL' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    defaultValue={tpl.subject || ''}
                    placeholder="Enter email subject with optional {{variables}}..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Notification Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={tpl.title || ''}
                    placeholder="Enter in-app notification title..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Message Body
                </label>
                <textarea
                  name="body"
                  rows={4}
                  required
                  defaultValue={tpl.body}
                  className="w-full font-mono text-xs border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
