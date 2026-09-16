import { NextRequest, NextResponse } from 'next/server';
import { executeDueReportSchedules } from '@/services/report-schedules';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleCron(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCron(request);
}

async function handleCron(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;

  // Verify CRON_SECRET is configured
  if (!cronSecret || cronSecret.trim().length === 0) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server.' },
      { status: 500 }
    );
  }

  // Check Authorization header or x-cron-secret
  const authHeader = request.headers.get('authorization');
  const customHeader = request.headers.get('x-cron-secret');

  let providedSecret = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedSecret = authHeader.substring(7).trim();
  } else if (customHeader) {
    providedSecret = customHeader.trim();
  }

  if (!providedSecret || providedSecret !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing cron secret.' },
      { status: 401 }
    );
  }

  try {
    const result = await executeDueReportSchedules();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      schedules: {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        errorCount: result.errors.length,
        errors: result.errors,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown cron report execution error';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
