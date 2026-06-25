// lib/plan-generator.ts
import {
  PlanConfig, PlannedWorkout, Race, Weekday,
} from './types';

const WEEKDAY_NAMES: Weekday[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

function parseISO(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function weekdayName(date: Date): Weekday {
  return WEEKDAY_NAMES[date.getUTCDay()];
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function isSameDate(a: Date, b: Date): boolean {
  return formatISO(a) === formatISO(b);
}

export function generatePlan(
  config: PlanConfig,
  races: Race[],
  rangeStart: string,
  rangeEnd: string,
): PlannedWorkout[] {
  const start = parseISO(rangeStart);
  const end = parseISO(rangeEnd);
  const half = races.find(r => r.name === 'half');
  const marathon = races.find(r => r.name === 'marathon');
  if (!half || !marathon) {
    throw new Error('generatePlan requires both a half and marathon race');
  }

  const workouts: PlannedWorkout[] = [];

  for (let date = start; diffDays(date, end) <= 0; date = addDays(date, 1)) {
    const iso = formatISO(date);
    const weekday = weekdayName(date);
    const dayConfig = config.weeklyTemplate[weekday];

    if (dayConfig.kind === 'open') {
      workouts.push({
        date: iso, kind: 'open', targetMin: null, targetMax: null,
        isOverride: false, note: null,
      });
      continue;
    }

    workouts.push({
      date: iso, kind: 'run', targetMin: null, targetMax: null,
      isOverride: false, note: null,
    });
  }

  return workouts;
}
