import { NextRequest, NextResponse } from 'next/server';
import { createStrengthLog } from '@/lib/db';
import { StrengthActivityType } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    date: string; activityType: StrengthActivityType; durationMin: number | null; note: string | null;
  };

  const log = await createStrengthLog(body.date, body.activityType, body.durationMin, body.note);
  return NextResponse.json({ log });
}
