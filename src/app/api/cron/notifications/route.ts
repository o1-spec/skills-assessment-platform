import { NextRequest, NextResponse } from 'next/server';
import {
  runAssessmentReminderNotifications,
  runCorroborationReminderNotifications,
} from '@/services/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleCron(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCron(request);
}

async function handleCron(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.trim().length === 0) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server.' },
      { status: 500 }
    );
  }

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
    const [assessmentReminders, corroborationReminders] = await Promise.all([
      runAssessmentReminderNotifications(),
      runCorroborationReminderNotifications(),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      assessmentReminders: {
        processed: assessmentReminders.processed,
        created: assessmentReminders.created,
        skipped: assessmentReminders.skipped,
        errorCount: assessmentReminders.errors.length,
      },
      corroborationReminders: {
        processed: corroborationReminders.processed,
        created: corroborationReminders.created,
        skipped: corroborationReminders.skipped,
        errorCount: corroborationReminders.errors.length,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown cron execution error';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
