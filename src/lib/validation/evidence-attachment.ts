import { z } from 'zod';

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedEvidenceMimeType = (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number];

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function isAllowedMimeType(mimeType: string): boolean {
  return (ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'unnamed-file';

  // Remove any path traversal or absolute path separators
  const baseName = fileName.replace(/^.*[\\/]/, '');

  // Strip null bytes and non-printable characters
  const cleanName = baseName.replace(/[\0-\x1F\x7F-\x9F]/g, '');

  // Separate name and extension
  const lastDot = cleanName.lastIndexOf('.');
  if (lastDot === -1) {
    const sanitized = cleanName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    return sanitized || 'attachment';
  }

  const namePart = cleanName.substring(0, lastDot).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const extPart = cleanName.substring(lastDot).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase().slice(0, 10);

  return `${namePart || 'file'}${extPart}`;
}

export const evidenceAttachmentInputSchema = z.object({
  assessmentItemId: z.string().min(1, 'Assessment Item ID is required'),
  fileName: z.string().min(1, 'File name is required').max(255, 'File name is too long'),
  mimeType: z
    .string()
    .refine((val) => isAllowedMimeType(val), {
      message: 'File type not allowed. Supported formats: PDF, PNG, JPG, DOC, DOCX.',
    }),
  fileSize: z
    .number()
    .int()
    .positive('File must not be empty')
    .max(MAX_EVIDENCE_FILE_SIZE_BYTES, 'File size cannot exceed 10MB.'),
});

export type EvidenceAttachmentInput = z.infer<typeof evidenceAttachmentInputSchema>;
