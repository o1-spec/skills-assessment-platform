import { z } from 'zod';

export const corroborationItemInputSchema = z.object({
  assessmentItemId: z.string().min(1, 'Assessment item ID is required'),
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1'),
  justification: z
    .string()
    .max(2000, 'Justification cannot exceed 2,000 characters')
    .nullable()
    .optional()
    .transform((val) => (val === undefined || val === '' ? null : val)),
});

export const submitCorroborationSchema = z.object({
  assessmentId: z.string().min(1, 'Assessment ID is required'),
  items: z
    .array(corroborationItemInputSchema)
    .min(1, 'At least one competency rating is required for review.')
    .refine(
      (items) => {
        const ids = items.map((i) => i.assessmentItemId);
        return new Set(ids).size === ids.length;
      },
      {
        message: 'Duplicate assessment item IDs provided.',
      }
    ),
});

export type CorroborationItemInput = z.infer<typeof corroborationItemInputSchema>;
export type SubmitCorroborationInput = z.infer<typeof submitCorroborationSchema>;
