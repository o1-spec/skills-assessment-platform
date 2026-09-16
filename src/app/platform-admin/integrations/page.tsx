import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getAllIntegrationConfigurations } from '@/services/integrations';
import { MFA_IMPLEMENTATION_STATUS } from '@/services/sso';
import { updateIntegrationAction } from '@/actions/integrations';

export const metadata = {
  title: 'Global Integrations | Skills Assessment Platform',
  description: 'Enterprise SSO, HRIS sync, and LMS integration configurations.',
};

export default async function IntegrationsPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const integrations = await getAllIntegrationConfigurations();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Integration Configuration &amp; SSO Foundation</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage enterprise single sign-on (SSO), HRIS employee synchronization, and LMS course library integrations.
        </p>
      </div>

      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 flex items-start gap-3.5">
        <div className="text-amber-700 mt-0.5 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-amber-950">Zero-Secret Exposure Principle</h2>
          <p className="text-xs text-amber-900 mt-1 leading-relaxed">
            Sensitive authentication secrets, client credentials, and private certificates are never stored directly in plain database records or exposed in responses. Configuration metadata stores endpoints, identifiers, and non-sensitive attributes.
          </p>
        </div>
      </div>

      <div className="bg-neutral-900 text-stone-100 rounded-2xl p-6 shadow-xs space-y-3 border border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-100">Multi-Factor Authentication (MFA) Architecture</h2>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-neutral-800 text-amber-300 border border-neutral-700">
            {MFA_IMPLEMENTATION_STATUS.status}
          </span>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          {MFA_IMPLEMENTATION_STATUS.details}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((int) => (
          <div
            key={`${int.providerType}_${int.providerName}`}
            className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    {int.providerType}
                  </span>
                  <h3 className="text-base font-bold text-stone-900 mt-0.5">{int.providerName}</h3>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    int.status === 'CONFIGURED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                      : int.status === 'DISABLED'
                        ? 'bg-stone-100 text-stone-600 border-stone-200/80'
                        : 'bg-amber-50 text-amber-800 border-amber-200/80'
                  }`}
                >
                  {int.status.replace(/_/g, ' ')}
                </span>
              </div>

              {int.configurationMetadata && Object.keys(int.configurationMetadata).length > 0 && (
                <div className="mt-3 bg-stone-50 border border-stone-200/60 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Configured Metadata
                  </span>
                  <pre className="text-[11px] font-mono text-stone-700 overflow-x-auto">
                    {JSON.stringify(int.configurationMetadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <form action={updateIntegrationAction} className="pt-3 border-t border-stone-100 space-y-3">
              <input type="hidden" name="providerType" value={int.providerType} />
              <input type="hidden" name="providerName" value={int.providerName} />

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Metadata JSON (non-secret properties)
                </label>
                <textarea
                  name="metadata"
                  rows={2}
                  defaultValue={
                    int.configurationMetadata
                      ? JSON.stringify(int.configurationMetadata)
                      : '{}'
                  }
                  placeholder='{"issuerUrl": "https://identity.example.com", "clientId": "skills-client"}'
                  className="w-full font-mono text-xs border border-stone-200/80 bg-stone-50/40 rounded-xl p-3 text-stone-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isEnabled"
                    value="true"
                    defaultChecked={int.isEnabled}
                    className="h-4 w-4 rounded border-stone-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="text-xs font-medium text-stone-700">Enable Provider</span>
                </label>

                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-xl transition-colors shadow-xs"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
