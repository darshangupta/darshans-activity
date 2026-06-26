import { NextResponse } from 'next/server';
import { getAuthorizeUrl } from '@/lib/strava-client';

export async function GET() {
  return NextResponse.redirect(getAuthorizeUrl());
}
