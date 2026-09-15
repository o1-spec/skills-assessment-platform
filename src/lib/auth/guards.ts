import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { getCurrentUser, AuthenticatedUser } from './service';

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case UserRole.PLATFORM_ADMIN:
      return '/platform-admin';
    case UserRole.ORGANIZATION_ADMIN:
      return '/organization-admin';
    case UserRole.MANAGER:
      return '/manager';
    case UserRole.STAFF:
      return '/staff';
  }
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireUser();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    redirect(getRoleDashboardPath(user.role));
  }

  return user;
}

export interface TenantUser extends AuthenticatedUser {
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export async function requireTenantUser(): Promise<TenantUser> {
  const user = await requireUser();
  if (!user.tenantId || !user.tenant) {
    redirect(getRoleDashboardPath(user.role));
  }
  return user as TenantUser;
}
