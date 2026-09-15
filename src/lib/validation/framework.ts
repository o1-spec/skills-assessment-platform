import { z } from 'zod';
import { CompetencyType } from '@prisma/client';

export const createFrameworkDraftSchema = z.object({
  version: z
    .string()
    .trim()
    .min(1, 'Version identifier is required')
    .max(50, 'Version identifier cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Version must only contain letters, numbers, dots, dashes, or underscores'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(100, 'Category name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  type: z.nativeEnum(CompetencyType),
  parentId: z.string().trim().optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(100, 'Category name cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export const createCompetencySchema = z.object({
  categoryId: z.string().trim().min(1, 'Category ID is required'),
  name: z
    .string()
    .trim()
    .min(1, 'Competency name is required')
    .max(100, 'Competency name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(1000, 'Description cannot exceed 1000 characters'),
});

export const updateCompetencySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Competency name is required')
    .max(100, 'Competency name cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  categoryId: z.string().trim().min(1, 'Category ID is required').optional(),
});

export const createLevelSchema = z.object({
  frameworkCompetencyId: z.string().trim().min(1, 'Competency ID is required'),
  level: z.coerce
    .number()
    .int('Level must be an integer')
    .positive('Level must be a positive integer (greater than 0)'),
  description: z
    .string()
    .trim()
    .min(1, 'Level descriptor description is required')
    .max(1000, 'Description cannot exceed 1000 characters'),
  evidencePrompt: z
    .string()
    .trim()
    .max(500, 'Evidence prompt cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export const updateLevelSchema = z.object({
  level: z.coerce
    .number()
    .int('Level must be an integer')
    .positive('Level must be a positive integer (greater than 0)')
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Level descriptor description is required')
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  evidencePrompt: z
    .string()
    .trim()
    .max(500, 'Evidence prompt cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export const createDraftFromPublishedSchema = z.object({
  sourceVersionId: z.string().trim().min(1, 'Source version ID is required'),
  newVersion: z
    .string()
    .trim()
    .min(1, 'New version identifier is required')
    .max(50, 'Version identifier cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Version must only contain letters, numbers, dots, dashes, or underscores'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});
