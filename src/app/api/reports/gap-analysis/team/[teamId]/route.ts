import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateTeamGapCsv } from '@/services/reports';
import { UserRole } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const user = await getCurrentUser();

  if (!user || user.role !== UserRole.ORGANIZATION_ADMIN || !user.tenantId) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { teamId } = await context.params;

  if (!teamId) {
    return new NextResponse('Missing team ID', { status: 400 });
  }

  try {
    const result = await generateTeamGapCsv(user.tenantId, teamId);

    if (!result) {
      return new NextResponse('Team not found or unauthorized', { status: 404 });
    }

    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to generate team gap CSV:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
