
export const Roles = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  ORGANIZATION_ADMIN: 'ORGANIZATION_ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
