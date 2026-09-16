import { prisma } from '@/lib/db';
import { IntegrationProviderType, AuditAction, UserRole, IntegrationConfiguration, Prisma } from '@prisma/client';
import { logAuditEvent, AuditActorContext, isSensitiveKey } from './audit';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

export interface IntegrationSummaryDTO {
  id?: string;
  providerType: IntegrationProviderType;
  providerName: string;
  isEnabled: boolean;
  configurationMetadata: Record<string, unknown> | null;
  status: 'CONFIGURED' | 'CONFIGURATION_REQUIRED' | 'DISABLED';
  updatedAt?: Date;
}

export const KNOWN_PROVIDERS: Array<{
  type: IntegrationProviderType;
  name: string;
  description: string;
  supportedFields: string[];
}> = [
  {
    type: IntegrationProviderType.SSO,
    name: 'Okta Enterprise SSO',
    description: 'SAML 2.0 / OIDC enterprise single sign-on connector',
    supportedFields: ['issuerUrl', 'clientId', 'allowedDomains'],
  },
  {
    type: IntegrationProviderType.SSO,
    name: 'Microsoft Entra ID (Azure AD)',
    description: 'Enterprise identity provider for Microsoft 365 organizations',
    supportedFields: ['tenantId', 'clientId', 'discoveryEndpoint'],
  },
  {
    type: IntegrationProviderType.HRIS,
    name: 'Workday HRIS',
    description: 'Sync employee organizational hierarchies, titles, and managers',
    supportedFields: ['endpointUrl', 'tenantName', 'syncFrequency'],
  },
  {
    type: IntegrationProviderType.HRIS,
    name: 'BambooHR',
    description: 'Automated staff directory roster synchronization',
    supportedFields: ['subdomain', 'syncFrequency'],
  },
  {
    type: IntegrationProviderType.LMS,
    name: 'Coursera for Business',
    description: 'Synchronize course completions with skills competency levels',
    supportedFields: ['organizationId', 'catalogSyncEnabled'],
  },
  {
    type: IntegrationProviderType.LMS,
    name: 'Udemy Business',
    description: 'Link technical course libraries with role profile requirements',
    supportedFields: ['accountId', 'catalogSyncEnabled'],
  },
];

/**
 * Returns all integration provider configurations.
 * Merges known providers with database records.
 * Never exposes or transmits raw secrets to clients.
 */
export async function getAllIntegrationConfigurations(): Promise<IntegrationSummaryDTO[]> {
  const dbRecords = await prisma.integrationConfiguration.findMany();
  const dbMap = new Map(dbRecords.map((r) => [`${r.providerType}_${r.providerName}`, r]));

  return KNOWN_PROVIDERS.map((kp) => {
    const key = `${kp.type}_${kp.name}`;
    const record = dbMap.get(key);

    let status: 'CONFIGURED' | 'CONFIGURATION_REQUIRED' | 'DISABLED' = 'CONFIGURATION_REQUIRED';
    if (record) {
      if (!record.isEnabled) {
        status = 'DISABLED';
      } else if (record.configurationMetadata && Object.keys(record.configurationMetadata as object).length > 0) {
        status = 'CONFIGURED';
      }
    }

    return {
      id: record?.id,
      providerType: kp.type,
      providerName: kp.name,
      isEnabled: record?.isEnabled || false,
      configurationMetadata: (record?.configurationMetadata as Record<string, unknown>) || null,
      status,
      updatedAt: record?.updatedAt,
    };
  });
}

/**
 * Updates or creates an integration configuration.
 * Enforces secret safety: rejects sensitive keys in JSON metadata.
 * Audits INTEGRATION_CONFIG_UPDATE.
 */
export async function updateIntegrationConfiguration(
  actorId: string,
  input: {
    providerType: IntegrationProviderType;
    providerName: string;
    isEnabled: boolean;
    metadata?: Record<string, unknown>;
  },
  actorContext?: AuditActorContext
): Promise<IntegrationConfiguration> {
  const sanitizedMetadata: Record<string, unknown> = {};

  if (input.metadata) {
    for (const [key, value] of Object.entries(input.metadata)) {
      if (isSensitiveKey(key)) {
        throw new Error(
          `Security violation: Secret key "${key}" cannot be stored in integration configuration metadata.`
        );
      }
      sanitizedMetadata[key] = value;
    }
  }

  const updated = await prisma.integrationConfiguration.upsert({
    where: {
      providerType_providerName: {
        providerType: input.providerType,
        providerName: input.providerName,
      },
    },
    create: {
      providerType: input.providerType,
      providerName: input.providerName,
      isEnabled: input.isEnabled,
      configurationMetadata: sanitizedMetadata as Prisma.InputJsonValue,
    },
    update: {
      isEnabled: input.isEnabled,
      configurationMetadata: sanitizedMetadata as Prisma.InputJsonValue,
    },
  });

  await logAuditEvent({
    tenantId: null,
    actorId,
    actorRole: UserRole.PLATFORM_ADMIN,
    action: AuditAction.INTEGRATION_CONFIG_UPDATE,
    resourceType: 'IntegrationConfiguration',
    resourceId: updated.id,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      providerType: input.providerType,
      providerName: input.providerName,
      isEnabled: input.isEnabled,
      metadataKeys: Object.keys(sanitizedMetadata),
    },
  });

  return updated;
}
