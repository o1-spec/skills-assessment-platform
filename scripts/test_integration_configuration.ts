import { prisma } from '../src/lib/db';
import {
  getAllIntegrationConfigurations,
  updateIntegrationConfiguration,
} from '../src/services/integrations';
import { getTenantSsoStatus, MFA_IMPLEMENTATION_STATUS } from '../src/services/sso';
import { IntegrationProviderType, AuditAction, UserRole } from '@prisma/client';

async function run() {
  console.log('=== Running Integration Configuration & SSO Test Suite ===');

  const admin = await prisma.user.findFirst({
    where: { role: UserRole.PLATFORM_ADMIN },
  });
  if (!admin) throw new Error('Platform admin user not found');

  // 1. Fetch all configurations
  const configs = await getAllIntegrationConfigurations();
  if (configs.length < 6) {
    throw new Error(`Expected at least 6 known integration providers, got ${configs.length}`);
  }
  console.log(`✔ Retrieved ${configs.length} integration provider configs`);

  // 2. Secret safety: Rejection of secret keys
  try {
    await updateIntegrationConfiguration(admin.id, {
      providerType: IntegrationProviderType.SSO,
      providerName: 'Okta Enterprise SSO',
      isEnabled: true,
      metadata: {
        clientSecret: 'super-secret-password-12345',
        issuerUrl: 'https://okta.example.com',
      },
    });
    throw new Error('Should have rejected clientSecret in metadata');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('Secret key "clientSecret" cannot be stored')) {
      throw new Error(`Unexpected error: ${msg}`);
    }
    console.log('✔ Correctly blocked sensitive secret key from being stored in integration metadata');
  }

  // 3. Update configuration with sanitized, non-sensitive metadata
  const updated = await updateIntegrationConfiguration(admin.id, {
    providerType: IntegrationProviderType.SSO,
    providerName: 'Okta Enterprise SSO',
    isEnabled: true,
    metadata: {
      issuerUrl: 'https://okta.example.com',
      clientId: 'skills-client-app',
      allowedDomains: ['acme.com', 'example.com'],
    },
  });

  if (!updated.isEnabled) {
    throw new Error('Expected integration to be enabled');
  }
  console.log('✔ Successfully saved non-sensitive integration configuration');

  // 4. Verify audit log
  const audit = await prisma.auditLog.findFirst({
    where: {
      action: AuditAction.INTEGRATION_CONFIG_UPDATE,
      actorId: admin.id,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!audit) {
    throw new Error('Expected INTEGRATION_CONFIG_UPDATE audit log entry');
  }
  console.log('✔ Audit log verified for integration update');

  // 5. Check tenant SSO status
  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE' },
  });
  if (tenant) {
    const ssoStatus = await getTenantSsoStatus(tenant.id);
    console.log(`✔ Tenant SSO status check: ${ssoStatus.status} (${ssoStatus.message})`);
  }

  // 6. Verify MFA Documentation Status
  if (MFA_IMPLEMENTATION_STATUS.status !== 'NOT_IMPLEMENTED') {
    throw new Error('Expected MFA status NOT_IMPLEMENTED');
  }
  console.log('✔ MFA implementation status documentation verified:', MFA_IMPLEMENTATION_STATUS.reason);

  console.log('✔ Integration Configuration tests passed successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Integration Configuration test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
