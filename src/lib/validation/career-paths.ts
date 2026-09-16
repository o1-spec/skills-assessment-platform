import { z } from 'zod';
import { CareerPathStatus } from '@prisma/client';

export const createCareerPathSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Career path name must be at least 2 characters')
    .max(100, 'Career path name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  roleProfileIds: z
    .array(z.string().min(1, 'Role profile ID is required'))
    .min(2, 'A career path must contain at least 2 distinct role profiles')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Duplicate role profiles are not allowed in the same career path',
    }),
  status: z.nativeEnum(CareerPathStatus).optional().default(CareerPathStatus.DRAFT),
});

export const updateCareerPathSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Career path name must be at least 2 characters')
    .max(100, 'Career path name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  roleProfileIds: z
    .array(z.string().min(1, 'Role profile ID is required'))
    .min(2, 'A career path must contain at least 2 distinct role profiles')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Duplicate role profiles are not allowed in the same career path',
    }),
});

export type CreateCareerPathInput = z.infer<typeof createCareerPathSchema>;
export type UpdateCareerPathInput = z.infer<typeof updateCareerPathSchema>;
