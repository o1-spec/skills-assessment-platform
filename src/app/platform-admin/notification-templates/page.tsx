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
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Notification Templates</h1>
        <p className="mt-1 text-sm text-stone-500">
          Customize system-wide in-app notifications and email dispatch messages. All templates support dynamic variable placeholders with guaranteed built-in fallbacks.
        </p>
      </div>

      <div className="bg-neutral-900 text-stone-100 rounded-2xl p-6 shadow-xs space-y-3 border border-neutral-800">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h2 className="text-sm font-semibold text-stone-100">Allowed Dynamic Placeholders</h2>
        </div>
        <p className="text-xs text-stone-400">
          The following whitelisted variables are safely interpolated at dispatch time. Unknown variables are rejected to ensure delivery safety:
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {ALLOWED_TEMPLATE_VARIABLES.map((v) => (
            <code key={v} className="text-xs font-mono bg-neutral-800 text-stone-200 border border-neutral-700 px-3 py-1 rounded-xl">
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {templates.map((tpl) => (
          <div
            key={`${tpl.type}_${tpl.channel}`}
            className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-base font-bold text-stone-900">{tpl.type}</span>
                <span className="ml-2.5 inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200/80">
                  {tpl.channel}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {tpl.isCustom ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800 border border-stone-200/80">
                    Custom Template
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                    Built-in Default
                  </span>
                )}
                {tpl.isCustom && (
                  <form action={resetNotificationTemplateAction}>
                    <input type="hidden" name="type" value={tpl.type} />
                    <input type="hidden" name="channel" value={tpl.channel} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline transition-colors"
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
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    defaultValue={tpl.subject || ''}
                    placeholder="Enter email subject with optional {{variables}}..."
                    className="w-full border border-stone-200/80 bg-stone-50/40 rounded-xl px-3.5 py-2 text-sm text-stone-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Notification Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={tpl.title || ''}
                    placeholder="Enter in-app notification title..."
                    className="w-full border border-stone-200/80 bg-stone-50/40 rounded-xl px-3.5 py-2 text-sm text-stone-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Message Body
                </label>
                <textarea
                  name="body"
                  rows={4}
                  required
                  defaultValue={tpl.body}
                  className="w-full font-mono text-xs border border-stone-200/80 bg-stone-50/40 rounded-xl p-3.5 text-stone-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-xl transition-colors shadow-xs"
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
