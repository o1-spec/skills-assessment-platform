import { z } from 'zod';
import { LearningResourceType } from '@prisma/client';

export const safeUrlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function isSafeUrl(val: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const competencyLearningResourceMappingInputSchema = z.object({
  competencyId: z.string().min(1, 'Competency ID is required'),
  targetLevel: z
    .number()
    .int('Target level must be an integer')
    .min(1, 'Target level must be at least 1')
    .max(10, 'Target level cannot exceed 10')
    .nullable()
    .optional(),
});

export const createLearningResourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .or(z.literal('')),
  url: z
    .string()
    .trim()
    .min(5, 'URL is required')
    .max(2048, 'URL cannot exceed 2048 characters')
    .refine(isSafeUrl, {
      message: 'URL must be a valid http:// or https:// address (javascript: and data: schemes are prohibited)',
    }),
  provider: z
    .string()
    .trim()
    .max(100, 'Provider cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  resourceType: z.nativeEnum(LearningResourceType).default(LearningResourceType.COURSE),
  isActive: z.boolean().default(true),
  mappings: z.array(competencyLearningResourceMappingInputSchema).default([]),
});

export const updateLearningResourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .or(z.literal('')),
  url: z
    .string()
    .trim()
    .min(5, 'URL is required')
    .max(2048, 'URL cannot exceed 2048 characters')
    .refine(isSafeUrl, {
      message: 'URL must be a valid http:// or https:// address (javascript: and data: schemes are prohibited)',
    }),
  provider: z
    .string()
    .trim()
    .max(100, 'Provider cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  resourceType: z.nativeEnum(LearningResourceType),
  isActive: z.boolean(),
  mappings: z.array(competencyLearningResourceMappingInputSchema).default([]),
});

export type CreateLearningResourceInput = z.infer<typeof createLearningResourceSchema>;
export type UpdateLearningResourceInput = z.infer<typeof updateLearningResourceSchema>;
export type CompetencyLearningResourceMappingInput = z.infer<typeof competencyLearningResourceMappingInputSchema>;
