import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateOrganizationGapExcel } from '@/services/reports';
import { UserRole } from '@prisma/client';

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== UserRole.ORGANIZATION_ADMIN || !user.tenantId) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const result = await generateOrganizationGapExcel(user.tenantId);

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to generate organization gap Excel:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
