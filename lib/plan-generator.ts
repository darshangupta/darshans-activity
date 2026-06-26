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

type Phase =
  | 'half-build' | 'half-taper' | 'recovery'
  | 'marathon-build' | 'marathon-taper' | 'post-marathon';

function getPhase(date: Date, half: Race, marathon: Race): Phase {
  const halfDate = parseISO(half.date);
  const marathonDate = parseISO(marathon.date);
  const halfTaperStart = addDays(halfDate, -14);
  const recoveryEnd = addDays(halfDate, 7);
  const marathonTaperStart = addDays(marathonDate, -21);

  if (diffDays(date, halfTaperStart) < 0) return 'half-build';
  if (diffDays(date, halfDate) <= 0) return 'half-taper';
  if (diffDays(date, recoveryEnd) <= 0) return 'recovery';
  if (diffDays(date, marathonTaperStart) < 0) return 'marathon-build';
  if (diffDays(date, marathonDate) <= 0) return 'marathon-taper';
  return 'post-marathon';
}

function phaseIntensity(phase: Phase): number {
  return phase === 'half-build' || phase === 'marathon-build' ? 1 : 0;
}

function firstSaturdayOnOrAfter(date: Date): Date {
  let d = date;
  while (weekdayName(d) !== 'saturday') d = addDays(d, 1);
  return d;
}

function lastSaturdayBefore(date: Date): Date {
  let d = addDays(date, -1);
  while (weekdayName(d) !== 'saturday') d = addDays(d, -1);
  return d;
}

function saturdaysBefore(raceDate: Date, count: number): Date[] {
  const result: Date[] = [];
  let d = addDays(raceDate, -1);
  while (result.length < count) {
    if (weekdayName(d) === 'saturday') result.push(d);
    d = addDays(d, -1);
  }
  return result;
}

function longRunMiles(
  date: Date, phase: Phase, half: Race, marathon: Race, config: PlanConfig,
): number {
  const halfDate = parseISO(half.date);
  const marathonDate = parseISO(marathon.date);
  const { longRun } = config;

  if (phase === 'half-build') {
    const firstBuildSaturday = firstSaturdayOnOrAfter(parseISO(config.startDate));
    const week = diffDays(date, firstBuildSaturday) / 7;
    return longRun.halfStartMiles + longRun.halfRampPerWeek * week;
  }

  if (phase === 'half-taper') {
    const taperSaturdays = saturdaysBefore(halfDate, longRun.halfTaperFactors.length);
    const idx = taperSaturdays.findIndex(d => isSameDate(d, date));
    if (idx === -1) return 0;
    const halfTaperStart = addDays(halfDate, -14);
    const peak = longRunMiles(lastSaturdayBefore(halfTaperStart), 'half-build', half, marathon, config);
    return Math.round(peak * longRun.halfTaperFactors[idx]);
  }

  if (phase === 'recovery') {
    return longRun.recoveryWeekMiles;
  }

  if (phase === 'marathon-build') {
    const firstBuildSaturday = firstSaturdayOnOrAfter(addDays(halfDate, 8));
    const week = diffDays(date, firstBuildSaturday) / 7 + 1;
    const miles = longRun.recoveryWeekMiles + longRun.marathonRampPerWeek * week;
    return Math.min(miles, longRun.marathonPeakMiles);
  }

  if (phase === 'marathon-taper') {
    const taperSaturdays = saturdaysBefore(marathonDate, longRun.marathonTaperFactors.length);
    const idx = taperSaturdays.findIndex(d => isSameDate(d, date));
    if (idx === -1) return 0;
    const marathonTaperStart = addDays(marathonDate, -21);
    const peak = longRunMiles(lastSaturdayBefore(marathonTaperStart), 'marathon-build', half, marathon, config);
    return Math.round(peak * longRun.marathonTaperFactors[idx]);
  }

  return 0;
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

    if (weekday !== 'saturday') {
      const phase = getPhase(date, half, marathon);
      const intensity = phaseIntensity(phase);
      const miles = Math.round(dayConfig.min + (dayConfig.max - dayConfig.min) * intensity);
      workouts.push({
        date: iso, kind: 'run', targetMin: miles, targetMax: miles,
        isOverride: false, note: null,
      });
      continue;
    }

    // Saturday: long run
    const phase = getPhase(date, half, marathon);
    const miles = Math.round(longRunMiles(date, phase, half, marathon, config));
    workouts.push({
      date: iso, kind: 'run', targetMin: miles, targetMax: miles,
      isOverride: false, note: 'Long run',
    });
  }

  for (const race of [half, marathon]) {
    const raceDate = parseISO(race.date);
    if (diffDays(raceDate, start) < 0 || diffDays(raceDate, end) > 0) continue;
    const raceWorkout: PlannedWorkout = {
      date: race.date,
      kind: 'race',
      targetMin: race.distanceMiles,
      targetMax: race.distanceMiles,
      isOverride: false,
      note: race.name === 'half' ? 'Half Marathon Race Day' : 'Marathon Race Day',
    };
    const idx = workouts.findIndex(w => w.date === race.date);
    if (idx >= 0) workouts[idx] = raceWorkout;
    else workouts.push(raceWorkout);
  }

  workouts.sort((a, b) => (a.date < b.date ? -1 : 1));
  return workouts;
}

export function applyOverrides(
  generated: PlannedWorkout[], existing: PlannedWorkout[],
): PlannedWorkout[] {
  const overrideMap = new Map(
    existing.filter(w => w.isOverride).map(w => [w.date, w]),
  );
  return generated.map(w => overrideMap.get(w.date) ?? w);
}
