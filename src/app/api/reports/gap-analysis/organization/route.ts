import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateOrganizationGapCsv } from '@/services/reports';
import { UserRole } from '@prisma/client';

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== UserRole.ORGANIZATION_ADMIN || !user.tenantId) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const result = await generateOrganizationGapCsv(user.tenantId);

    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to generate organization gap CSV:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
