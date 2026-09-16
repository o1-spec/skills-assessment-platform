import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const storagePath = searchParams.get('path');
  const expiresStr = searchParams.get('expires');

  if (!storagePath) {
    return new NextResponse('Missing storage path', { status: 400 });
  }

  if (expiresStr) {
    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) {
      return new NextResponse('Signed URL has expired', { status: 410 });
    }
  }

  const attachment = await prisma.evidenceAttachment.findFirst({
    where: { storagePath },
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
    return new NextResponse('Attachment not found', { status: 404 });
  }

  const assessment = attachment.assessmentItem.assessment;

  if (assessment.campaign.tenantId !== user.tenantId) {
    return new NextResponse('Forbidden: Cross-tenant access denied', { status: 403 });
  }

  if (user.role === UserRole.STAFF) {
    if (assessment.userId !== user.id) {
      return new NextResponse('Forbidden: You can only access your own evidence attachments', {
        status: 403,
      });
    }
  } else if (user.role === UserRole.MANAGER) {
    if (assessment.user.managerId !== user.id) {
      return new NextResponse(
        'Forbidden: You can only access evidence for your direct reports',
        { status: 403 }
      );
    }
  } else {
    return new NextResponse('Forbidden: Access denied for role', { status: 403 });
  }

  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || 'assessment-evidence';
  const fullPath = path.join(process.cwd(), '.storage', bucket, storagePath);

  try {
    const fileBuffer = await fs.readFile(fullPath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': attachment.fileSize.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch {
    return new NextResponse('File could not be loaded from storage', { status: 404 });
  }
}

