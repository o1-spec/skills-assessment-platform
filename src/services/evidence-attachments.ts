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

export async function uploadEvidenceAttachment(
  userId: string,
  tenantId: string,
  assessmentItemId: string,
  file: UploadAttachmentPayload
): Promise<EvidenceAttachment> {
  if (!userId || !tenantId || !assessmentItemId) {
    throw new Error('Authentication and assessment item identifier are required.');
  }

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

  if (assessment.campaign.tenantId !== tenantId) {
    throw new Error('Access denied: Cross-tenant operation.');
  }

  if (assessment.userId !== userId) {
    throw new Error('Forbidden: You can only upload evidence to your own assessment.');
  }

  const isEditable =
    assessment.status === AssessmentStatus.NOT_STARTED ||
    assessment.status === AssessmentStatus.DRAFT;

  if (!isEditable) {
    throw new Error('Evidence cannot be uploaded to a submitted or completed assessment.');
  }

  const isPastDeadline = new Date(assessment.campaign.deadline).getTime() <= Date.now();
  if (isPastDeadline) {
    throw new Error('The assessment deadline has passed. Evidence attachments cannot be added.');
  }

  const uniqueId = crypto.randomUUID();
  const storagePath = `${tenantId}/${assessment.id}/${item.id}/${uniqueId}-${sanitizedName}`;

  const storage = getStorageClient();
  await storage.uploadObject(storagePath, file.buffer, file.type);

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
    try {
      await storage.deleteObject(storagePath);
    } catch {
      console.error('[Storage Rollback Error] Failed to delete orphaned object:', storagePath);
    }
    throw dbError;
  }
}

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

  if (assessment.campaign.tenantId !== tenantId) {
    throw new Error('Access denied: Cross-tenant operation.');
  }

  if (assessment.userId !== userId) {
    throw new Error('Forbidden: You can only delete your own evidence attachments.');
  }

  const isEditable =
    assessment.status === AssessmentStatus.NOT_STARTED ||
    assessment.status === AssessmentStatus.DRAFT;

  if (!isEditable) {
    throw new Error('Attachments cannot be deleted from a submitted or completed assessment.');
  }

  const isPastDeadline = new Date(assessment.campaign.deadline).getTime() <= Date.now();
  if (isPastDeadline) {
    throw new Error('The assessment deadline has passed. Evidence attachments cannot be deleted.');
  }

  const storage = getStorageClient();
  await storage.deleteObject(attachment.storagePath);

  await prisma.evidenceAttachment.delete({
    where: { id: attachmentId },
  });
}

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

  if (assessment.campaign.tenantId !== tenantId) {
    throw new Error('Access denied: Cross-tenant operation.');
  }

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
