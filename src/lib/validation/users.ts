import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const allowedTenantRoles = [
  UserRole.ORGANIZATION_ADMIN,
  UserRole.MANAGER,
  UserRole.STAFF,
] as const;

export const inviteTenantUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .transform((val) => val.trim()),
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
  role: z.enum(allowedTenantRoles, {
    message: 'Please select a valid organization role.',
  }),
  roleProfileId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  managerId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});

export const updateTenantUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  role: z.enum(allowedTenantRoles).optional(),
  roleProfileId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  managerId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});

export type InviteTenantUserInput = z.infer<typeof inviteTenantUserSchema>;
export type UpdateTenantUserInput = z.infer<typeof updateTenantUserSchema>;
