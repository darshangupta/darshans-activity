import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/strava-client';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code param' }, { status: 400 });
  }
  await exchangeCodeForTokens(code);
  return NextResponse.redirect(new URL('/?strava=connected', req.url));
}
