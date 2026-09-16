import { prisma } from '@/lib/db';
import { User, UserRole, RoleProfileStatus, TenantInvitation, AuditAction } from '@prisma/client';
import { assertTenantHasAvailableSeat } from './tenants';
import { logAuditEvent } from './audit';

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

export async function updateTenantUser(
  tenantId: string,
  currentUserId: string,
  targetUserId: string,
  data: {
    name?: string;
    role?: UserRole;
    roleProfileId?: string | null;
    managerId?: string | null;
  },
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
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

  if (currentUserId === targetUserId && data.role && data.role !== UserRole.ORGANIZATION_ADMIN) {
    throw new Error('Organization Admins cannot change or demote their own application role.');
  }

  if (data.role) {
    if (
      data.role !== UserRole.ORGANIZATION_ADMIN &&
      data.role !== UserRole.MANAGER &&
      data.role !== UserRole.STAFF
    ) {
      throw new Error('Invalid application role.');
    }

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

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        role: data.role || undefined,
        roleProfileId: data.roleProfileId !== undefined ? data.roleProfileId : undefined,
        managerId: data.managerId !== undefined ? data.managerId : undefined,
      },
    });

    const actorId = actorContext?.actorId || currentUserId;

    if (data.role && data.role !== targetUser.role) {
      await logAuditEvent({
        tx,
        action: AuditAction.USER_ROLE_CHANGE,
        entityType: 'User',
        entityId: targetUserId,
        tenantId,
        actorId,
        ipAddress: actorContext?.ipAddress,
        userAgent: actorContext?.userAgent,
        details: {
          targetUserId,
          targetEmail: targetUser.email,
          previousRole: targetUser.role,
          newRole: data.role,
        },
      });
    }

    if (data.roleProfileId !== undefined && data.roleProfileId !== targetUser.roleProfileId) {
      await logAuditEvent({
        tx,
        action: AuditAction.USER_ROLE_PROFILE_ASSIGN,
        entityType: 'User',
        entityId: targetUserId,
        tenantId,
        actorId,
        ipAddress: actorContext?.ipAddress,
        userAgent: actorContext?.userAgent,
        details: {
          targetUserId,
          targetEmail: targetUser.email,
          previousRoleProfileId: targetUser.roleProfileId,
          newRoleProfileId: data.roleProfileId,
        },
      });
    }

    return updated;
  });
}

export async function deactivateTenantUser(
  tenantId: string,
  currentUserId: string,
  targetUserId: string,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
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

  if (currentUserId === targetUserId) {
    throw new Error('Organization Admins cannot deactivate their own account.');
  }

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

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.USER_DEACTIVATE,
      entityType: 'User',
      entityId: targetUserId,
      tenantId,
      actorId: actorContext?.actorId || currentUserId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        targetUserId,
        targetEmail: targetUser.email,
        targetName: targetUser.name,
      },
    });

    return updated;
  });
}

export async function reactivateTenantUser(
  tenantId: string,
  targetUserId: string,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
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

  await assertTenantHasAvailableSeat(tenantId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: {
        isActive: true,
        deactivatedAt: null,
      },
    });

    await logAuditEvent({
      tx,
      action: AuditAction.USER_REACTIVATE,
      entityType: 'User',
      entityId: targetUserId,
      tenantId,
      actorId: actorContext?.actorId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        targetUserId,
        targetEmail: targetUser.email,
        targetName: targetUser.name,
      },
    });

    return updated;
  });
}

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
