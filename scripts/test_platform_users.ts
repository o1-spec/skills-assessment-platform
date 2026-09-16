import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { UserRole, AuditAction } from '@prisma/client';
import {
  invitePlatformUser,
  acceptPlatformInvitation,
  getPlatformInvitationByRawToken,
  getPlatformUsers,
  getPendingPlatformInvitations,
  changePlatformUserRole,
  deactivatePlatformUser,
  reactivatePlatformUser,
  cancelPlatformInvitation,
} from '../src/services/platform-users';

async function runTests() {
  console.log('🧪 Starting Platform Users Service Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // Cleanup any leftover test records
  const TEST_PREFIX = 'test_plat_';
  await prisma.platformInvitation.deleteMany({
    where: { email: { contains: TEST_PREFIX } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: TEST_PREFIX } },
  });

  // Fetch or ensure an actor platform admin exists
  let actor = await prisma.user.findFirst({
    where: { role: UserRole.PLATFORM_ADMIN, tenantId: null, isActive: true },
  });
  if (!actor) {
    actor = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}actor_admin@example.com`,
        name: 'Initial Platform Admin',
        passwordHash: 'dummy_hash',
        role: UserRole.PLATFORM_ADMIN,
        tenantId: null,
        isActive: true,
      },
    });
  }

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Role Enforcement on Invite
    // ----------------------------------------------------
    console.log('--- TEST GROUP 1: Role Enforcement on Invite ---');

    let errorThrown = false;
    try {
      await invitePlatformUser(actor.id, {
        email: `${TEST_PREFIX}invalid_role@example.com`,
        name: 'Invalid Org Admin',
        role: UserRole.ORGANIZATION_ADMIN,
      });
    } catch (err: unknown) {
      errorThrown = true;
      assert(
        (err as Error).message.includes('Only PLATFORM_ADMIN and SUPPORT are permitted'),
        '1. Rejects non-platform role ORGANIZATION_ADMIN'
      );
    }
    assert(errorThrown, '2. Threw error on invalid role');

    errorThrown = false;
    try {
      await invitePlatformUser(actor.id, {
        email: `${TEST_PREFIX}invalid_role2@example.com`,
        name: 'Invalid Staff',
        role: UserRole.STAFF,
      });
    } catch {
      errorThrown = true;
    }
    assert(errorThrown, '3. Rejects non-platform role STAFF');

    // ----------------------------------------------------
    // TEST GROUP 2: Successful Platform Invitations
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Successful Platform Invitations ---');

    const supportInviteEmail = `${TEST_PREFIX}support_user@example.com`;
    const inviteRes = await invitePlatformUser(actor.id, {
      email: supportInviteEmail,
      name: 'Alice Support',
      role: UserRole.SUPPORT,
    });

    assert(!!inviteRes.invitation.id, '4. Created platform invitation for SUPPORT');
    assert(inviteRes.invitation.role === UserRole.SUPPORT, '5. Correct role stored in invitation');
    assert(inviteRes.invitationUrl.includes('type=platform'), '6. Invitation URL has type=platform');
    assert(inviteRes.invitationUrl.includes('token='), '7. Invitation URL has token parameter');

    // Verify token hash
    const rawToken = new URL(inviteRes.invitationUrl, 'http://localhost').searchParams.get('token')!;
    assert(!!rawToken, '8. Raw token successfully extracted');
    assert(inviteRes.invitation.tokenHash !== rawToken, '9. Raw token is hashed in DB, never plain');

    // Audit log check for invite
    const inviteAudit = await prisma.auditLog.findFirst({
      where: {
        action: AuditAction.PLATFORM_USER_INVITE,
        resourceId: inviteRes.invitation.id,
      },
    });
    assert(!!inviteAudit, '10. PLATFORM_USER_INVITE audit log created');
    assert(inviteAudit?.tenantId === null, '11. Audit log tenantId is null');

    // Duplicate email invitation reject
    errorThrown = false;
    try {
      await invitePlatformUser(actor.id, {
        email: supportInviteEmail,
        name: 'Duplicate Alice',
        role: UserRole.SUPPORT,
      });
    } catch (err: unknown) {
      errorThrown = true;
      assert(
        (err as Error).message.includes('pending platform invitation for this email already exists'),
        '12. Rejects duplicate live platform invitation'
      );
    }
    assert(errorThrown, '13. Threw error on duplicate invitation');

    // ----------------------------------------------------
    // TEST GROUP 3: Token Lookup & Accept Flow
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Token Lookup & Accept Flow ---');

    const fetchedInvite = await getPlatformInvitationByRawToken(rawToken);
    assert(!!fetchedInvite, '14. getPlatformInvitationByRawToken found invitation');
    assert(fetchedInvite?.email === supportInviteEmail, '15. Email matches fetched invitation');

    // Accept invitation
    const acceptRes = await acceptPlatformInvitation(rawToken, 'SecretPassword123!');
    assert(!!acceptRes.user.id, '16. Accepted invitation and created user');
    assert(acceptRes.user.role === UserRole.SUPPORT, '17. Created user has SUPPORT role');

    // Verify user database record
    const createdUser = await prisma.user.findUnique({
      where: { id: acceptRes.user.id },
    });
    assert(createdUser?.tenantId === null, '18. Invariant: created user tenantId is NULL');
    assert(createdUser?.isActive === true, '19. Created user is active');

    // Verify invitation is marked accepted
    const updatedInvite = await prisma.platformInvitation.findUnique({
      where: { id: inviteRes.invitation.id },
    });
    assert(!!updatedInvite?.acceptedAt, '20. Invitation acceptedAt timestamp set');

    // Cannot re-accept
    errorThrown = false;
    try {
      await acceptPlatformInvitation(rawToken, 'AnotherPassword123!');
    } catch (err: unknown) {
      errorThrown = true;
      assert(
        (err as Error).message.includes('already been accepted'),
        '21. Rejects re-accepting an already accepted invitation'
      );
    }
    assert(errorThrown, '22. Threw error on re-accept');

    // ----------------------------------------------------
    // TEST GROUP 4: Cancellation & Expiry
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 4: Cancellation & Expiry ---');

    const cancelEmail = `${TEST_PREFIX}to_cancel@example.com`;
    const cancelInviteRes = await invitePlatformUser(actor.id, {
      email: cancelEmail,
      name: 'To Cancel',
      role: UserRole.SUPPORT,
    });
    const cancelToken = new URL(cancelInviteRes.invitationUrl, 'http://localhost').searchParams.get('token')!;

    await cancelPlatformInvitation(actor.id, cancelInviteRes.invitation.id);
    const cancelledRecord = await prisma.platformInvitation.findUnique({
      where: { id: cancelInviteRes.invitation.id },
    });
    assert(!!cancelledRecord?.cancelledAt, '23. Invitation cancelledAt timestamp set');

    errorThrown = false;
    try {
      await acceptPlatformInvitation(cancelToken, 'Secret123!');
    } catch (err: unknown) {
      errorThrown = true;
      assert(
        (err as Error).message.includes('cancelled'),
        '24. Cannot accept cancelled invitation'
      );
    }
    assert(errorThrown, '25. Threw error on cancelled invitation accept');

    // Expired invitation test
    const expiredInvite = await prisma.platformInvitation.create({
      data: {
        email: `${TEST_PREFIX}expired@example.com`,
        name: 'Expired User',
        role: UserRole.SUPPORT,
        tokenHash: 'dummy_expired_hash',
        expiresAt: new Date(Date.now() - 10000), // in the past
      },
    });
    assert(expiredInvite.expiresAt < new Date(), '26. Created expired invitation record');

    // ----------------------------------------------------
    // TEST GROUP 5: Role Changes & Invariants
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 5: Role Changes & Invariants ---');

    // Promote created user to PLATFORM_ADMIN
    const promotedUser = await changePlatformUserRole(
      actor.id,
      createdUser!.id,
      UserRole.PLATFORM_ADMIN
    );
    assert(promotedUser.role === UserRole.PLATFORM_ADMIN, '27. Successfully promoted SUPPORT to PLATFORM_ADMIN');

    const roleAudit = await prisma.auditLog.findFirst({
      where: {
        action: AuditAction.PLATFORM_USER_ROLE_CHANGE,
        resourceId: createdUser!.id,
      },
    });
    assert(!!roleAudit, '28. PLATFORM_USER_ROLE_CHANGE audit log created');

    // Prevent changing self role
    errorThrown = false;
    try {
      await changePlatformUserRole(actor.id, actor.id, UserRole.SUPPORT);
    } catch (err: unknown) {
      errorThrown = true;
      assert(
        (err as Error).message.toLowerCase().includes('cannot change their own role'),
        '29. Rejects self role change'
      );
    }
    assert(errorThrown, '30. Threw error on self role change');

    // Prevent non-platform role assignment
    errorThrown = false;
    try {
      await changePlatformUserRole(actor.id, createdUser!.id, UserRole.MANAGER);
    } catch (err: unknown) {
      errorThrown = true;
      assert(
        (err as Error).message.includes('Only PLATFORM_ADMIN and SUPPORT are permitted'),
        '31. Rejects invalid role assignment MANAGER'
      );
    }
    assert(errorThrown, '32. Threw error on invalid role assignment');

    // ----------------------------------------------------
    // TEST GROUP 6: Deactivation, Reactivation & Lockout Protection
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 6: Deactivation & Lockout Protection ---');

    // Deactivate created user
    const deactivated = await deactivatePlatformUser(actor.id, createdUser!.id);
    assert(deactivated.isActive === false, '33. Platform user deactivated');
    assert(!!deactivated.deactivatedAt, '34. deactivatedAt timestamp populated');

    const deactAudit = await prisma.auditLog.findFirst({
      where: {
        action: AuditAction.PLATFORM_USER_DEACTIVATE,
        resourceId: createdUser!.id,
      },
    });
    assert(!!deactAudit, '35. PLATFORM_USER_DEACTIVATE audit log created');

    // Reactivate user
    const reactivated = await reactivatePlatformUser(actor.id, createdUser!.id);
    assert(reactivated.isActive === true, '36. Platform user reactivated');
    assert(reactivated.deactivatedAt === null, '37. deactivatedAt cleared');

    const reactAudit = await prisma.auditLog.findFirst({
      where: {
        action: AuditAction.PLATFORM_USER_REACTIVATE,
        resourceId: createdUser!.id,
      },
    });
    assert(!!reactAudit, '38. PLATFORM_USER_REACTIVATE audit log created');

    // Self-deactivation rejection
    errorThrown = false;
    try {
      await deactivatePlatformUser(actor.id, actor.id);
    } catch (err: unknown) {
      errorThrown = true;
      assert(
        (err as Error).message.toLowerCase().includes('cannot deactivate their own account'),
        '39. Rejects self deactivation'
      );
    }
    assert(errorThrown, '40. Threw error on self-deactivation');

    // Demote created user back to SUPPORT so actor is the sole active PLATFORM_ADMIN
    await changePlatformUserRole(actor.id, createdUser!.id, UserRole.SUPPORT);

    // Now attempt to demote or deactivate actor (the sole active PLATFORM_ADMIN)
    errorThrown = false;
    try {
      // Create a second support user to try demoting actor (simulate another actor or test lockout guard)
      // Directly test assertNotLastActivePlatformAdmin via demotion
      await changePlatformUserRole(createdUser!.id, actor.id, UserRole.SUPPORT);
    } catch (err: unknown) {
      errorThrown = true;
      assert(
        (err as Error).message.includes('last active Platform Administrator'),
        '41. Protects against removing / demoting the last active Platform Admin'
      );
    }
    assert(errorThrown, '42. Lockout protection successfully caught last admin demotion');

    // ----------------------------------------------------
    // TEST GROUP 7: Tenant User Invariant Protection
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 7: Tenant User Invariant Protection ---');

    // Ensure a tenant user cannot be modified by platform user service
    const tenantUser = await prisma.user.findFirst({
      where: { tenantId: { not: null } },
    });

    if (tenantUser) {
      errorThrown = false;
      try {
        await changePlatformUserRole(actor.id, tenantUser.id, UserRole.SUPPORT);
      } catch (err: unknown) {
        errorThrown = true;
        assert(
          (err as Error).message.includes('Cannot modify a tenant account'),
          '43. Rejects modifying a tenant user via platform user service'
        );
      }
      assert(errorThrown, '44. Tenant user invariant preserved');
    } else {
      console.log('  ⚠ Skipping tenant user invariant test (no tenant user found)');
    }

    // ----------------------------------------------------
    // TEST GROUP 8: Read Queries
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 8: Read Queries ---');

    const platformUsers = await getPlatformUsers();
    assert(platformUsers.length >= 2, '45. getPlatformUsers returned platform accounts');
    assert(
      platformUsers.every((u) => u.tenantId === null),
      '46. All returned users have tenantId === null'
    );
    assert(
      platformUsers.every((u) => u.role === UserRole.PLATFORM_ADMIN || u.role === UserRole.SUPPORT),
      '47. All returned users are PLATFORM_ADMIN or SUPPORT'
    );

    const pendingInvites = await getPendingPlatformInvitations();
    assert(
      pendingInvites.every((inv) => !inv.acceptedAt && !inv.cancelledAt && inv.expiresAt > new Date()),
      '48. getPendingPlatformInvitations returns only active pending invitations'
    );

  } catch (error) {
    console.error('Unhandled test execution error:', error);
    failed++;
  } finally {
    // Cleanup created test records
    await prisma.platformInvitation.deleteMany({
      where: { email: { contains: TEST_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: TEST_PREFIX } },
    });
    console.log('\n🧹 Test cleanup complete.');
  }

  console.log(`\n========================================`);
  console.log(`Platform Users Tests: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
