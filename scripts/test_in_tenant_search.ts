import { prisma } from '../src/lib/db';
import { searchTenantEntities } from '../src/services/search';
import { UserRole } from '@prisma/client';

async function run() {
  console.log('=== Running In-Tenant Search Test Suite ===');

  // 1. Fetch tenant and users
  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE' },
    include: {
      users: true,
      competencies: true,
    },
  });
  if (!tenant || tenant.users.length === 0) {
    throw new Error('Active tenant with users not found');
  }

  const orgAdmin = tenant.users.find((u) => u.role === UserRole.ORGANIZATION_ADMIN) || tenant.users[0];
  const staff = tenant.users.find((u) => u.role === UserRole.STAFF);
  const manager = tenant.users.find((u) => u.role === UserRole.MANAGER);

  // 2. Empty query behavior
  const emptyRes = await searchTenantEntities(tenant.id, orgAdmin.role, '');
  if (emptyRes.totalMatches !== 0 || emptyRes.competencies.length !== 0) {
    throw new Error('Empty query should return 0 results');
  }
  console.log('✔ Short / empty query handled correctly');

  // 3. Search Competencies in tenant
  const comp = tenant.competencies[0];
  if (comp) {
    const compQuery = comp.name.substring(0, 4);
    const compRes = await searchTenantEntities(tenant.id, orgAdmin.role, compQuery);
    const found = compRes.competencies.some((c) => c.id === comp.id);
    if (!found) {
      throw new Error(`Expected to find competency ${comp.name} with query ${compQuery}`);
    }
    console.log(`✔ Found competency "${comp.name}" in tenant search`);
  }

  // 4. Role-bounded People Search
  // Org admin should be able to search users
  const adminPeopleRes = await searchTenantEntities(tenant.id, UserRole.ORGANIZATION_ADMIN, orgAdmin.name.substring(0, 3));
  if (adminPeopleRes.people.length === 0) {
    throw new Error('Org admin should find users in people search');
  }
  console.log(`✔ Org Admin found ${adminPeopleRes.people.length} people matches`);

  // Staff should receive ZERO people results even with matching query
  if (staff) {
    const staffPeopleRes = await searchTenantEntities(tenant.id, UserRole.STAFF, staff.name.substring(0, 3));
    if (staffPeopleRes.people.length !== 0) {
      throw new Error('Staff role must receive 0 people search results');
    }
    console.log('✔ Staff role correctly restricted from searching people');
  }

  // Manager only sees direct reports
  if (manager) {
    const mgrPeopleRes = await searchTenantEntities(
      tenant.id,
      UserRole.MANAGER,
      'a', // generic search
      { actorUserId: manager.id }
    );
    // Every person found must have managerId === manager.id
    for (const p of mgrPeopleRes.people) {
      const dbUser = await prisma.user.findUnique({ where: { id: p.id } });
      if (dbUser?.managerId !== manager.id) {
        throw new Error(`Manager search returned non-report: ${p.title}`);
      }
    }
    console.log(`✔ Manager search strictly scoped to direct reports (${mgrPeopleRes.people.length} reports matched)`);
  }

  // 5. Cross-tenant isolation
  const otherTenant = await prisma.tenant.findFirst({
    where: {
      id: { not: tenant.id },
      status: 'ACTIVE',
    },
  });

  if (otherTenant && comp) {
    const crossRes = await searchTenantEntities(otherTenant.id, UserRole.ORGANIZATION_ADMIN, comp.name);
    const leaked = crossRes.competencies.some((c) => c.id === comp.id);
    if (leaked) {
      throw new Error('Cross-tenant data leakage: Competency found in other tenant');
    }
    console.log('✔ Cross-tenant isolation verified: other tenant cannot see entities');
  }

  console.log('✔ In-Tenant Search tests passed successfully!');
}

run()
  .catch((err) => {
    console.error('❌ In-Tenant Search test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
