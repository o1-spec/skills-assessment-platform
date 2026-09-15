import { z } from 'zod';

// Common baseline validation schemas
export const idSchema = z.string().min(1, 'Identifier cannot be empty');

export const emailSchema = z.string().email('Invalid email address');

export * from './auth';
