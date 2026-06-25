import { NextRequest, NextResponse } from 'next/server';
import { syncStravaAction } from '@/app/actions';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncStravaAction();

  return NextResponse.json(result);
}
