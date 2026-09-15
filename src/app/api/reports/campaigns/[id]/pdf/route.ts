import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateCampaignSummaryPdf } from '@/services/reports';
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
    return new NextResponse('Missing campaign ID', { status: 400 });
  }

  try {
    const result = await generateCampaignSummaryPdf(user.tenantId, id);

    if (!result) {
      return new NextResponse('Campaign not found or unauthorized', { status: 404 });
    }

    return new NextResponse(Buffer.from(result.pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to generate campaign summary PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
