import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';
import { UserRole, TenantStatus } from '@prisma/client';
import {
  getUsersForTenant,
  getUserByIdForTenant,
  cancelTenantInvitation,
  updateTenantUser,
  deactivateTenantUser,
  reactivateTenantUser,
  getTenantSeatUsage,
} from '../src/services/users';
import {
  createTenantUserInvitation,
  acceptTenantInvitation,
} from '../src/services/invitations';
import { updateTenantPlanAndSeatLimit } from '../src/services/tenants';

async function runTests() {
  console.log('🧪 Starting Organization User Management & Role Assignment Tests...\n');

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

  // Setup references
  const acme = await prisma.tenant.findUnique({
    where: { slug: 'acme-technologies' },
    include: {
      roleProfiles: true,
      users: true,
    },
  });

  if (!acme) throw new Error('Acme tenant not found');

  const olivia = acme.users.find((u) => u.email === 'admin@acme.test')!;
  const michael = acme.users.find((u) => u.email === 'manager@acme.test')!;
  const sarah = acme.users.find((u) => u.email === 'staff@acme.test')!;
  const backendRole = acme.roleProfiles.find((r) => r.name === 'Backend Engineer')!;

  // Create a foreign tenant for isolation testing
  const foreignTenant = await prisma.tenant.create({
    data: {
      name: 'Foreign Org',
      slug: `foreign-org-${Date.now()}`,
      status: TenantStatus.ACTIVE,
      isOnboarded: true,
      seatLimit: 10,
    },
  });

  const foreignRole = await prisma.roleProfile.create({
    data: {
      tenantId: foreignTenant.id,
      name: 'Foreign Role',
      status: 'PUBLISHED',
    },
  });

  const foreignUser = await prisma.user.create({
    data: {
      tenantId: foreignTenant.id,
      name: 'Foreign User',
      email: `foreign-${Date.now()}@test.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: UserRole.STAFF,
      isActive: true,
    },
  });

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: User Directory & Seat Usage
    // ----------------------------------------------------
    console.log('--- TEST GROUP 1: User Directory & Seat Usage ---');

    const acmeUsers = await getUsersForTenant(acme.id);
    const emails = acmeUsers.map((u) => u.email);

    assert(
      emails.includes('admin@acme.test') && emails.includes('manager@acme.test') && emails.includes('staff@acme.test'),
      '1. Acme Org Admin sees Olivia Admin, Michael Manager, and Sarah Staff'
    );

    assert(!emails.includes(foreignUser.email), '2. Foreign tenant users excluded from directory');

    const seatUsage = await getTenantSeatUsage(acme.id);
    assert(
      seatUsage.activeUsers === 3 && seatUsage.seatLimit === 50,
      `3. Seat usage correctly shows 3 / 50 (active: ${seatUsage.activeUsers}, limit: ${seatUsage.seatLimit})`
    );

    // ----------------------------------------------------
    // TEST GROUP 2: Invitations & Validation
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Invitations & Validation ---');

    // 4. Invite new STAFF with Backend Engineer role and Michael as manager
    const staffInvite = await createTenantUserInvitation(acme.id, olivia.id, {
      name: 'David Developer',
      email: `david-${Date.now()}@acme.test`,
      role: UserRole.STAFF,
      roleProfileId: backendRole.id,
      managerId: michael.id,
    });
    assert(!!staffInvite && staffInvite.role === UserRole.STAFF, '4. Invite new STAFF succeeds');

    // 5. Invite new MANAGER
    const managerInvite = await createTenantUserInvitation(acme.id, olivia.id, {
      name: 'Mary Manager',
      email: `mary-${Date.now()}@acme.test`,
      role: UserRole.MANAGER,
    });
    assert(!!managerInvite && managerInvite.role === UserRole.MANAGER, '5. Invite new MANAGER succeeds');

    // 6. Attempt PLATFORM_ADMIN invite
    let platformAdminInviteRejected = false;
    try {
      await createTenantUserInvitation(acme.id, olivia.id, {
        name: 'Hacker Admin',
        email: `hacker-${Date.now()}@acme.test`,
        role: UserRole.PLATFORM_ADMIN,
      });
    } catch (err: unknown) {
      platformAdminInviteRejected = (err as Error).message.includes('Invalid role');
    }
    assert(platformAdminInviteRejected, '6. Attempt PLATFORM_ADMIN invite rejected');

    // 7. Foreign RoleProfile assignment
    let foreignRoleInviteRejected = false;
    try {
      await createTenantUserInvitation(acme.id, olivia.id, {
        name: 'Invalid Role Staff',
        email: `invalid-role-${Date.now()}@acme.test`,
        role: UserRole.STAFF,
        roleProfileId: foreignRole.id,
      });
    } catch (err: unknown) {
      foreignRoleInviteRejected = (err as Error).message.includes('does not belong to this organization');
    }
    assert(foreignRoleInviteRejected, '7. Foreign RoleProfile assignment rejected');

    // 8. Foreign manager assignment
    let foreignManagerInviteRejected = false;
    try {
      await createTenantUserInvitation(acme.id, olivia.id, {
        name: 'Invalid Mgr Staff',
        email: `invalid-mgr-${Date.now()}@acme.test`,
        role: UserRole.STAFF,
        managerId: foreignUser.id,
      });
    } catch (err: unknown) {
      foreignManagerInviteRejected = (err as Error).message.includes('does not belong to this organization');
    }
    assert(foreignManagerInviteRejected, '8. Foreign manager assignment rejected');

    // 9. STAFF selected as manager
    let staffAsManagerRejected = false;
    try {
      await createTenantUserInvitation(acme.id, olivia.id, {
        name: 'Invalid Staff Mgr',
        email: `invalid-staff-mgr-${Date.now()}@acme.test`,
        role: UserRole.STAFF,
        managerId: sarah.id,
      });
    } catch (err: unknown) {
      staffAsManagerRejected = (err as Error).message.includes('must have the Manager application role');
    }
    assert(staffAsManagerRejected, '9. STAFF selected as manager rejected');

    // 10. Pending invitation does not consume seat
    const seatUsageAfterInvites = await getTenantSeatUsage(acme.id);
    assert(
      seatUsageAfterInvites.activeUsers === 3,
      `10. Pending invitation does not consume seat (still ${seatUsageAfterInvites.activeUsers})`
    );

    // ----------------------------------------------------
    // TEST GROUP 3: Invitation Acceptance Flow
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Invitation Acceptance Flow ---');

    // 11. Staff accepts invitation
    const acceptRes = await acceptTenantInvitation({
      token: staffInvite.rawToken,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
    });

    assert(!!acceptRes.user, '11. Staff accepts invitation: User created successfully');
    assert(acceptRes.user.role === UserRole.STAFF, '12. Role derived from invitation (STAFF)');
    assert(acceptRes.tenant.id === acme.id, '13. Tenant derived from invitation (Acme)');

    const createdStaffUser = await prisma.user.findUnique({
      where: { id: acceptRes.user.id },
      include: { roleProfile: true, manager: true },
    });

    assert(createdStaffUser?.roleProfileId === backendRole.id, '14. RoleProfile derived from invitation (Backend Engineer)');
    assert(createdStaffUser?.managerId === michael.id, '15. Manager derived from invitation (Michael Manager)');

    const passwordMatch = await bcrypt.compare('SecurePassword123!', createdStaffUser!.passwordHash);
    assert(passwordMatch, '16. Password hash valid and verifiable');

    // 17. Replay rejected
    let replayRejected = false;
    try {
      await acceptTenantInvitation({
        token: staffInvite.rawToken,
        password: 'AnotherPassword123!',
        confirmPassword: 'AnotherPassword123!',
      });
    } catch (err: unknown) {
      replayRejected = (err as Error).message.includes('already been accepted');
    }
    assert(replayRejected, '17. Invitation cannot be reused');

    // 18. Accepted user consumes seat
    const seatUsageAfterAccept = await getTenantSeatUsage(acme.id);
    assert(
      seatUsageAfterAccept.activeUsers === 4,
      `18. Accepted user consumes seat (now ${seatUsageAfterAccept.activeUsers} / 50)`
    );

    // ----------------------------------------------------
    // TEST GROUP 4: Direct Role Profile Assignment & Updating
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 4: Direct Role Profile Assignment & Updating ---');

    // 19. Assign Backend Engineer to Sarah Staff
    const updatedSarah = await updateTenantUser(acme.id, olivia.id, sarah.id, {
      roleProfileId: backendRole.id,
    });
    assert(updatedSarah.roleProfileId === backendRole.id, '19. Assign Backend Engineer to Sarah Staff succeeds');

    // 20. Verify in database
    const sarahInDb = await prisma.user.findUnique({ where: { id: sarah.id } });
    assert(sarahInDb?.roleProfileId === backendRole.id, '20. Sarah User.roleProfileId points to Acme Backend Engineer');

    // 21. Foreign tenant RoleProfile assignment rejected
    let foreignRoleUpdateRejected = false;
    try {
      await updateTenantUser(acme.id, olivia.id, sarah.id, {
        roleProfileId: foreignRole.id,
      });
    } catch (err: unknown) {
      foreignRoleUpdateRejected = (err as Error).message.includes('must be a published role profile in this organization');
    }
    assert(foreignRoleUpdateRejected, '21. Foreign tenant RoleProfile update rejected');

    // ----------------------------------------------------
    // TEST GROUP 5: Deactivation & Reactivation
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 5: Deactivation & Reactivation ---');

    // 22. Deactivate David Developer
    const deactivatedDavid = await deactivateTenantUser(acme.id, olivia.id, createdStaffUser!.id);
    assert(
      deactivatedDavid.isActive === false && !!deactivatedDavid.deactivatedAt,
      '22. Deactivate staff: isActive false, deactivatedAt populated'
    );

    // 23. Seat usage decreases
    const seatUsageAfterDeactivate = await getTenantSeatUsage(acme.id);
    assert(
      seatUsageAfterDeactivate.activeUsers === 3,
      `23. Seat usage decreases upon deactivation (back to ${seatUsageAfterDeactivate.activeUsers} / 50)`
    );

    // 24. Reactivate David Developer
    const reactivatedDavid = await reactivateTenantUser(acme.id, createdStaffUser!.id);
    assert(
      reactivatedDavid.isActive === true && reactivatedDavid.deactivatedAt === null,
      '24. Reactivate: seat availability checked, isActive true, deactivatedAt null'
    );

    // ----------------------------------------------------
    // TEST GROUP 6: Manager Safety Rules
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 6: Manager Safety Rules ---');

    // Michael has direct reports (Sarah Staff is active direct report)
    // 25. Manager with active direct report cannot be deactivated
    let deactivateManagerWithReportsRejected = false;
    try {
      await deactivateTenantUser(acme.id, olivia.id, michael.id);
    } catch (err: unknown) {
      deactivateManagerWithReportsRejected = (err as Error).message.includes('active direct report');
    }
    assert(deactivateManagerWithReportsRejected, '25. Manager with active direct report cannot be deactivated');

    // 26. Manager with direct reports cannot be demoted to STAFF
    let demoteManagerWithReportsRejected = false;
    try {
      await updateTenantUser(acme.id, olivia.id, michael.id, {
        role: UserRole.STAFF,
      });
    } catch (err: unknown) {
      demoteManagerWithReportsRejected = (err as Error).message.includes('active direct report');
    }
    assert(demoteManagerWithReportsRejected, '26. Manager with direct reports cannot be changed to STAFF');

    // ----------------------------------------------------
    // TEST GROUP 7: Self-Protection & Tenant Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 7: Self-Protection & Tenant Isolation ---');

    // 27. Org Admin cannot deactivate themselves
    let selfDeactivateRejected = false;
    try {
      await deactivateTenantUser(acme.id, olivia.id, olivia.id);
    } catch (err: unknown) {
      selfDeactivateRejected = (err as Error).message.includes('cannot deactivate their own account');
    }
    assert(selfDeactivateRejected, '27. Org Admin cannot deactivate themselves');

    // 28. Org Admin cannot demote themselves
    let selfDemoteRejected = false;
    try {
      await updateTenantUser(acme.id, olivia.id, olivia.id, {
        role: UserRole.STAFF,
      });
    } catch (err: unknown) {
      selfDemoteRejected = (err as Error).message.includes('cannot change or demote their own');
    }
    assert(selfDemoteRejected, '28. Org Admin cannot demote themselves');

    // 29. Org Admin cannot read foreign user by ID
    const foreignRead = await getUserByIdForTenant(acme.id, foreignUser.id);
    assert(foreignRead === null, '29. Org Admin cannot read foreign user by ID');

    // 30. Org Admin cannot mutate foreign user by ID
    let foreignMutateRejected = false;
    try {
      await updateTenantUser(acme.id, olivia.id, foreignUser.id, {
        name: 'Hacked Foreign User',
      });
    } catch (err: unknown) {
      foreignMutateRejected = (err as Error).message.includes('User not found in this organization');
    }
    assert(foreignMutateRejected, '30. Org Admin cannot mutate foreign user by ID');

    // ----------------------------------------------------
    // TEST GROUP 8: Seat Limit Edge Cases
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 8: Seat Limit Enforcement ---');

    // Create a mini test tenant with seatLimit = 1
    const tightTenant = await prisma.tenant.create({
      data: {
        name: 'Tight Seats Org',
        slug: `tight-seats-${Date.now()}`,
        status: TenantStatus.ACTIVE,
        isOnboarded: true,
        seatLimit: 1,
      },
    });

    const tightAdminInvite = await createTenantUserInvitation(tightTenant.id, olivia.id, {
      name: 'Tight Admin',
      email: `tight-admin-${Date.now()}@test.com`,
      role: UserRole.ORGANIZATION_ADMIN,
    });

    // Accept tight admin -> consumes 1 of 1 seat
    const tightAdminAcc = await acceptTenantInvitation({
      token: tightAdminInvite.rawToken,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    // Create second invitation -> succeeds to create invite
    const tightStaffInvite = await createTenantUserInvitation(tightTenant.id, tightAdminAcc.user.id, {
      name: 'Tight Staff',
      email: `tight-staff-${Date.now()}@test.com`,
      role: UserRole.STAFF,
    });

    // 31. Attempt acceptance when seats are full -> rejected
    let seatFullRejected = false;
    try {
      await acceptTenantInvitation({
        token: tightStaffInvite.rawToken,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    } catch (err: unknown) {
      seatFullRejected = (err as Error).message.includes('seat limit reached');
    }
    assert(seatFullRejected, '31. Full tenant rejects invitation acceptance at acceptance time');

    // 32. Deactivate tight admin -> acceptance now succeeds
    await deactivateTenantUser(tightTenant.id, 'SYSTEM_BYPASS', tightAdminAcc.user.id);
    const tightStaffAcc = await acceptTenantInvitation({
      token: tightStaffInvite.rawToken,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    assert(!!tightStaffAcc.user, '32. After deactivating one user, invitation acceptance succeeds');

    // 33. Attempt to set Acme seat limit below active user count
    const currentActiveAcmeCount = await prisma.user.count({ where: { tenantId: acme.id, isActive: true } });
    let seatReductionBelowCountRejected = false;
    try {
      const plan = await prisma.subscriptionPlan.findFirst();
      await updateTenantPlanAndSeatLimit(acme.id, {
        planId: plan!.id,
        seatLimit: currentActiveAcmeCount - 1,
      });
    } catch (err: unknown) {
      seatReductionBelowCountRejected = (err as Error).message.includes('Cannot set seat limit to');
    }
    assert(
      seatReductionBelowCountRejected,
      `33. Attempt to set seat limit below active user count (${currentActiveAcmeCount - 1} < ${currentActiveAcmeCount}) rejected`
    );

    // ----------------------------------------------------
    // TEARDOWN: Clean temporary test objects
    // ----------------------------------------------------
    console.log('\n--- TEARDOWN: Cleaning Temporary Test Records ---');
    // Clean tightTenant and all its users/invitations
    await prisma.tenant.delete({ where: { id: tightTenant.id } });
    await prisma.tenant.delete({ where: { id: foreignTenant.id } });
    // Cancel and remove test invitations created on Acme
    await cancelTenantInvitation(acme.id, managerInvite.id);
    await prisma.tenantInvitation.deleteMany({
      where: {
        tenantId: acme.id,
        id: { in: [staffInvite.id, managerInvite.id] },
      },
    });
    // Delete created David Developer user
    await prisma.user.delete({ where: { id: createdStaffUser!.id } });
    console.log('✓ Temporary test tenants, test users, and test invitations cleaned.');

    // ----------------------------------------------------
    // TEST GROUP 9: Acme Baseline & Assessment Regression Check
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 9: Acme Regression Check ---');

    const acmeTenant = await prisma.tenant.findUnique({
      where: { slug: 'acme-technologies' },
      include: {
        frameworkAdoptions: {
          include: { frameworkVersion: true },
        },
        competencies: {
          where: { isActive: true },
        },
        roleProfiles: {
          include: { requirements: true },
        },
        campaigns: {
          include: {
            competencies: true,
            frameworkVersion: true,
            assessments: {
              include: { items: true },
            },
          },
        },
      },
    });

    const activeAdoption = acmeTenant?.frameworkAdoptions.find((a) => a.isActive);
    assert(
      activeAdoption?.frameworkVersion.version === '1.0',
      '34. Acme active framework adoption remains Framework 1.0'
    );

    assert(
      acmeTenant?.competencies.length === 7,
      `35. Acme has exactly 7 operational competencies (found ${acmeTenant?.competencies.length})`
    );

    const acmeBackendRole = acmeTenant?.roleProfiles.find((r) => r.name === 'Backend Engineer');
    assert(
      acmeBackendRole?.requirements.length === 7,
      `36. Backend Engineer has 7 RoleRequirements (found ${acmeBackendRole?.requirements.length})`
    );

    const q3Campaign = acmeTenant?.campaigns.find((c) => c.name === 'Q3 Engineering Skills Assessment');
    assert(
      q3Campaign?.competencies.length === 7,
      `37. Q3 campaign has exactly 7 competencies bound to Framework 1.0 (found ${q3Campaign?.competencies.length})`
    );

    const sarahAssessment = q3Campaign?.assessments[0];
    assert(
      sarahAssessment?.status === 'NOT_STARTED',
      `38. Sarah assessment status is NOT_STARTED with 7 blank items (status: ${sarahAssessment?.status}, items: ${sarahAssessment?.items.length})`
    );

    console.log(`\n========================================`);
    console.log(`TOTAL TESTS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
