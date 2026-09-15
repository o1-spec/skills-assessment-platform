import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateTeamInput,
  UpdateTeamInput,
} from '@/lib/validation/organization-structure';

// -------------------------------------------------------
// DEPARTMENT
// -------------------------------------------------------

export async function getDepartmentsForTenant(tenantId: string) {
  return prisma.department.findMany({
    where: { tenantId },
    include: {
      teams: {
        where: { isActive: true },
        select: { id: true, name: true, managerId: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getDepartmentByIdForTenant(tenantId: string, departmentId: string) {
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      teams: {
        include: {
          manager: { select: { id: true, name: true, email: true } },
          memberships: {
            include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!dept || dept.tenantId !== tenantId) return null;
  return dept;
}

export async function createDepartment(tenantId: string, input: CreateDepartmentInput) {
  const existing = await prisma.department.findUnique({
    where: { tenantId_name: { tenantId, name: input.name } },
  });
  if (existing) throw new Error(`A department named "${input.name}" already exists.`);

  return prisma.department.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description || null,
      isActive: true,
    },
  });
}

export async function updateDepartment(
  tenantId: string,
  departmentId: string,
  input: UpdateDepartmentInput
) {
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept || dept.tenantId !== tenantId) throw new Error('Department not found.');

  if (input.name && input.name !== dept.name) {
    const conflict = await prisma.department.findUnique({
      where: { tenantId_name: { tenantId, name: input.name } },
    });
    if (conflict) throw new Error(`A department named "${input.name}" already exists.`);
  }

  return prisma.department.update({
    where: { id: departmentId },
    data: {
      name: input.name ?? undefined,
      description: input.description !== undefined ? input.description : undefined,
    },
  });
}

export async function toggleDepartmentActive(tenantId: string, departmentId: string) {
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept || dept.tenantId !== tenantId) throw new Error('Department not found.');
  return prisma.department.update({
    where: { id: departmentId },
    data: { isActive: !dept.isActive },
  });
}

// -------------------------------------------------------
// TEAM
// -------------------------------------------------------

export async function getTeamsForTenant(tenantId: string) {
  return prisma.team.findMany({
    where: { tenantId },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
      memberships: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getTeamByIdForTenant(tenantId: string, teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
      memberships: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        },
      },
    },
  });
  if (!team || team.tenantId !== tenantId) return null;
  return team;
}

export async function createTeam(tenantId: string, input: CreateTeamInput) {
  const existing = await prisma.team.findUnique({
    where: { tenantId_name: { tenantId, name: input.name } },
  });
  if (existing) throw new Error(`A team named "${input.name}" already exists.`);

  // Validate department belongs to tenant
  if (input.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!dept || dept.tenantId !== tenantId) {
      throw new Error('Selected department does not belong to this organization.');
    }
    if (!dept.isActive) throw new Error('Selected department is inactive.');
  }

  // Validate manager belongs to tenant and is a MANAGER
  if (input.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: input.managerId } });
    if (!manager || manager.tenantId !== tenantId) {
      throw new Error('Selected manager does not belong to this organization.');
    }
    if (!manager.isActive) throw new Error('Selected manager is inactive.');
    if (manager.role !== UserRole.MANAGER) {
      throw new Error('Team manager must have the Manager application role.');
    }
  }

  return prisma.team.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description || null,
      departmentId: input.departmentId || null,
      managerId: input.managerId || null,
      isActive: true,
    },
  });
}

export async function updateTeam(tenantId: string, teamId: string, input: UpdateTeamInput) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.tenantId !== tenantId) throw new Error('Team not found.');

  if (input.name && input.name !== team.name) {
    const conflict = await prisma.team.findUnique({
      where: { tenantId_name: { tenantId, name: input.name } },
    });
    if (conflict) throw new Error(`A team named "${input.name}" already exists.`);
  }

  if (input.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!dept || dept.tenantId !== tenantId) {
      throw new Error('Selected department does not belong to this organization.');
    }
  }

  if (input.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: input.managerId } });
    if (!manager || manager.tenantId !== tenantId) {
      throw new Error('Selected manager does not belong to this organization.');
    }
    if (!manager.isActive) throw new Error('Selected manager is inactive.');
    if (manager.role !== UserRole.MANAGER) {
      throw new Error('Team manager must have the Manager application role.');
    }
  }

  return prisma.team.update({
    where: { id: teamId },
    data: {
      name: input.name ?? undefined,
      description: input.description !== undefined ? input.description : undefined,
      departmentId: input.departmentId !== undefined ? input.departmentId : undefined,
      managerId: input.managerId !== undefined ? input.managerId : undefined,
    },
  });
}

export async function toggleTeamActive(tenantId: string, teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.tenantId !== tenantId) throw new Error('Team not found.');
  return prisma.team.update({
    where: { id: teamId },
    data: { isActive: !team.isActive },
  });
}

// -------------------------------------------------------
// MEMBERSHIPS
// -------------------------------------------------------

export async function addTeamMember(tenantId: string, teamId: string, userId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.tenantId !== tenantId) throw new Error('Team not found.');
  if (!team.isActive) throw new Error('Cannot add members to an inactive team.');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.tenantId !== tenantId) throw new Error('User does not belong to this organization.');
  if (!user.isActive) throw new Error('Cannot add inactive user to a team.');

  const existing = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (existing) throw new Error('User is already a member of this team.');

  return prisma.teamMembership.create({ data: { teamId, userId } });
}

export async function removeTeamMember(tenantId: string, teamId: string, userId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.tenantId !== tenantId) throw new Error('Team not found.');

  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!membership) throw new Error('User is not a member of this team.');

  return prisma.teamMembership.delete({ where: { teamId_userId: { teamId, userId } } });
}

export async function getUserTeamMemberships(tenantId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.tenantId !== tenantId) throw new Error('User does not belong to this organization.');

  return prisma.teamMembership.findMany({
    where: { userId, team: { tenantId } },
    include: {
      team: {
        select: { id: true, name: true, departmentId: true, isActive: true },
      },
    },
    orderBy: { team: { name: 'asc' } },
  });
}

/**
 * Replaces all team memberships for a user in one transaction.
 * Adds/removes as needed. Validates each teamId against the tenant.
 */
export async function setUserTeamMemberships(
  tenantId: string,
  userId: string,
  teamIds: string[]
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.tenantId !== tenantId) throw new Error('User does not belong to this organization.');

  // Validate all requested teams
  for (const teamId of teamIds) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.tenantId !== tenantId) {
      throw new Error(`Team "${teamId}" does not belong to this organization.`);
    }
    if (!team.isActive) {
      throw new Error(`Team "${team.name}" is inactive and cannot receive new members.`);
    }
  }

  await prisma.$transaction(async (tx) => {
    // Remove all current memberships for this user's teams in this tenant
    await tx.teamMembership.deleteMany({
      where: { userId, team: { tenantId } },
    });

    // Add the new set
    if (teamIds.length > 0) {
      await tx.teamMembership.createMany({
        data: teamIds.map((teamId) => ({ teamId, userId })),
        skipDuplicates: true,
      });
    }
  });
}
