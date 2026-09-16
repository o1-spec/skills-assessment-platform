import { prisma } from '@/lib/db';
import { IntegrationProviderType } from '@prisma/client';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

/**
 * MFA Status per specification:
 * Documented as NOT IMPLEMENTED to avoid building unverified custom TOTP cryptography.
 */
export const MFA_IMPLEMENTATION_STATUS = {
  status: 'NOT_IMPLEMENTED',
  reason: 'OPTIONAL_COULD_REQUIREMENT_PRESERVED_SECURITY',
  details:
    'MFA foundation is deferred to avoid unverified custom TOTP cryptography. Standard enterprise SSO handles multi-factor authentication at the identity provider layer.',
} as const;

export interface TenantSsoStatus {
  enabled: boolean;
  status: 'NOT_CONFIGURED' | 'CONFIGURED' | 'DISABLED';
  providerName?: string;
  issuerUrl?: string;
  loginHint?: string;
  message: string;
}

/**
 * Checks if a tenant has enterprise SSO enabled and configured.
 * Does NOT break existing password authentication.
 */
export async function getTenantSsoStatus(tenantId: string): Promise<TenantSsoStatus> {
  if (!tenantId) {
    return {
      enabled: false,
      status: 'NOT_CONFIGURED',
      message: 'SSO is not configured for this organization.',
    };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { domain: true, name: true },
  });

  if (!tenant || !tenant.domain) {
    return {
      enabled: false,
      status: 'NOT_CONFIGURED',
      message: 'SSO is not configured for this organization.',
    };
  }

  const ssoConfig = await prisma.integrationConfiguration.findFirst({
    where: {
      providerType: IntegrationProviderType.SSO,
      isEnabled: true,
    },
  });

  if (!ssoConfig || !ssoConfig.configurationMetadata) {
    return {
      enabled: false,
      status: 'NOT_CONFIGURED',
      message: 'SSO is not configured for this organization.',
    };
  }

  const meta = ssoConfig.configurationMetadata as Record<string, unknown>;
  const allowedDomains = Array.isArray(meta.allowedDomains)
    ? (meta.allowedDomains as string[])
    : typeof meta.allowedDomains === 'string'
      ? meta.allowedDomains.split(',').map((d) => d.trim().toLowerCase())
      : [];

  const matchesDomain = allowedDomains.includes(tenant.domain.toLowerCase().trim());

  if (!matchesDomain) {
    return {
      enabled: false,
      status: 'DISABLED',
      providerName: ssoConfig.providerName,
      message: `SSO domain "${tenant.domain}" is not authorized for ${ssoConfig.providerName}.`,
    };
  }

  return {
    enabled: true,
    status: 'CONFIGURED',
    providerName: ssoConfig.providerName,
    issuerUrl: typeof meta.issuerUrl === 'string' ? meta.issuerUrl : undefined,
    loginHint: `Sign in with ${ssoConfig.providerName} (${tenant.domain})`,
    message: `Enterprise SSO is enabled via ${ssoConfig.providerName}.`,
  };
}
