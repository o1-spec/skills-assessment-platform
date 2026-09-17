import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/service';

export async function POST(req: NextRequest) {
  await deleteSession();
  const url = new URL('/login', req.url);
  return NextResponse.redirect(url, 303);
}

export async function GET(req: NextRequest) {
  await deleteSession();
  const url = new URL('/login', req.url);
  return NextResponse.redirect(url, 302);
}
