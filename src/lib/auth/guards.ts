import { redirect } from 'next/navigation';
import { UserRole, TenantStatus } from '@prisma/client';
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
    case UserRole.SUPPORT:
      return '/support';
    default:
      return '/login';
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

  const isImpersonatingOrgAdmin =
    Boolean(user.impersonation?.isImpersonating) &&
    (user.role === UserRole.SUPPORT || user.role === UserRole.PLATFORM_ADMIN) &&
    roles.includes(UserRole.ORGANIZATION_ADMIN);

  if (!roles.includes(user.role) && !isImpersonatingOrgAdmin) {
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
    status: TenantStatus;
  };
}

export async function requireTenantUser(): Promise<TenantUser> {
  const user = await requireUser();
  if (!user.tenantId || !user.tenant) {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      redirect('/platform-admin');
    }
    if (user.role === UserRole.SUPPORT) {
      redirect('/support');
    }
    redirect('/login');
  }
  return user as TenantUser;
}
