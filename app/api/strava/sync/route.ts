import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, fetchActivitiesSince, fetchActivityDetail, filterRuns, toStravaActivity } from '@/lib/strava-client';
import { getLastSyncedDate, upsertStravaActivity } from '@/lib/db';

const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = await getValidAccessToken();

  const lastSynced = await getLastSyncedDate();
  const afterEpoch = lastSynced
    ? Math.floor(new Date(lastSynced).getTime() / 1000)
    : Math.floor(Date.now() / 1000) - THIRTY_DAYS_S;

  const activities = await fetchActivitiesSince(accessToken, afterEpoch);
  const runs = filterRuns(activities);

  for (const run of runs) {
    const detail = await fetchActivityDetail(accessToken, run.id);
    await upsertStravaActivity(toStravaActivity(detail));
  }

  return NextResponse.json({ synced: runs.length });
}
