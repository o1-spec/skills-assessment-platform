import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateInterviewQuestionSetPdf } from '@/services/interview-questions';
import { UserRole } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user || user.role !== UserRole.ORGANIZATION_ADMIN || !user.tenantId) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { id } = await context.params;

  if (!id) {
    return new NextResponse('Missing interview question set ID', { status: 400 });
  }

  try {
    const result = await generateInterviewQuestionSetPdf(user.tenantId, id);

    if (!result) {
      return new NextResponse('Interview question set not found or unauthorized', { status: 404 });
    }

    return new NextResponse(Buffer.from(result.pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to generate interview question PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
