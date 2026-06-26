import { NextRequest, NextResponse } from 'next/server';
import { getPlannedWorkouts, getStravaActivities, getStrengthLogs } from '@/lib/db';

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');
  if (!start || !end) {
    return NextResponse.json({ error: 'start and end query params are required' }, { status: 400 });
  }

  const [workouts, activities, strengthLogs] = await Promise.all([
    getPlannedWorkouts(start, end),
    getStravaActivities(start, end),
    getStrengthLogs(start, end),
  ]);

  return NextResponse.json({ workouts, activities, strengthLogs });
}
