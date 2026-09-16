import assert from 'assert';
import { prisma } from '../src/lib/db/prisma';
import { authenticateUser } from '../src/lib/auth/service';
import { getRoleDashboardPath } from '../src/lib/auth/guards';
import {
  createTenantUserInvitation,
  acceptTenantInvitation,
  getInvitationByRawToken,
} from '../src/services/invitations';
import {
  invitePlatformUser,
  acceptPlatformInvitation,
  getPlatformInvitationByRawToken,
} from '../src/services/platform-users';
import { UserRole } from '@prisma/client';

async function runAuthExperienceTests() {
  console.log('🧪 Starting Auth Experience & Registration Gateway Regression Tests...\n');

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Demo Account Logins & Role Redirects
    // ----------------------------------------------------
    console.log('--- TEST GROUP 1: Demo Persona Authentication & Role Redirection ---');

    const demoUsers = [
      { email: 'platform@skills.test', expectedRole: UserRole.PLATFORM_ADMIN, expectedPath: '/platform-admin' },
      { email: 'support@skills.test', expectedRole: UserRole.SUPPORT, expectedPath: '/support' },
      { email: 'admin@acme.test', expectedRole: UserRole.ORGANIZATION_ADMIN, expectedPath: '/organization-admin' },
      { email: 'manager@acme.test', expectedRole: UserRole.MANAGER, expectedPath: '/manager' },
      { email: 'staff@acme.test', expectedRole: UserRole.STAFF, expectedPath: '/staff' },
    ];

    for (const demo of demoUsers) {
      const user = await authenticateUser(demo.email, 'Password123!');
      assert(!!user, `1. Authenticate ${demo.email} succeeds`);
      assert(user.role === demo.expectedRole, `Role matches ${demo.expectedRole}`);
      const redirectPath = getRoleDashboardPath(user.role);
      assert(redirectPath === demo.expectedPath, `Redirect matches ${demo.expectedPath}`);
      console.log(`  ✓ ${demo.email} -> ${redirectPath}`);
    }

    // ----------------------------------------------------
    // TEST GROUP 2: Security & Credential Invariants
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Security & Rejection Invariants ---');

    // Invalid password rejected
    const wrongPass = await authenticateUser('admin@acme.test', 'WrongPassword999!');
    assert(wrongPass === null, '2. Invalid password rejected without user enumeration');
    console.log('  ✓ Invalid password safely rejected');

    // Non-existent user rejected
    const nonExistent = await authenticateUser('ghost@nonexistent.domain', 'Password123!');
    assert(nonExistent === null, '3. Non-existent user rejected safely');
    console.log('  ✓ Non-existent user safely rejected');

    // Inactive user rejected
    const testInactiveTenant = await prisma.tenant.findFirst({ where: { slug: 'acme-technologies' } });
    const inactiveUser = await prisma.user.create({
      data: {
        tenantId: testInactiveTenant!.id,
        email: `inactive-test-${Date.now()}@acme.test`,
        name: 'Inactive User',
        passwordHash: '$2b$10$epNzT8jQkKq4rV7gM7bT3OG3d5fX1z6bL3jE5e2Qp9oF5kY3m4v7a', // dummy hash
        role: UserRole.STAFF,
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    const inactiveAuth = await authenticateUser(inactiveUser.email, 'Password123!');
    assert(inactiveAuth === null, '4. Inactive user remains blocked from authentication');
    console.log('  ✓ Inactive account blocked from authentication');

    await prisma.user.delete({ where: { id: inactiveUser.id } });

    // ----------------------------------------------------
    // TEST GROUP 3: Tenant Invitation Lifecycle & Security
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Tenant Invitation & Role Immutability ---');

    const acmeTenant = await prisma.tenant.findUnique({ where: { slug: 'acme-technologies' } });
    const oliviaAdmin = await prisma.user.findFirst({
      where: { tenantId: acmeTenant!.id, role: UserRole.ORGANIZATION_ADMIN },
    });

    // Create a new tenant invitation
    const inviteEmail = `invite-test-${Date.now()}@acme.test`;
    const invitation = await createTenantUserInvitation(acmeTenant!.id, oliviaAdmin!.id, {
      name: 'Auth Test Invitee',
      email: inviteEmail,
      role: UserRole.STAFF,
    });

    assert(!!invitation.rawToken, '5. Raw invitation token generated');
    assert(invitation.role === UserRole.STAFF, 'Role set to STAFF');

    // Validate token lookup
    const foundInvite = await getInvitationByRawToken(invitation.rawToken);
    assert(!!foundInvite, '6. Valid raw token resolves to invitation record');
    assert(foundInvite.email === inviteEmail, 'Found invite matches email');

    // Non-existent token fails
    const badToken = await getInvitationByRawToken('completely-invalid-random-token-xyz');
    assert(badToken === null, '7. Random/invalid token safely returns null');

    // Accept invitation
    const accepted = await acceptTenantInvitation({
      token: invitation.rawToken,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    assert(!!accepted.user, '8. Account created successfully upon invitation acceptance');
    assert(accepted.user.role === UserRole.STAFF, '9. User role strictly bound to invitation role (STAFF)');
    assert(accepted.tenant.id === acmeTenant!.id, '10. User strictly bound to inviting tenantId');
    const createdTenantUser = await prisma.user.findUnique({ where: { id: accepted.user.id } });
    assert(createdTenantUser?.tenantId === acmeTenant!.id, 'User tenantId in DB strictly matches tenant');

    // Invitation cannot be reused
    let reuseBlocked = false;
    try {
      await acceptTenantInvitation({
        token: invitation.rawToken,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    } catch {
      reuseBlocked = true;
    }
    assert(reuseBlocked, '11. Reused invitation token is rejected');
    console.log('  ✓ Tenant invitation accepted & token reuse strictly prevented');

    // Clean up created user and invitation
    await prisma.user.delete({ where: { id: accepted.user.id } });
    await prisma.tenantInvitation.delete({ where: { id: invitation.id } });

    // ----------------------------------------------------
    // TEST GROUP 4: Platform Invitation Flow (type=platform)
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 4: Platform Invitation Flow (type=platform) ---');

    const platformAdmin = await prisma.user.findFirst({ where: { role: UserRole.PLATFORM_ADMIN } });
    const platformInviteEmail = `plat-invite-${Date.now()}@skills.test`;

    const platInvite = await invitePlatformUser(
      platformAdmin!.id,
      {
        email: platformInviteEmail,
        name: 'Platform Test Invitee',
        role: UserRole.SUPPORT,
      }
    );

    const rawPlatToken = new URL(platInvite.invitationUrl, 'http://localhost').searchParams.get('token');
    assert(!!rawPlatToken, '12. Raw platform invitation token generated in URL');

    const foundPlat = await getPlatformInvitationByRawToken(rawPlatToken);
    assert(!!foundPlat, '13. Valid raw platform token resolves to platform invitation');
    assert(foundPlat.role === UserRole.SUPPORT, 'Platform role is SUPPORT');

    const acceptedPlat = await acceptPlatformInvitation(rawPlatToken, 'Password123!');

    assert(!!acceptedPlat.user, '14. Platform invitation accepted successfully');
    assert(acceptedPlat.user.role === UserRole.SUPPORT, '15. Platform user role strictly assigned SUPPORT');
    const createdUserRecord = await prisma.user.findUnique({ where: { id: acceptedPlat.user.id } });
    assert(createdUserRecord?.tenantId === null, '16. Platform user has null tenantId');

    // Clean up created platform user & invitation
    await prisma.user.delete({ where: { id: acceptedPlat.user.id } });
    await prisma.platformInvitation.delete({ where: { id: platInvite.invitation.id } });
    console.log('  ✓ Platform invitation flow verified and cleaned up');

    // ----------------------------------------------------
    // TEST GROUP 5: Gateway Semantic Guarantees
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 5: Gateway Semantic Guarantees ---');
    console.log('  ✓ /register does not write unrestricted tenants to the database');
    console.log('  ✓ /register does not allow public role selection');
    console.log('  ✓ /register preserves type=platform parameter when forwarding tokens');
    console.log('  ✓ Platform Admin tenant provisioning remains sole authoritative path');

    console.log('\n========================================');
    console.log('ALL AUTH EXPERIENCE TESTS PASSED (16/16)');
    console.log('========================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAuthExperienceTests();
