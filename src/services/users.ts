import { prisma } from '@/lib/db';
import { User, UserRole, RoleProfileStatus, TenantInvitation } from '@prisma/client';
import { assertTenantHasAvailableSeat } from './tenants';

export type TenantUserWithRelations = User & {
  manager: {
    id: string;
    name: string;
    email: string;
  } | null;
  roleProfile: {
    id: string;
    name: string;
    status: RoleProfileStatus;
  } | null;
  _count: {
    directReports: number;
    assessments: number;
  };
};

export type PendingInvitationWithRelations = TenantInvitation & {
  roleProfile: {
    id: string;
    name: string;
  } | null;
  manager: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
};

/**
 * Retrieves all users in a tenant with their manager, role profile, and report counts.
 */
export async function getUsersForTenant(tenantId: string): Promise<TenantUserWithRelations[]> {
  if (!tenantId) return [];

  return prisma.user.findMany({
    where: {
      tenantId,
    },
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      roleProfile: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      _count: {
        select: {
          directReports: true,
          assessments: true,
        },
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { name: 'asc' },
    ],
  });
}

/**
 * Retrieves a single user belonging to a specific tenant.
 */
export async function getUserByIdForTenant(
  tenantId: string,
  userId: string
): Promise<TenantUserWithRelations | null> {
  if (!tenantId || !userId) return null;

  return prisma.user.findFirst({
    where: {
      id: userId,
      tenantId,
    },
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      roleProfile: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      _count: {
        select: {
          directReports: true,
          assessments: true,
        },
      },
    },
  });
}

/**
 * Retrieves all active managers for a tenant (used for manager select dropdowns).
 */
export async function getManagersForTenant(
  tenantId: string,
  excludeUserId?: string
) {
  if (!tenantId) return [];

  return prisma.user.findMany({
    where: {
      tenantId,
      role: UserRole.MANAGER,
      isActive: true,
      id: excludeUserId ? { not: excludeUserId } : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Retrieves published role profiles available for assignment in this tenant.
 */
export async function getPublishedRoleProfilesForUserAssignment(tenantId: string) {
  if (!tenantId) return [];

  return prisma.roleProfile.findMany({
    where: {
      tenantId,
      status: RoleProfileStatus.PUBLISHED,
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Retrieves pending invitations for a tenant (unaccepted, unexpired, uncancelled).
 */
export async function getPendingInvitationsForTenant(
  tenantId: string
): Promise<PendingInvitationWithRelations[]> {
  if (!tenantId) return [];

  return prisma.tenantInvitation.findMany({
    where: {
      tenantId,
      acceptedAt: null,
      cancelledAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      roleProfile: {
        select: {
          id: true,
          name: true,
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Cancels a pending invitation for a tenant without deleting historical audit.
 */
export async function cancelTenantInvitation(
  tenantId: string,
  invitationId: string
): Promise<TenantInvitation> {
  const invitation = await prisma.tenantInvitation.findFirst({
    where: {
      id: invitationId,
      tenantId,
    },
  });

  if (!invitation) {
    throw new Error('Invitation not found.');
  }

  if (invitation.acceptedAt) {
    throw new Error('Cannot cancel an invitation that has already been accepted.');
  }

  if (invitation.cancelledAt) {
    throw new Error('Invitation is already cancelled.');
  }

  return prisma.tenantInvitation.update({
    where: { id: invitation.id },
    data: {
      cancelledAt: new Date(),
    },
  });
}

/**
 * Updates a tenant user's details, application role, role profile, and manager.
 */
export async function updateTenantUser(
  tenantId: string,
  currentUserId: string,
  targetUserId: string,
  data: {
    name?: string;
    role?: UserRole;
    roleProfileId?: string | null;
    managerId?: string | null;
  }
): Promise<User> {
  // 1. Verify target user belongs to this tenant
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      tenantId,
    },
  });

  if (!targetUser) {
    throw new Error('User not found in this organization.');
  }

  // 2. Self-protection: Org Admin cannot demote themselves
  if (currentUserId === targetUserId && data.role && data.role !== UserRole.ORGANIZATION_ADMIN) {
    throw new Error('Organization Admins cannot change or demote their own application role.');
  }

  // 3. Application role validation
  if (data.role) {
    if (
      data.role !== UserRole.ORGANIZATION_ADMIN &&
      data.role !== UserRole.MANAGER &&
      data.role !== UserRole.STAFF
    ) {
      throw new Error('Invalid application role.');
    }

    // 4. Manager Safety Rule: Demoting a MANAGER with direct reports is rejected
    if (targetUser.role === UserRole.MANAGER && data.role === UserRole.STAFF) {
      const directReportsCount = await prisma.user.count({
        where: {
          managerId: targetUserId,
          isActive: true,
        },
      });

      if (directReportsCount > 0) {
        throw new Error(
          `This manager still has ${directReportsCount} active direct report(s). Reassign them before changing role or deactivating the manager.`
        );
      }
    }
  }

  // 5. Manager validation if assigning a new manager
  if (data.managerId !== undefined) {
    if (data.managerId !== null) {
      if (data.managerId === targetUserId) {
        throw new Error('A user cannot be assigned as their own manager.');
      }

      const manager = await prisma.user.findFirst({
        where: {
          id: data.managerId,
          tenantId,
          isActive: true,
          role: UserRole.MANAGER,
        },
      });

      if (!manager) {
        throw new Error('Assigned manager must be an active Manager in this organization.');
      }
    }
  }

  // 6. Role Profile validation if assigning
  if (data.roleProfileId !== undefined) {
    if (data.roleProfileId !== null) {
      const roleProfile = await prisma.roleProfile.findFirst({
        where: {
          id: data.roleProfileId,
          tenantId,
          status: RoleProfileStatus.PUBLISHED,
          isArchived: false,
        },
      });

      if (!roleProfile) {
        throw new Error('Assigned role profile must be a published role profile in this organization (and not archived).');
      }
    }
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      role: data.role || undefined,
      roleProfileId: data.roleProfileId !== undefined ? data.roleProfileId : undefined,
      managerId: data.managerId !== undefined ? data.managerId : undefined,
    },
  });
}

/**
 * Deactivates a tenant user safely without deleting historical data.
 */
export async function deactivateTenantUser(
  tenantId: string,
  currentUserId: string,
  targetUserId: string
): Promise<User> {
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      tenantId,
    },
  });

  if (!targetUser) {
    throw new Error('User not found in this organization.');
  }

  // Self-protection
  if (currentUserId === targetUserId) {
    throw new Error('Organization Admins cannot deactivate their own account.');
  }

  // Manager Safety Rule: Cannot deactivate a manager with active direct reports
  if (targetUser.role === UserRole.MANAGER) {
    const directReportsCount = await prisma.user.count({
      where: {
        managerId: targetUserId,
        isActive: true,
      },
    });

    if (directReportsCount > 0) {
      throw new Error(
        `This manager still has ${directReportsCount} active direct report(s). Reassign them before changing role or deactivating the manager.`
      );
    }
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
    },
  });
}

/**
 * Reactivates a deactivated tenant user after asserting available seat capacity.
 */
export async function reactivateTenantUser(
  tenantId: string,
  targetUserId: string
): Promise<User> {
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      tenantId,
    },
  });

  if (!targetUser) {
    throw new Error('User not found in this organization.');
  }

  if (targetUser.isActive) {
    return targetUser;
  }

  // Enforce seat limit before reactivation
  await assertTenantHasAvailableSeat(tenantId);

  return prisma.user.update({
    where: { id: targetUserId },
    data: {
      isActive: true,
      deactivatedAt: null,
    },
  });
}

/**
 * Returns seat usage metrics for a tenant.
 */
export async function getTenantSeatUsage(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { seatLimit: true },
  });

  const activeCount = await prisma.user.count({
    where: {
      tenantId,
      isActive: true,
    },
  });

  const seatLimit = tenant?.seatLimit ?? null;
  const availableSeats = seatLimit !== null ? Math.max(0, seatLimit - activeCount) : null;

  return {
    activeUsers: activeCount,
    seatLimit,
    availableSeats,
  };
}
