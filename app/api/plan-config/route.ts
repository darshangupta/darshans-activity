import { NextRequest, NextResponse } from 'next/server';
import { getPlanConfig, savePlanConfig, getPlannedWorkouts, replacePlannedWorkouts, getRaces } from '@/lib/db';
import { generatePlan, applyOverrides } from '@/lib/plan-generator';
import { PlanConfig } from '@/lib/types';

export async function GET() {
  const config = await getPlanConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const config = await req.json() as PlanConfig;
  await savePlanConfig(config);

  const races = await getRaces();
  const marathon = races.find(r => r.name === 'marathon')!;
  const existing = await getPlannedWorkouts(config.startDate, marathon.date);
  const generated = generatePlan(config, races, config.startDate, marathon.date);
  const merged = applyOverrides(generated, existing);
  await replacePlannedWorkouts(merged);

  return NextResponse.json({ ok: true, workoutCount: merged.length });
}
