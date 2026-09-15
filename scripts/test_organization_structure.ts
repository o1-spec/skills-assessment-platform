import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';
import { UserRole, TenantStatus } from '@prisma/client';
import {
  createDepartment,
  updateDepartment,
  toggleDepartmentActive,
  getDepartmentsForTenant,
  createTeam,
  updateTeam,
  toggleTeamActive,
  addTeamMember,
  removeTeamMember,
  getUserTeamMemberships,
  setUserTeamMemberships,
} from '../src/services/organization-structure';
import {
  parseUserImportCsv,
  validateUserImportRows,
  bulkCreateUserInvitations,
  CsvRowResult,
} from '../src/services/csv-import';
import {
  createTenantUserInvitation,
  acceptTenantInvitation,
} from '../src/services/invitations';

async function runTests() {
  console.log('🧪 Starting Organization Structure & Bulk CSV Import Tests...\n');

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

  // Baseline Acme
  const acme = await prisma.tenant.findUnique({
    where: { slug: 'acme-technologies' },
    include: {
      users: true,
      roleProfiles: true,
    },
  });
  if (!acme) throw new Error('Acme tenant not found');

  // Create an isolated Test Tenant for deep mutating tests
  const testTenant = await prisma.tenant.create({
    data: {
      name: 'Test Org Struct Org',
      slug: `test-org-struct-${Date.now()}`,
      status: TenantStatus.ACTIVE,
      isOnboarded: true,
      seatLimit: 10,
    },
  });

  const testAdmin = await prisma.user.create({
    data: {
      tenantId: testTenant.id,
      name: 'Test Admin',
      email: `test-admin-${Date.now()}@test.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: UserRole.ORGANIZATION_ADMIN,
      isActive: true,
    },
  });

  const testManager = await prisma.user.create({
    data: {
      tenantId: testTenant.id,
      name: 'Test Manager',
      email: `test-mgr-${Date.now()}@test.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: UserRole.MANAGER,
      isActive: true,
    },
  });

  const testStaff = await prisma.user.create({
    data: {
      tenantId: testTenant.id,
      name: 'Test Staff',
      email: `test-staff-${Date.now()}@test.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: UserRole.STAFF,
      isActive: true,
    },
  });

  const testInactiveUser = await prisma.user.create({
    data: {
      tenantId: testTenant.id,
      name: 'Inactive User',
      email: `inactive-${Date.now()}@test.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: UserRole.MANAGER,
      isActive: false,
    },
  });

  const testRoleProfile = await prisma.roleProfile.create({
    data: {
      tenantId: testTenant.id,
      name: 'Test Role Profile',
      status: 'PUBLISHED',
    },
  });

  // Create a Foreign Tenant to verify multi-tenant isolation
  const foreignTenant = await prisma.tenant.create({
    data: {
      name: 'Foreign Org Struct',
      slug: `foreign-org-struct-${Date.now()}`,
      status: TenantStatus.ACTIVE,
      isOnboarded: true,
      seatLimit: 5,
    },
  });

  const foreignManager = await prisma.user.create({
    data: {
      tenantId: foreignTenant.id,
      name: 'Foreign Manager',
      email: `foreign-mgr-${Date.now()}@test.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: UserRole.MANAGER,
      isActive: true,
    },
  });

  const foreignStaff = await prisma.user.create({
    data: {
      tenantId: foreignTenant.id,
      name: 'Foreign Staff',
      email: `foreign-staff-${Date.now()}@test.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: UserRole.STAFF,
      isActive: true,
    },
  });

  try {
    // =========================================================================
    // SECTION 1: DEPARTMENT MANAGEMENT
    // =========================================================================
    console.log('\n--- Section 1: Department Management ---');

    // 1. Create department
    const dept1 = await createDepartment(testTenant.id, {
      name: 'Product Engineering',
      description: 'Engineering and product development',
    });
    assert(dept1.name === 'Product Engineering' && dept1.isActive === true, '1. Create department succeeds with active status');

    // 2. Reject duplicate department name in same tenant
    let dupDeptError = false;
    try {
      await createDepartment(testTenant.id, { name: 'Product Engineering' });
    } catch {
      dupDeptError = true;
    }
    assert(dupDeptError, '2. Create duplicate department name is rejected');

    // 3. Same department name in foreign tenant is allowed
    const foreignDept = await createDepartment(foreignTenant.id, {
      name: 'Product Engineering',
    });
    assert(foreignDept.id !== dept1.id, '3. Same department name in different tenant is allowed (multi-tenant scoped)');

    // 4. Update department
    const updatedDept1 = await updateDepartment(testTenant.id, dept1.id, {
      name: 'Engineering & Tech',
      description: 'Updated description',
    });
    assert(
      updatedDept1.name === 'Engineering & Tech' && updatedDept1.description === 'Updated description',
      '4. Update department name and description succeeds'
    );

    // 5. Toggle department active
    const toggledDept1 = await toggleDepartmentActive(testTenant.id, dept1.id);
    assert(toggledDept1.isActive === false, '5. Toggle department active deactivates department');
    const reactivatedDept1 = await toggleDepartmentActive(testTenant.id, dept1.id);
    assert(reactivatedDept1.isActive === true, '6. Toggle department active reactivates department');

    // 6. getDepartmentsForTenant isolation
    const testDepts = await getDepartmentsForTenant(testTenant.id);
    assert(testDepts.some((d) => d.id === dept1.id) && !testDepts.some((d) => d.id === foreignDept.id), '7. getDepartmentsForTenant isolates by tenant');

    // =========================================================================
    // SECTION 2: TEAM MANAGEMENT
    // =========================================================================
    console.log('\n--- Section 2: Team Management ---');

    // 8. Create team with department and manager
    const team1 = await createTeam(testTenant.id, {
      name: 'Core Platform',
      description: 'Core platform engineering',
      departmentId: dept1.id,
      managerId: testManager.id,
    });
    assert(team1.name === 'Core Platform' && team1.managerId === testManager.id, '8. Create team with department and manager succeeds');

    // 9. Reject team with staff user as manager (must be MANAGER role)
    let nonManagerError = false;
    try {
      await createTeam(testTenant.id, {
        name: 'Invalid Manager Team',
        managerId: testStaff.id,
      });
    } catch {
      nonManagerError = true;
    }
    assert(nonManagerError, '9. Create team with non-manager user is rejected');

    // 10. Reject team with inactive manager
    let inactiveMgrError = false;
    try {
      await createTeam(testTenant.id, {
        name: 'Inactive Manager Team',
        managerId: testInactiveUser.id,
      });
    } catch {
      inactiveMgrError = true;
    }
    assert(inactiveMgrError, '10. Create team with inactive manager is rejected');

    // 11. Reject team with manager from foreign tenant
    let foreignMgrError = false;
    try {
      await createTeam(testTenant.id, {
        name: 'Foreign Manager Team',
        managerId: foreignManager.id,
      });
    } catch {
      foreignMgrError = true;
    }
    assert(foreignMgrError, '11. Create team with foreign tenant manager is rejected');

    // 12. Reject team with department from foreign tenant
    let foreignDeptError = false;
    try {
      await createTeam(testTenant.id, {
        name: 'Foreign Dept Team',
        departmentId: foreignDept.id,
      });
    } catch {
      foreignDeptError = true;
    }
    assert(foreignDeptError, '12. Create team with foreign tenant department is rejected');

    // 13. Reject duplicate team name in same tenant
    let dupTeamError = false;
    try {
      await createTeam(testTenant.id, { name: 'Core Platform' });
    } catch {
      dupTeamError = true;
    }
    assert(dupTeamError, '13. Create duplicate team name in same tenant is rejected');

    // 14. Update team
    const updatedTeam1 = await updateTeam(testTenant.id, team1.id, {
      name: 'Platform Core',
      description: 'Updated platform description',
    });
    assert(updatedTeam1.name === 'Platform Core', '14. Update team succeeds');

    // 15. Toggle team active
    const deactivatedTeam1 = await toggleTeamActive(testTenant.id, team1.id);
    assert(deactivatedTeam1.isActive === false, '15. Toggle team active deactivates team');
    const reactivatedTeam1 = await toggleTeamActive(testTenant.id, team1.id);
    assert(reactivatedTeam1.isActive === true, '16. Toggle team active reactivates team');

    // =========================================================================
    // SECTION 3: TEAM MEMBERSHIPS
    // =========================================================================
    console.log('\n--- Section 3: Team Memberships ---');

    // 17. Add member to team
    const membership1 = await addTeamMember(testTenant.id, team1.id, testStaff.id);
    assert(membership1.teamId === team1.id && membership1.userId === testStaff.id, '17. Add member to team succeeds');

    // 18. Add duplicate member to same team is rejected
    let dupMemberError = false;
    try {
      await addTeamMember(testTenant.id, team1.id, testStaff.id);
    } catch {
      dupMemberError = true;
    }
    assert(dupMemberError, '18. Add duplicate member to same team is rejected');

    // 19. Add member from foreign tenant is rejected
    let foreignMemberError = false;
    try {
      await addTeamMember(testTenant.id, team1.id, foreignStaff.id);
    } catch {
      foreignMemberError = true;
    }
    assert(foreignMemberError, '19. Add member from foreign tenant is rejected');

    // 20. Add inactive user to team is rejected
    let inactiveUserMemberError = false;
    try {
      await addTeamMember(testTenant.id, team1.id, testInactiveUser.id);
    } catch {
      inactiveUserMemberError = true;
    }
    assert(inactiveUserMemberError, '20. Add inactive user to team is rejected');

    // 21. Add member to inactive team is rejected
    await toggleTeamActive(testTenant.id, team1.id); // set inactive
    let addInactiveTeamError = false;
    try {
      await addTeamMember(testTenant.id, team1.id, testManager.id);
    } catch {
      addInactiveTeamError = true;
    }
    assert(addInactiveTeamError, '21. Add member to inactive team is rejected');
    await toggleTeamActive(testTenant.id, team1.id); // restore active

    // 22. Remove team member
    await removeTeamMember(testTenant.id, team1.id, testStaff.id);
    const afterRemoveMemberships = await getUserTeamMemberships(testTenant.id, testStaff.id);
    assert(afterRemoveMemberships.length === 0, '22. Remove team member succeeds');

    // 23. Remove non-member is rejected
    let removeNonMemberError = false;
    try {
      await removeTeamMember(testTenant.id, team1.id, testStaff.id);
    } catch {
      removeNonMemberError = true;
    }
    assert(removeNonMemberError, '23. Remove non-member is rejected');

    // 24. setUserTeamMemberships replaces all memberships atomically
    const team2 = await createTeam(testTenant.id, { name: 'Infrastructure Team' });
    await setUserTeamMemberships(testTenant.id, testStaff.id, [team1.id, team2.id]);
    const staffMemberships = await getUserTeamMemberships(testTenant.id, testStaff.id);
    assert(staffMemberships.length === 2, '24. setUserTeamMemberships assigns multiple teams');

    await setUserTeamMemberships(testTenant.id, testStaff.id, [team2.id]);
    const staffUpdatedMemberships = await getUserTeamMemberships(testTenant.id, testStaff.id);
    assert(
      staffUpdatedMemberships.length === 1 && staffUpdatedMemberships[0].team.id === team2.id,
      '25. setUserTeamMemberships removes unselected teams atomically'
    );

    // 25. setUserTeamMemberships with foreign team is rejected
    let foreignSetTeamError = false;
    const foreignTeam = await createTeam(foreignTenant.id, { name: 'Foreign Team' });
    try {
      await setUserTeamMemberships(testTenant.id, testStaff.id, [foreignTeam.id]);
    } catch {
      foreignSetTeamError = true;
    }
    assert(foreignSetTeamError, '26. setUserTeamMemberships with foreign team is rejected');

    // =========================================================================
    // SECTION 4: CSV PARSING & VALIDATION
    // =========================================================================
    console.log('\n--- Section 4: CSV Parsing & Validation ---');

    // 27. Well-formed CSV parses properly
    const goodCsv = `name,email,role,manager_email,role_profile_name,team_name
John Doe,johndoe@test.com,STAFF,${testManager.email},${testRoleProfile.name},Infrastructure Team
Jane Manager,janemgr@test.com,MANAGER,,,
`;
    const parseResult = parseUserImportCsv(goodCsv);
    assert(parseResult.rows.length === 2 && !parseResult.parseError, '27. parseUserImportCsv parses valid rows with headers');

    // 28. Missing required header is rejected
    const badHeaderCsv = `name,email\nJohn,john@test.com`;
    const badHeaderResult = parseUserImportCsv(badHeaderCsv);
    assert(!!badHeaderResult.parseError, '28. parseUserImportCsv rejects missing required columns');

    // 29. Empty CSV content is rejected
    const emptyCsvResult = parseUserImportCsv('   \n  ');
    assert(!!emptyCsvResult.parseError, '29. parseUserImportCsv rejects empty CSV');

    // 30. Validate valid CSV rows
    const validationResults = await validateUserImportRows(testTenant.id, parseResult.rows);
    assert(
      validationResults.length === 2 &&
        validationResults[0].status === 'VALID' &&
        validationResults[1].status === 'VALID',
      '30. validateUserImportRows returns VALID for all correct rows'
    );
    const validRow0 = validationResults[0] as Extract<CsvRowResult, { status: 'VALID' }>;
    assert(
      validRow0.managerId === testManager.id &&
        validRow0.roleProfileId === testRoleProfile.id &&
        validRow0.teamId === team2.id,
      '31. validateUserImportRows correctly resolves managerId, roleProfileId, and teamId'
    );

    // 32. Validate invalid rows
    const invalidRows = [
      { name: '', email: 'no-name@test.com', role: 'STAFF', _rowNumber: 2 },
      { name: 'Bad Email', email: 'not-an-email', role: 'STAFF', _rowNumber: 3 },
      { name: 'Bad Role', email: 'badrole@test.com', role: 'SUPERUSER', _rowNumber: 4 },
      { name: 'Unknown Mgr', email: 'unknownmgr@test.com', role: 'STAFF', manager_email: 'ghost@test.com', _rowNumber: 5 },
      { name: 'Staff As Mgr', email: 'staffasmgr@test.com', role: 'STAFF', manager_email: testStaff.email, _rowNumber: 6 },
      { name: 'Foreign Mgr', email: 'foreignmgr@test.com', role: 'STAFF', manager_email: foreignManager.email, _rowNumber: 7 },
      { name: 'Unknown Role Profile', email: 'unknownrp@test.com', role: 'STAFF', role_profile_name: 'Nonexistent Profile', _rowNumber: 8 },
      { name: 'Unknown Team', email: 'unknownteam@test.com', role: 'STAFF', team_name: 'Nonexistent Team', _rowNumber: 9 },
      { name: 'Existing User Email', email: testStaff.email, role: 'STAFF', _rowNumber: 10 },
      { name: 'Inactive User Email', email: testInactiveUser.email, role: 'STAFF', _rowNumber: 11 },
    ];
    const invalidResults = await validateUserImportRows(testTenant.id, invalidRows);
    assert(
      invalidResults.every((r) => r.status === 'ERROR'),
      '32. validateUserImportRows rejects all invalid row conditions with status ERROR'
    );

    // 33. Duplicate email within same CSV batch is flagged
    const dupBatchRows = [
      { name: 'First Person', email: 'batchdup@test.com', role: 'STAFF', _rowNumber: 2 },
      { name: 'Second Person', email: 'batchdup@test.com', role: 'STAFF', _rowNumber: 3 },
    ];
    const dupBatchResults = await validateUserImportRows(testTenant.id, dupBatchRows);
    assert(
      dupBatchResults[0].status === 'VALID' && dupBatchResults[1].status === 'ERROR',
      '33. Duplicate email within the same CSV batch marks subsequent rows as ERROR'
    );

    // =========================================================================
    // SECTION 5: BULK IMPORT ATOMIC EXECUTION
    // =========================================================================
    console.log('\n--- Section 5: Bulk Import Atomic Execution ---');

    // 34. Bulk import valid rows creates invitations and team assignments
    const validBatch = [
      {
        rowNumber: 2,
        status: 'VALID' as const,
        name: 'Bulk User One',
        email: `bulk1-${Date.now()}@test.com`,
        role: UserRole.STAFF,
        managerId: testManager.id,
        roleProfileId: testRoleProfile.id,
        teamId: team2.id,
        resolvedManagerName: testManager.name,
        resolvedRoleProfileName: testRoleProfile.name,
        resolvedTeamName: team2.name,
      },
      {
        rowNumber: 3,
        status: 'VALID' as const,
        name: 'Bulk User Two',
        email: `bulk2-${Date.now()}@test.com`,
        role: UserRole.MANAGER,
        managerId: null,
        roleProfileId: null,
        teamId: team2.id,
        resolvedManagerName: null,
        resolvedRoleProfileName: null,
        resolvedTeamName: team2.name,
      },
    ];

    const bulkCreated = await bulkCreateUserInvitations(testTenant.id, testAdmin.id, validBatch);
    assert(bulkCreated.length === 2, '34. bulkCreateUserInvitations creates all invitations');

    // Verify team associations stored in TenantInvitationTeam
    const inv1 = await prisma.tenantInvitation.findUnique({
      where: { id: bulkCreated[0].id },
      include: { teams: true },
    });
    assert(
      inv1 !== null && inv1.teams.length === 1 && inv1.teams[0].teamId === team2.id,
      '35. bulkCreateUserInvitations persists TenantInvitationTeam records'
    );

    // 36. Live pending invitation is detected and flagged by validator
    const pendingConflictCheck = await validateUserImportRows(testTenant.id, [
      { name: 'Pending Clash', email: bulkCreated[0].email, role: 'STAFF', _rowNumber: 2 },
    ]);
    assert(
      pendingConflictCheck[0].status === 'ERROR',
      '36. CSV validation rejects email with live pending invitation'
    );

    // =========================================================================
    // SECTION 6: INVITATION ACCEPTANCE & TEAM MEMBERSHIP ASSIGNMENT
    // =========================================================================
    console.log('\n--- Section 6: Invitation Acceptance & Team Assignment ---');

    // 37. Accept invitation creates user and auto-assigns stored team memberships
    const acceptResult = await acceptTenantInvitation({
      token: bulkCreated[0].rawToken,
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    });
    assert(
      acceptResult.user.email === bulkCreated[0].email,
      '37. acceptTenantInvitation successfully creates active user account'
    );

    const createdUserMemberships = await getUserTeamMemberships(testTenant.id, acceptResult.user.id);
    assert(
      createdUserMemberships.length === 1 && createdUserMemberships[0].team.id === team2.id,
      '38. acceptTenantInvitation creates TeamMembership records from stored invitation teams'
    );

    // 39. Single user invitation with teamIds
    const singleInv = await createTenantUserInvitation(testTenant.id, testAdmin.id, {
      name: 'Single Invite With Team',
      email: `single-invite-${Date.now()}@test.com`,
      role: UserRole.STAFF,
      teamIds: [team2.id],
    });
    assert(!!singleInv.teamIds?.includes(team2.id), '39. createTenantUserInvitation accepts and records teamIds');

    // 40. Reject single invitation with inactive team
    await toggleTeamActive(testTenant.id, team2.id); // set inactive
    let inactiveTeamInviteError = false;
    try {
      await createTenantUserInvitation(testTenant.id, testAdmin.id, {
        name: 'Fail Team Invite',
        email: `fail-team-${Date.now()}@test.com`,
        role: UserRole.STAFF,
        teamIds: [team2.id],
      });
    } catch {
      inactiveTeamInviteError = true;
    }
    assert(inactiveTeamInviteError, '40. createTenantUserInvitation rejects inactive team');
    await toggleTeamActive(testTenant.id, team2.id); // restore active

    // =========================================================================
    // SECTION 7: CASCADE & CLEANUP INTEGRITY
    // =========================================================================
    console.log('\n--- Section 7: Cascade & Data Integrity ---');

    // 41. Deleting a team cascades and removes its TeamMemberships
    const teamToDelete = await createTeam(testTenant.id, { name: 'Temporary Team To Delete' });
    await addTeamMember(testTenant.id, teamToDelete.id, testStaff.id);
    await prisma.team.delete({ where: { id: teamToDelete.id } });
    const membershipsAfterTeamDelete = await prisma.teamMembership.findMany({
      where: { teamId: teamToDelete.id },
    });
    assert(membershipsAfterTeamDelete.length === 0, '41. Deleting team cascades to clean TeamMembership records');

    // 42. Verify Acme Technologies baseline is completely untouched
    const acmeCompetencies = await prisma.competency.count({
      where: { tenantId: acme.id, isActive: true },
    });
    assert(acmeCompetencies === 7, '42. Acme Technologies active competencies count remains exactly 7');

    const acmeUsers = await prisma.user.findMany({ where: { tenantId: acme.id } });
    assert(acmeUsers.length === 3, '43. Acme Technologies users count remains exactly 3');

    const acmeEngineeringDept = await prisma.department.findUnique({
      where: { tenantId_name: { tenantId: acme.id, name: 'Engineering' } },
    });
    assert(acmeEngineeringDept !== null, '44. Acme seeded Engineering department is intact');

    const acmeBackendTeam = await prisma.team.findUnique({
      where: { tenantId_name: { tenantId: acme.id, name: 'Backend Engineering' } },
      include: { memberships: true },
    });
    assert(
      acmeBackendTeam !== null && acmeBackendTeam.memberships.length === 2,
      '45. Acme seeded Backend Engineering team is intact with 2 members (Michael + Sarah)'
    );
  } finally {
    // Cleanup test and foreign tenants
    console.log('\n--- Cleaning Up Test Artifacts ---');
    await prisma.teamMembership.deleteMany({
      where: { team: { tenantId: { in: [testTenant.id, foreignTenant.id] } } },
    });
    await prisma.tenantInvitationTeam.deleteMany({
      where: { invitation: { tenantId: { in: [testTenant.id, foreignTenant.id] } } },
    });
    await prisma.tenantInvitation.deleteMany({
      where: { tenantId: { in: [testTenant.id, foreignTenant.id] } },
    });
    await prisma.team.deleteMany({
      where: { tenantId: { in: [testTenant.id, foreignTenant.id] } },
    });
    await prisma.department.deleteMany({
      where: { tenantId: { in: [testTenant.id, foreignTenant.id] } },
    });
    await prisma.roleProfile.deleteMany({
      where: { tenantId: { in: [testTenant.id, foreignTenant.id] } },
    });
    await prisma.user.deleteMany({
      where: { tenantId: { in: [testTenant.id, foreignTenant.id] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenant.id, foreignTenant.id] } },
    });
    console.log('✓ Cleaned up test and foreign tenant records');
  }

  console.log(`\n========================================`);
  console.log(`Tests Completed: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
