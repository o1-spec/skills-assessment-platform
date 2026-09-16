import { z } from 'zod';

// Common baseline validation schemas
export const idSchema = z.string().min(1, 'Identifier cannot be empty');

export const emailSchema = z.string().email('Invalid email address');

export * from './auth';
export * from './role-profile';
export * from './campaign';
export * from './assessment';
export * from './corroboration';
export * from './framework';
export * from './custom-competency';
export * from './plans';
export * from './tenants';
export * from './invitations';
export * from './industry-templates';
export * from './users';
export * from './evidence-attachment';
export * from './career-paths';
export * from './learning-resources';
export * from './interview-questions';
