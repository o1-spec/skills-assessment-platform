import { z } from 'zod';
import { RoleProfileStatus } from '@prisma/client';

export const roleRequirementInputSchema = z.object({
  competencyId: z.string().min(1, 'Competency ID is required'),
  targetLevel: z.coerce.number().int().min(1, 'Target level must be an integer of at least 1'),
});

export const createRoleProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Role name is required')
      .max(100, 'Role name cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .or(z.literal('')),
    status: z.nativeEnum(RoleProfileStatus).default(RoleProfileStatus.DRAFT),
    requirements: z.array(roleRequirementInputSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.status === RoleProfileStatus.PUBLISHED) {
        return data.requirements.length > 0;
      }
      return true;
    },
    {
      message: 'Publishing a role profile requires at least one competency requirement.',
      path: ['requirements'],
    }
  );

export type CreateRoleProfileInput = z.infer<typeof createRoleProfileSchema>;
export type RoleRequirementInput = z.infer<typeof roleRequirementInputSchema>;

export const updateRoleProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Role name is required')
      .max(100, 'Role name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .or(z.literal('')),
    status: z.nativeEnum(RoleProfileStatus).optional(),
    requirements: z.array(roleRequirementInputSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.status === RoleProfileStatus.PUBLISHED && data.requirements !== undefined) {
        return data.requirements.length > 0;
      }
      return true;
    },
    {
      message: 'Publishing a role profile requires at least one competency requirement.',
      path: ['requirements'],
    }
  );

export type UpdateRoleProfileInput = z.infer<typeof updateRoleProfileSchema>;
