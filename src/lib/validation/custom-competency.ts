import { z } from 'zod';
import { CompetencyType } from '@prisma/client';

export const customCompetencyLevelSchema = z.object({
  level: z.coerce
    .number()
    .int('Level must be an integer')
    .positive('Level must be a positive integer (greater than 0)'),
  description: z
    .string()
    .trim()
    .min(1, 'Level description is required')
    .max(1000, 'Description cannot exceed 1000 characters'),
  evidencePrompt: z
    .string()
    .trim()
    .max(500, 'Evidence prompt cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export const createCustomCompetencySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Competency name is required')
      .max(100, 'Competency name cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .or(z.literal('')),
    type: z.nativeEnum(CompetencyType),
    levels: z
      .array(customCompetencyLevelSchema)
      .min(1, 'At least one level descriptor is required'),
  })
  .refine(
    (data) => {
      const levels = data.levels.map((l) => l.level);
      const uniqueLevels = new Set(levels);
      return uniqueLevels.size === levels.length;
    },
    {
      message: 'Level numbers must be unique within the competency',
      path: ['levels'],
    }
  );

export const updateCustomCompetencySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Competency name is required')
      .max(100, 'Competency name cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .or(z.literal('')),
    type: z.nativeEnum(CompetencyType),
    levels: z
      .array(customCompetencyLevelSchema)
      .min(1, 'At least one level descriptor is required'),
  })
  .refine(
    (data) => {
      const levels = data.levels.map((l) => l.level);
      const uniqueLevels = new Set(levels);
      return uniqueLevels.size === levels.length;
    },
    {
      message: 'Level numbers must be unique within the competency',
      path: ['levels'],
    }
  );

export type CreateCustomCompetencyInput = z.infer<typeof createCustomCompetencySchema>;
export type UpdateCustomCompetencyInput = z.infer<typeof updateCustomCompetencySchema>;
