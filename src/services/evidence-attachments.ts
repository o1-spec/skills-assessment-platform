import { prisma } from '@/lib/db';
import { getStorageClient } from '@/lib/storage/supabase-storage';
import {
  evidenceAttachmentInputSchema,
  sanitizeFileName,
} from '@/lib/validation';
import { AssessmentStatus, EvidenceAttachment, UserRole } from '@prisma/client';
import crypto from 'crypto';

export type EvidenceAttachmentMetadata = EvidenceAttachment;

export interface UploadAttachmentPayload {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
}

/**
 * Uploads an evidence attachment for an assessment item.
 * Strictly verifies ownership, tenant isolation, editability, and file validity.
 */
export async function uploadEvidenceAttachment(
  userId: string,
  tenantId: string,
  assessmentItemId: string,
  file: UploadAttachmentPayload
): Promise<EvidenceAttachment> {
  if (!userId || !tenantId || !assessmentItemId) {
    throw new Error('Authentication and assessment item identifier are required.');
  }

  // 1. Validate file metadata
  const sanitizedName = sanitizeFileName(file.name);
  const validated = evidenceAttachmentInputSchema.safeParse({
    assessmentItemId,
    fileName: sanitizedName,
    mimeType: file.type,
    fileSize: file.size,
  });

  if (!validated.success) {
    throw new Error(validated.error.issues[0]?.message || 'Invalid file attachment.');
  }

  // 2. Fetch assessment item with ownership & status
  const item = await prisma.assessmentItem.findUnique({
    where: { id: assessmentItemId },
    include: {
      assessment: {
        include: {
          campaign: true,
        },
      },
    },
  });

  if (!item) {
    throw new Error('Assessment item not found.');
  }

  const assessment = item.assessment;

  // 3. Multi-tenant isolation check
  if (assessment.campaign.tenantId !== tenantId) {
    throw new Error('Access denied: Cross-tenant operation.');
  }

  // 4. Ownership verification
  if (assessment.userId !== userId) {
    throw new Error('Forbidden: You can only upload evidence to your own assessment.');
  }

  // 5. Editability check (NOT_STARTED or DRAFT)
  const isEditable =
    assessment.status === AssessmentStatus.NOT_STARTED ||
    assessment.status === AssessmentStatus.DRAFT;

  if (!isEditable) {
    throw new Error('Evidence cannot be uploaded to a submitted or completed assessment.');
  }

  // 6. Deadline check
  const isPastDeadline = new Date(assessment.campaign.deadline).getTime() <= Date.now();
  if (isPastDeadline) {
    throw new Error('The assessment deadline has passed. Evidence attachments cannot be added.');
  }

  // 7. Generate isolated non-guessable storage path
  const uniqueId = crypto.randomUUID();
  const storagePath = `${tenantId}/${assessment.id}/${item.id}/${uniqueId}-${sanitizedName}`;

  // 8. Upload to storage
  const storage = getStorageClient();
  await storage.uploadObject(storagePath, file.buffer, file.type);

  // 9. Persist database record (with compensation on failure)
  try {
    const attachment = await prisma.evidenceAttachment.create({
      data: {
        assessmentItemId: item.id,
        storagePath,
        fileName: sanitizedName,
        mimeType: file.type,
        fileSize: file.size,
      },
    });

    return attachment;
  } catch (dbError) {
    // Attempt rollback of storage object to avoid orphaned files
    try {
      await storage.deleteObject(storagePath);
    } catch {
      // Diagnostic log without leaking credentials
      console.error('[Storage Rollback Error] Failed to delete orphaned object:', storagePath);
    }
    throw dbError;
  }
}

/**
 * Deletes an evidence attachment.
 * Strictly verifies ownership, tenant isolation, and editability.
 * Removes the object from storage first before deleting DB metadata.
 */
export async function deleteEvidenceAttachment(
  userId: string,
  tenantId: string,
  attachmentId: string
): Promise<void> {
  if (!userId || !tenantId || !attachmentId) {
    throw new Error('Authentication and attachment identifier are required.');
  }

  const attachment = await prisma.evidenceAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      assessmentItem: {
        include: {
          assessment: {
            include: {
              campaign: true,
            },
          },
        },
      },
    },
  });

  if (!attachment) {
    throw new Error('Evidence attachment not found.');
  }

  const assessment = attachment.assessmentItem.assessment;

  // Tenant isolation
  if (assessment.campaign.tenantId !== tenantId) {
    throw new Error('Access denied: Cross-tenant operation.');
  }

  // Ownership verification
  if (assessment.userId !== userId) {
    throw new Error('Forbidden: You can only delete your own evidence attachments.');
  }

  // Editability check
  const isEditable =
    assessment.status === AssessmentStatus.NOT_STARTED ||
    assessment.status === AssessmentStatus.DRAFT;

  if (!isEditable) {
    throw new Error('Attachments cannot be deleted from a submitted or completed assessment.');
  }

  // Deadline check
  const isPastDeadline = new Date(assessment.campaign.deadline).getTime() <= Date.now();
  if (isPastDeadline) {
    throw new Error('The assessment deadline has passed. Evidence attachments cannot be deleted.');
  }

  // 1. Delete from storage first
  const storage = getStorageClient();
  await storage.deleteObject(attachment.storagePath);

  // 2. Remove DB row
  await prisma.evidenceAttachment.delete({
    where: { id: attachmentId },
  });
}

/**
 * Generates a short-lived signed URL for an evidence attachment after strict authorization.
 * Staff can view their own attachments.
 * Managers can view attachments for their direct reports.
 */
export async function getEvidenceAttachmentSignedUrl(
  userId: string,
  userRole: UserRole,
  tenantId: string,
  attachmentId: string,
  expiresInSeconds: number = 900
): Promise<{ url: string; fileName: string; mimeType: string }> {
  if (!userId || !tenantId || !attachmentId) {
    throw new Error('Authentication and attachment identifier are required.');
  }

  const attachment = await prisma.evidenceAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      assessmentItem: {
        include: {
          assessment: {
            include: {
              user: true,
              campaign: true,
            },
          },
        },
      },
    },
  });

  if (!attachment) {
    throw new Error('Evidence attachment not found.');
  }

  const assessment = attachment.assessmentItem.assessment;

  // Tenant isolation
  if (assessment.campaign.tenantId !== tenantId) {
    throw new Error('Access denied: Cross-tenant operation.');
  }

  // Role authorization
  if (userRole === UserRole.STAFF) {
    if (assessment.userId !== userId) {
      throw new Error('Forbidden: You can only view your own evidence attachments.');
    }
  } else if (userRole === UserRole.MANAGER) {
    if (assessment.user.managerId !== userId) {
      throw new Error('Forbidden: You can only view evidence attachments for your direct reports.');
    }
  } else {
    throw new Error('Forbidden: Your role does not have permission to view evidence attachments.');
  }

  const storage = getStorageClient();
  const url = await storage.createSignedDownloadUrl(attachment.storagePath, expiresInSeconds);

  return {
    url,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
  };
}

/**
 * Retrieves all attachments for an assessment item.
 */
export async function getAttachmentsForAssessmentItem(
  assessmentItemId: string,
  tenantId: string
): Promise<EvidenceAttachment[]> {
  if (!assessmentItemId || !tenantId) return [];

  return prisma.evidenceAttachment.findMany({
    where: {
      assessmentItemId,
      assessmentItem: {
        assessment: {
          campaign: {
            tenantId,
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}
