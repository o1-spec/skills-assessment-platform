import { prisma } from '../src/lib/db';
import {
  startSupportImpersonation,
  endSupportImpersonation,
  assertNotImpersonating,
} from '../src/services/impersonation';
import { UserRole, AuditAction } from '@prisma/client';

async function run() {
  console.log('=== Running Support Impersonation Test Suite ===');

  // 1. Fetch or create support user and target tenant
  let supportUser = await prisma.user.findFirst({
    where: { role: UserRole.SUPPORT },
  });

  if (!supportUser) {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('SupportPass123!', 10);
    supportUser = await prisma.user.create({
      data: {
        email: 'support@skills.test',
        name: 'Support Agent Sam',
        role: UserRole.SUPPORT,
        passwordHash,
        isActive: true,
        tenantId: null,
      },
    });
    console.log('Created test SUPPORT user:', supportUser.email);
  }

  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE' },
  });
  if (!tenant) {
    throw new Error('Active tenant not found in database');
  }

  // 2. Unauthorized role check
  try {
    await startSupportImpersonation(
      'fake-id',
      UserRole.STAFF,
      tenant.id,
      'Attempt unauthorized impersonation'
    );
    throw new Error('Should have rejected STAFF role from impersonating');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('Access denied')) {
      throw new Error(`Unexpected error message: ${msg}`);
    }
    console.log('✔ Correctly denied STAFF from starting impersonation session');
  }

  // 3. Short reason rejection
  try {
    await startSupportImpersonation(
      supportUser.id,
      UserRole.SUPPORT,
      tenant.id,
      'bad'
    );
    throw new Error('Should have rejected short reason');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('minimum 5 characters')) {
      throw new Error(`Unexpected error message: ${msg}`);
    }
    console.log('✔ Correctly rejected short reason (<5 chars)');
  }

  // 4. Start valid impersonation session
  const session = await startSupportImpersonation(
    supportUser.id,
    UserRole.SUPPORT,
    tenant.id,
    'Investigating customer ticket #8012 - assessment review',
    { ipAddress: '127.0.0.1', userAgent: 'TestSuite/1.0' }
  );

  console.log('Started session for tenant:', session.impersonatedTenantName);
  if (session.impersonatedTenantId !== tenant.id) {
    throw new Error('Mismatched tenant ID in session data');
  }
  if (session.realActorId !== supportUser.id) {
    throw new Error('Real actor ID was not retained');
  }

  // 5. Verify audit event for start
  const startAudit = await prisma.auditLog.findFirst({
    where: {
      action: AuditAction.SUPPORT_IMPERSONATION_START,
      tenantId: tenant.id,
      actorId: supportUser.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!startAudit) {
    throw new Error('Expected SUPPORT_IMPERSONATION_START audit log entry');
  }
  console.log('✔ Found start audit event with real actor ID:', startAudit.actorId);

  // 6. Test guard against destructive operations
  try {
    assertNotImpersonating(true, 'Tenant deletion');
    throw new Error('Should have blocked operation during impersonation');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('cannot be performed while in Support Impersonation Mode')) {
      throw new Error(`Unexpected guard message: ${msg}`);
    }
    console.log('✔ Destructive action guard correctly blocked operation during impersonation');
  }

  // 7. End impersonation session
  const endResult = await endSupportImpersonation(
    supportUser.id,
    UserRole.SUPPORT,
    tenant.id,
    { ipAddress: '127.0.0.1' }
  );

  if (!endResult.success || endResult.redirectPath !== '/support') {
    throw new Error('Unexpected end impersonation result');
  }

  // 8. Verify audit event for end
  const endAudit = await prisma.auditLog.findFirst({
    where: {
      action: AuditAction.SUPPORT_IMPERSONATION_END,
      tenantId: tenant.id,
      actorId: supportUser.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!endAudit) {
    throw new Error('Expected SUPPORT_IMPERSONATION_END audit log entry');
  }
  console.log('✔ Found end audit event with real actor ID:', endAudit.actorId);

  console.log('✔ Support Impersonation tests passed successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Support Impersonation test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
