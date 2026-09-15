import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSessionToken, setSessionCookie, deleteSessionCookie, getSessionToken, verifySessionToken } from './session';
import type { UserRole, TenantStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  tenantId: string | null;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
  } | null;
}

export async function authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  if (!email || !password) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  // Deny access if user belongs to a suspended tenant
  if (user.tenant && user.tenant.status === 'SUSPENDED') {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    tenantId: user.tenantId,
    managerId: user.managerId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    tenant: user.tenant,
  };
}

export async function createSession(userId: string): Promise<void> {
  const token = await createSessionToken(userId);
  await setSessionCookie(token);
}

export async function deleteSession(): Promise<void> {
  await deleteSessionCookie();
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);
  if (!session || !session.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  // Deny access if user belongs to a suspended tenant
  if (user.tenant && user.tenant.status === 'SUSPENDED') {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    tenantId: user.tenantId,
    managerId: user.managerId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    tenant: user.tenant,
  };
}
