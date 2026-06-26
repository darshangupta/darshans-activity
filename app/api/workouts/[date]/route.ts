import { NextRequest, NextResponse } from 'next/server';
import { setWorkoutOverride } from '@/lib/db';
import { WorkoutKind } from '@/lib/types';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const body = await req.json() as {
    kind: WorkoutKind; targetMin: number | null; targetMax: number | null; note: string | null;
  };

  await setWorkoutOverride({
    date, kind: body.kind, targetMin: body.targetMin, targetMax: body.targetMax,
    isOverride: true, note: body.note,
  });

  return NextResponse.json({ ok: true });
}
