# Darshan's Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive Next.js web app that auto-generates a running plan toward a half marathon (Aug 16, 2026) and marathon (Dec 25, 2026), syncs run data from Strava daily, lets Darshan log lifting/boxing, and gives full editing control over the plan — deployed to Vercel.

**Architecture:** Next.js 16 App Router on Vercel, Vercel Postgres for storage, a pure-function plan generator (no DB dependency, fully unit tested), a dedicated server-side Strava REST API integration (separate from any MCP-based Strava connection) synced via Vercel Cron, and a custom shadcn/ui-styled calendar UI.

**Tech Stack:** Next.js 16, TypeScript, Tailwind 4, shadcn/ui, @vercel/postgres, Vitest, date-fns (UI display only).

---

## Task 1: Scaffold Project + Git + GitHub

**Files:**
- Create: `darshans-activity/` (Next.js project root, already exists as an empty git repo with `docs/`)

- [ ] **Step 1: Scaffold Next.js into the existing directory**

```bash
cd /Users/darshangupta/dev/darshans-activity
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --turbopack --use-npm --yes
```

If it warns the directory isn't empty (because of `docs/`), proceed anyway — it only refuses on conflicting files, not extra ones.

**Step 2: Verify dev server boots**

```bash
npm run dev -- --port 4400 &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4400
kill %1
```

Expected: `200`

- [ ] **Step 3: Commit scaffold**

```bash
git add -A
git commit -m "feat: scaffold Next.js project"
```

- [ ] **Step 4: Create GitHub repo and push**

```bash
gh repo create darshans-activity --public --source=. --remote=origin --push
```

---

## Task 2: Dependencies + shadcn/ui Setup

**Files:**
- Modify: `package.json`
- Create: `components/ui/*` (via shadcn CLI)

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
cd /Users/darshangupta/dev/darshans-activity
npm install @vercel/postgres date-fns
npm install -D vitest
```

- [ ] **Step 2: Add test script**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 3: Init shadcn/ui**

```bash
npx shadcn@latest init -y -b neutral
```

- [ ] **Step 4: Add the components this app uses**

```bash
npx shadcn@latest add button card input label switch dialog badge textarea select
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add dependencies and shadcn/ui components"
```

---

## Task 3: Types & Default Plan Config

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// lib/types.ts

export type RaceName = 'half' | 'marathon';

export interface Race {
  name: RaceName;
  date: string; // ISO yyyy-MM-dd
  distanceMiles: number;
}

export const RACES: Race[] = [
  { name: 'half', date: '2026-08-16', distanceMiles: 13.1 },
  { name: 'marathon', date: '2026-12-25', distanceMiles: 26.2 },
];

export type WorkoutKind = 'run' | 'open' | 'race';

export interface PlannedWorkout {
  date: string; // ISO yyyy-MM-dd, primary key
  kind: WorkoutKind;
  targetMin: number | null;
  targetMax: number | null;
  isOverride: boolean;
  note: string | null;
}

export type Weekday =
  | 'sunday' | 'monday' | 'tuesday' | 'wednesday'
  | 'thursday' | 'friday' | 'saturday';

export interface WeekdayRunConfig {
  kind: 'run';
  min: number;
  max: number;
}

export interface WeekdayOpenConfig {
  kind: 'open';
}

export type WeekdayConfig = WeekdayRunConfig | WeekdayOpenConfig;

export interface LongRunConfig {
  halfStartMiles: number;
  halfRampPerWeek: number;
  halfTaperFactors: number[]; // index 0 = Saturday closest to half race day
  recoveryWeekMiles: number;
  marathonRampPerWeek: number;
  marathonPeakMiles: number;
  marathonTaperFactors: number[]; // index 0 = Saturday closest to marathon race day
}

export interface PlanConfig {
  startDate: string; // ISO yyyy-MM-dd, must be a Monday
  weeklyTemplate: Record<Weekday, WeekdayConfig>;
  longRun: LongRunConfig;
}

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  startDate: '2026-06-22',
  weeklyTemplate: {
    sunday: { kind: 'open' },
    monday: { kind: 'run', min: 3, max: 3 },
    tuesday: { kind: 'open' },
    wednesday: { kind: 'run', min: 3, max: 5 },
    thursday: { kind: 'open' },
    friday: { kind: 'open' },
    saturday: { kind: 'run', min: 0, max: 0 }, // long run miles computed dynamically, bounds unused
  },
  longRun: {
    halfStartMiles: 6,
    halfRampPerWeek: 1,
    halfTaperFactors: [0.5, 0.7],
    recoveryWeekMiles: 5,
    marathonRampPerWeek: 1,
    marathonPeakMiles: 20,
    marathonTaperFactors: [0.3, 0.5, 0.7],
  },
};

export interface StravaSplit {
  mile: number;
  distanceMi: number;
  movingTimeS: number;
  avgPace: string; // "M:SS"
}

export interface StravaActivity {
  stravaId: string;
  date: string; // ISO yyyy-MM-dd
  distanceMi: number;
  movingTimeS: number;
  avgPace: string; // "M:SS"
  splits: StravaSplit[];
  syncedAt: string; // ISO timestamp
}

export type StrengthActivityType = 'lift' | 'box';

export interface StrengthLog {
  id: number;
  date: string; // ISO yyyy-MM-dd
  activityType: StrengthActivityType;
  durationMin: number | null;
  note: string | null;
  createdAt: string; // ISO timestamp
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add core types and default plan config"
```

---

## Task 4: Plan Generator Algorithm (TDD)

This is the heart of the app: a pure function that takes config + race dates + a date range and produces the day-by-day plan. No DB, no network — fully unit-testable.

**Files:**
- Create: `lib/plan-generator.ts`
- Test: `lib/plan-generator.test.ts`

**Step 1: Write failing tests for date helpers and open days**

- [ ] Write this test file:

```typescript
// lib/plan-generator.test.ts
import { describe, it, expect } from 'vitest';
import { generatePlan } from './plan-generator';
import { RACES, DEFAULT_PLAN_CONFIG } from './types';

describe('generatePlan - open days', () => {
  it('marks non-template weekdays as open with no target', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-06-28');
    const tuesday = plan.find(w => w.date === '2026-06-23');
    expect(tuesday).toEqual({
      date: '2026-06-23',
      kind: 'open',
      targetMin: null,
      targetMax: null,
      isOverride: false,
      note: null,
    });
  });

  it('returns one row per day in the range, inclusive', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-06-28');
    expect(plan).toHaveLength(7);
    expect(plan[0].date).toBe('2026-06-22');
    expect(plan[6].date).toBe('2026-06-28');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npx vitest run lib/plan-generator.test.ts
```

Expected: FAIL — `Cannot find module './plan-generator'`

- [ ] **Step 3: Implement date helpers + skeleton + open-day handling**

```typescript
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
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
npx vitest run lib/plan-generator.test.ts
```

Expected: 2 passing (the run-day rows aren't asserted yet, so the stub `targetMin: null` doesn't break anything).

- [ ] **Step 5: Commit**

```bash
git add lib/plan-generator.ts lib/plan-generator.test.ts
git commit -m "feat: plan generator skeleton with open-day handling"
```

---

**Step 6: Write failing tests for phase classification and Monday/Wednesday runs**

- [ ] Add to `lib/plan-generator.test.ts`:

```typescript
describe('generatePlan - fixed weekday runs', () => {
  it('Monday is always a flat 3mi run regardless of phase', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const buildMonday = plan.find(w => w.date === '2026-06-22'); // half-build
    const taperMonday = plan.find(w => w.date === '2026-12-21'); // marathon-taper
    expect(buildMonday).toMatchObject({ kind: 'run', targetMin: 3, targetMax: 3 });
    expect(taperMonday).toMatchObject({ kind: 'run', targetMin: 3, targetMax: 3 });
  });

  it('Wednesday scales to the top of its range during build phases', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const buildWed = plan.find(w => w.date === '2026-06-24'); // half-build
    expect(buildWed).toMatchObject({ kind: 'run', targetMin: 5, targetMax: 5 });
  });

  it('Wednesday scales to the bottom of its range during taper/recovery', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const taperWed = plan.find(w => w.date === '2026-08-12'); // half-taper
    const recoveryWed = plan.find(w => w.date === '2026-08-19'); // recovery
    expect(taperWed).toMatchObject({ kind: 'run', targetMin: 3, targetMax: 3 });
    expect(recoveryWed).toMatchObject({ kind: 'run', targetMin: 3, targetMax: 3 });
  });
});
```

- [ ] **Step 7: Run, confirm failure**

```bash
npx vitest run lib/plan-generator.test.ts
```

Expected: FAIL on the new `toMatchObject` assertions (targets are currently `null`).

- [ ] **Step 8: Implement phase classification + Monday/Wednesday scaling**

Replace the run-day branch in `generatePlan` and add phase logic:

```typescript
// Add below diffDays/isSameDate, above generatePlan:

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
```

Now update the run-day branch inside the loop in `generatePlan`:

```typescript
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

    // Saturday placeholder — long run logic added in the next step
    workouts.push({
      date: iso, kind: 'run', targetMin: null, targetMax: null,
      isOverride: false, note: 'Long run',
    });
```

- [ ] **Step 9: Run tests, confirm pass**

```bash
npx vitest run lib/plan-generator.test.ts
```

Expected: all passing.

- [ ] **Step 10: Commit**

```bash
git add lib/plan-generator.ts lib/plan-generator.test.ts
git commit -m "feat: phase classification and Monday/Wednesday run scaling"
```

---

**Step 11: Write failing tests for the long-run progression**

- [ ] Add to `lib/plan-generator.test.ts`:

```typescript
describe('generatePlan - long run progression', () => {
  it('ramps up during half build', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const map = Object.fromEntries(plan.map(w => [w.date, w]));
    expect(map['2026-06-27']).toMatchObject({ targetMin: 6, targetMax: 6 });   // week 0
    expect(map['2026-07-25']).toMatchObject({ targetMin: 10, targetMax: 10 }); // week 4
    expect(map['2026-08-01']).toMatchObject({ targetMin: 11, targetMax: 11 }); // week 5, peak
  });

  it('tapers in the two weeks before the half', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const map = Object.fromEntries(plan.map(w => [w.date, w]));
    expect(map['2026-08-08']).toMatchObject({ targetMin: 8, targetMax: 8 }); // 11 * 0.7
    expect(map['2026-08-15']).toMatchObject({ targetMin: 6, targetMax: 6 }); // 11 * 0.5
  });

  it('drops to recovery mileage the week after the half', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const map = Object.fromEntries(plan.map(w => [w.date, w]));
    expect(map['2026-08-22']).toMatchObject({ targetMin: 5, targetMax: 5 });
  });

  it('resumes ramping for the marathon build and caps at the peak', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const map = Object.fromEntries(plan.map(w => [w.date, w]));
    expect(map['2026-08-29']).toMatchObject({ targetMin: 6, targetMax: 6 });   // build week 1
    expect(map['2026-11-28']).toMatchObject({ targetMin: 19, targetMax: 19 }); // build week 14, peak before taper
  });

  it('tapers in the three weeks before the marathon', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const map = Object.fromEntries(plan.map(w => [w.date, w]));
    expect(map['2026-12-05']).toMatchObject({ targetMin: 13, targetMax: 13 }); // 19 * 0.7
    expect(map['2026-12-12']).toMatchObject({ targetMin: 10, targetMax: 10 }); // 19 * 0.5
    expect(map['2026-12-19']).toMatchObject({ targetMin: 6, targetMax: 6 });   // 19 * 0.3
  });
});
```

- [ ] **Step 12: Run, confirm failure** (Saturday rows are still the `null` placeholder)

```bash
npx vitest run lib/plan-generator.test.ts
```

- [ ] **Step 13: Implement long-run progression**

Add these helpers above `generatePlan`:

```typescript
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
```

Now replace the Saturday placeholder branch in `generatePlan`:

```typescript
    // Saturday: long run
    const phase = getPhase(date, half, marathon);
    const miles = Math.round(longRunMiles(date, phase, half, marathon, config));
    workouts.push({
      date: iso, kind: 'run', targetMin: miles, targetMax: miles,
      isOverride: false, note: 'Long run',
    });
```

- [ ] **Step 14: Run tests, confirm pass**

```bash
npx vitest run lib/plan-generator.test.ts
```

Expected: all passing.

- [ ] **Step 15: Commit**

```bash
git add lib/plan-generator.ts lib/plan-generator.test.ts
git commit -m "feat: long run progression with ramp and taper"
```

---

**Step 16: Write failing tests for race day overlay and override merging**

- [ ] Add to `lib/plan-generator.test.ts`:

```typescript
import { applyOverrides } from './plan-generator';

describe('generatePlan - race days', () => {
  it('overlays the half marathon on its date, overriding the weekday template', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const raceDay = plan.find(w => w.date === '2026-08-16'); // a Sunday, normally 'open'
    expect(raceDay).toMatchObject({
      kind: 'race', targetMin: 13.1, targetMax: 13.1, note: 'Half Marathon Race Day',
    });
  });

  it('overlays the marathon on its date, overriding the weekday template', () => {
    const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, '2026-06-22', '2026-12-25');
    const raceDay = plan.find(w => w.date === '2026-12-25'); // a Friday, normally 'open'
    expect(raceDay).toMatchObject({
      kind: 'race', targetMin: 26.2, targetMax: 26.2, note: 'Marathon Race Day',
    });
  });
});

describe('applyOverrides', () => {
  it('keeps user-edited rows and discards stale generated rows for the same date', () => {
    const generated = [
      { date: '2026-06-22', kind: 'run' as const, targetMin: 3, targetMax: 3, isOverride: false, note: null },
      { date: '2026-06-23', kind: 'open' as const, targetMin: null, targetMax: null, isOverride: false, note: null },
    ];
    const existing = [
      { date: '2026-06-22', kind: 'run' as const, targetMin: 8, targetMax: 8, isOverride: true, note: 'felt good, extended it' },
    ];
    const merged = applyOverrides(generated, existing);
    expect(merged.find(w => w.date === '2026-06-22')).toEqual(existing[0]);
    expect(merged.find(w => w.date === '2026-06-23')).toEqual(generated[1]);
  });
});
```

- [ ] **Step 17: Run, confirm failure**

```bash
npx vitest run lib/plan-generator.test.ts
```

Expected: FAIL — race days still show the weekday template result, and `applyOverrides` doesn't exist yet.

- [ ] **Step 18: Implement race overlay and override merging**

At the end of `generatePlan`, before the final return, add the race overlay:

```typescript
  for (const race of [half, marathon]) {
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
```

Add `applyOverrides` as a new exported function at the bottom of the file:

```typescript
export function applyOverrides(
  generated: PlannedWorkout[], existing: PlannedWorkout[],
): PlannedWorkout[] {
  const overrideMap = new Map(
    existing.filter(w => w.isOverride).map(w => [w.date, w]),
  );
  return generated.map(w => overrideMap.get(w.date) ?? w);
}
```

- [ ] **Step 19: Run full test suite, confirm all pass**

```bash
npx vitest run lib/plan-generator.test.ts
```

Expected: all tests passing.

- [ ] **Step 20: Commit**

```bash
git add lib/plan-generator.ts lib/plan-generator.test.ts
git commit -m "feat: race day overlay and override merging"
```

---

## Task 5: Database Schema + Connection Helper

**Files:**
- Create: `lib/schema.sql`
- Create: `lib/db.ts`
- Create: `scripts/apply-schema.ts`

- [ ] **Step 1: Write the schema**

```sql
-- lib/schema.sql
CREATE TABLE IF NOT EXISTS races (
  name TEXT PRIMARY KEY,
  date DATE NOT NULL,
  distance_miles NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  config JSONB NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS planned_workouts (
  date DATE PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('run', 'open', 'race')),
  target_min NUMERIC,
  target_max NUMERIC,
  is_override BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT
);

CREATE TABLE IF NOT EXISTS strava_activities (
  strava_id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  distance_mi NUMERIC NOT NULL,
  moving_time_s INTEGER NOT NULL,
  avg_pace TEXT NOT NULL,
  splits JSONB NOT NULL DEFAULT '[]',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strength_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('lift', 'box')),
  duration_min INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strava_tokens (
  id INTEGER PRIMARY KEY DEFAULT 1,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);
```

- [ ] **Step 2: Write the DB connection/query helper**

```typescript
// lib/db.ts
import { sql } from '@vercel/postgres';
import {
  PlanConfig, PlannedWorkout, StravaActivity, StrengthLog,
  StrengthActivityType, Race,
} from './types';

export async function getRaces(): Promise<Race[]> {
  const { rows } = await sql`SELECT name, date, distance_miles FROM races`;
  return rows.map(r => ({
    name: r.name, date: r.date.toISOString().slice(0, 10),
    distanceMiles: Number(r.distance_miles),
  }));
}

export async function getPlanConfig(): Promise<PlanConfig | null> {
  const { rows } = await sql`SELECT config FROM plan_config WHERE id = 1`;
  return rows[0]?.config ?? null;
}

export async function savePlanConfig(config: PlanConfig): Promise<void> {
  await sql`
    INSERT INTO plan_config (id, config) VALUES (1, ${JSON.stringify(config)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET config = ${JSON.stringify(config)}::jsonb
  `;
}

export async function getPlannedWorkouts(start: string, end: string): Promise<PlannedWorkout[]> {
  const { rows } = await sql`
    SELECT date, kind, target_min, target_max, is_override, note
    FROM planned_workouts WHERE date BETWEEN ${start} AND ${end}
    ORDER BY date
  `;
  return rows.map(r => ({
    date: r.date.toISOString().slice(0, 10),
    kind: r.kind,
    targetMin: r.target_min === null ? null : Number(r.target_min),
    targetMax: r.target_max === null ? null : Number(r.target_max),
    isOverride: r.is_override,
    note: r.note,
  }));
}

export async function replacePlannedWorkouts(workouts: PlannedWorkout[]): Promise<void> {
  for (const w of workouts) {
    await sql`
      INSERT INTO planned_workouts (date, kind, target_min, target_max, is_override, note)
      VALUES (${w.date}, ${w.kind}, ${w.targetMin}, ${w.targetMax}, ${w.isOverride}, ${w.note})
      ON CONFLICT (date) DO UPDATE SET
        kind = ${w.kind}, target_min = ${w.targetMin}, target_max = ${w.targetMax},
        is_override = ${w.isOverride}, note = ${w.note}
    `;
  }
}

export async function setWorkoutOverride(workout: PlannedWorkout): Promise<void> {
  await replacePlannedWorkouts([{ ...workout, isOverride: true }]);
}

export async function getStravaActivities(start: string, end: string): Promise<StravaActivity[]> {
  const { rows } = await sql`
    SELECT strava_id, date, distance_mi, moving_time_s, avg_pace, splits, synced_at
    FROM strava_activities WHERE date BETWEEN ${start} AND ${end}
    ORDER BY date
  `;
  return rows.map(r => ({
    stravaId: r.strava_id, date: r.date.toISOString().slice(0, 10),
    distanceMi: Number(r.distance_mi), movingTimeS: r.moving_time_s,
    avgPace: r.avg_pace, splits: r.splits, syncedAt: r.synced_at.toISOString(),
  }));
}

export async function upsertStravaActivity(activity: Omit<StravaActivity, 'syncedAt'>): Promise<void> {
  await sql`
    INSERT INTO strava_activities (strava_id, date, distance_mi, moving_time_s, avg_pace, splits)
    VALUES (
      ${activity.stravaId}, ${activity.date}, ${activity.distanceMi},
      ${activity.movingTimeS}, ${activity.avgPace}, ${JSON.stringify(activity.splits)}::jsonb
    )
    ON CONFLICT (strava_id) DO UPDATE SET
      date = ${activity.date}, distance_mi = ${activity.distanceMi},
      moving_time_s = ${activity.movingTimeS}, avg_pace = ${activity.avgPace},
      splits = ${JSON.stringify(activity.splits)}::jsonb, synced_at = now()
  `;
}

export async function getLastSyncedDate(): Promise<string | null> {
  const { rows } = await sql`SELECT MAX(date) as max_date FROM strava_activities`;
  return rows[0]?.max_date ? rows[0].max_date.toISOString().slice(0, 10) : null;
}

export async function getStrengthLogs(start: string, end: string): Promise<StrengthLog[]> {
  const { rows } = await sql`
    SELECT id, date, activity_type, duration_min, note, created_at
    FROM strength_logs WHERE date BETWEEN ${start} AND ${end}
    ORDER BY date
  `;
  return rows.map(r => ({
    id: r.id, date: r.date.toISOString().slice(0, 10), activityType: r.activity_type,
    durationMin: r.duration_min, note: r.note, createdAt: r.created_at.toISOString(),
  }));
}

export async function createStrengthLog(
  date: string, activityType: StrengthActivityType, durationMin: number | null, note: string | null,
): Promise<StrengthLog> {
  const { rows } = await sql`
    INSERT INTO strength_logs (date, activity_type, duration_min, note)
    VALUES (${date}, ${activityType}, ${durationMin}, ${note})
    RETURNING id, date, activity_type, duration_min, note, created_at
  `;
  const r = rows[0];
  return {
    id: r.id, date: r.date.toISOString().slice(0, 10), activityType: r.activity_type,
    durationMin: r.duration_min, note: r.note, createdAt: r.created_at.toISOString(),
  };
}

export async function getStravaTokens(): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
  const { rows } = await sql`SELECT access_token, refresh_token, expires_at FROM strava_tokens WHERE id = 1`;
  if (!rows[0]) return null;
  return {
    accessToken: rows[0].access_token, refreshToken: rows[0].refresh_token,
    expiresAt: Number(rows[0].expires_at),
  };
}

export async function saveStravaTokens(accessToken: string, refreshToken: string, expiresAt: number): Promise<void> {
  await sql`
    INSERT INTO strava_tokens (id, access_token, refresh_token, expires_at)
    VALUES (1, ${accessToken}, ${refreshToken}, ${expiresAt})
    ON CONFLICT (id) DO UPDATE SET
      access_token = ${accessToken}, refresh_token = ${refreshToken}, expires_at = ${expiresAt}
  `;
}
```

- [ ] **Step 3: Write a script to apply the schema**

```typescript
// scripts/apply-schema.ts
import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const schema = readFileSync(join(process.cwd(), 'lib/schema.sql'), 'utf-8');
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log('Schema applied.');
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 4: Commit**

```bash
git add lib/schema.sql lib/db.ts scripts/apply-schema.ts
git commit -m "feat: database schema and query helpers"
```

> **Note for the engineer running this:** `scripts/apply-schema.ts` needs `POSTGRES_URL` set (from a Vercel Postgres database — create one via the Vercel dashboard or `vercel storage create`, then `vercel env pull .env.local` to get the connection string locally). This requires your own Vercel login; run it once you've created the database, via `npx tsx scripts/apply-schema.ts`.

---

## Task 6: Seed Script

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Write the seed script**

```typescript
// scripts/seed.ts
import { sql } from '@vercel/postgres';
import { generatePlan } from '../lib/plan-generator';
import { DEFAULT_PLAN_CONFIG, RACES } from '../lib/types';
import { savePlanConfig, replacePlannedWorkouts } from '../lib/db';

async function main() {
  for (const race of RACES) {
    await sql`
      INSERT INTO races (name, date, distance_miles)
      VALUES (${race.name}, ${race.date}, ${race.distanceMiles})
      ON CONFLICT (name) DO UPDATE SET date = ${race.date}, distance_miles = ${race.distanceMiles}
    `;
  }

  await savePlanConfig(DEFAULT_PLAN_CONFIG);

  const plan = generatePlan(DEFAULT_PLAN_CONFIG, RACES, DEFAULT_PLAN_CONFIG.startDate, RACES[1].date);
  await replacePlannedWorkouts(plan);

  console.log(`Seeded ${plan.length} planned workouts.`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run it (after the schema is applied — requires `POSTGRES_URL`)**

```bash
npx tsx scripts/seed.ts
```

Expected: `Seeded 187 planned workouts.`

- [ ] **Step 3: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: seed script for races, plan config, and initial plan"
```

---

## Task 7: Workouts API

**Files:**
- Create: `app/api/workouts/route.ts`
- Create: `app/api/workouts/[date]/route.ts`

- [ ] **Step 1: GET list endpoint**

```typescript
// app/api/workouts/route.ts
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
```

- [ ] **Step 2: PATCH override endpoint**

```typescript
// app/api/workouts/[date]/route.ts
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
```

- [ ] **Step 3: Commit**

```bash
git add app/api/workouts
git commit -m "feat: workouts API - list and override endpoints"
```

---

## Task 8: Plan Config API

**Files:**
- Create: `app/api/plan-config/route.ts`

- [ ] **Step 1: GET/PUT endpoint with regeneration**

```typescript
// app/api/plan-config/route.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/plan-config
git commit -m "feat: plan config API with regeneration on save"
```

---

## Task 9: Strava Client + OAuth Routes

This is a **dedicated Strava API integration for the web app** — separate from any Claude/MCP Strava connection. It needs its own app registration.

**Files:**
- Create: `lib/strava-client.ts`
- Create: `app/api/strava/connect/route.ts`
- Create: `app/api/strava/callback/route.ts`

- [ ] **Step 1: Register a Strava API app**

Go to https://www.strava.com/settings/api, create an app, note the `Client ID` and `Client Secret`. Set the "Authorization Callback Domain" to your Vercel deployment's domain (and `localhost` for local dev).

Add to `.env.local`:

```
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=http://localhost:3000/api/strava/callback
```

(In Vercel, set the same vars in Project Settings → Environment Variables, with `STRAVA_REDIRECT_URI` pointing at the deployed callback URL.)

- [ ] **Step 2: Write the Strava client**

```typescript
// lib/strava-client.ts
import { getStravaTokens, saveStravaTokens } from './db';

const STRAVA_OAUTH_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export function getAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const res = await fetch(STRAVA_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  const data = await res.json() as TokenResponse;
  await saveStravaTokens(data.access_token, data.refresh_token, data.expires_at);
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(STRAVA_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  return res.json() as Promise<TokenResponse>;
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = await getStravaTokens();
  if (!tokens) throw new Error('No Strava tokens stored — connect via /api/strava/connect first');

  const nowEpoch = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt > nowEpoch + 60) return tokens.accessToken;

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  await saveStravaTokens(refreshed.access_token, refreshed.refresh_token, refreshed.expires_at);
  return refreshed.access_token;
}

export interface StravaActivitySummary {
  id: number;
  type: string;
  start_date_local: string;
  distance: number; // meters
  moving_time: number; // seconds
}

export async function fetchActivitiesSince(accessToken: string, afterEpochSeconds: number): Promise<StravaActivitySummary[]> {
  const params = new URLSearchParams({ after: String(afterEpochSeconds), per_page: '50' });
  const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`);
  return res.json() as Promise<StravaActivitySummary[]>;
}

export interface StravaSplitStandard {
  distance: number; // meters
  moving_time: number; // seconds
}

export interface StravaActivityDetail extends StravaActivitySummary {
  splits_standard?: StravaSplitStandard[];
}

export async function fetchActivityDetail(accessToken: string, id: number): Promise<StravaActivityDetail> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activity detail fetch failed: ${res.status}`);
  return res.json() as Promise<StravaActivityDetail>;
}

export function formatPace(movingTimeS: number, distanceMeters: number): string {
  if (distanceMeters <= 0) return '0:00';
  const distanceMi = distanceMeters / 1609.34;
  const paceSecondsPerMi = movingTimeS / distanceMi;
  const minutes = Math.floor(paceSecondsPerMi / 60);
  const seconds = Math.round(paceSecondsPerMi % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function filterRuns(activities: StravaActivitySummary[]): StravaActivitySummary[] {
  return activities.filter(a => a.type === 'Run');
}

export interface UpsertableActivity {
  stravaId: string;
  date: string;
  distanceMi: number;
  movingTimeS: number;
  avgPace: string;
  splits: import('./types').StravaSplit[];
}

export function toStravaActivity(detail: StravaActivityDetail): UpsertableActivity {
  const splits = (detail.splits_standard ?? []).map((s, i) => ({
    mile: i + 1,
    distanceMi: s.distance / 1609.34,
    movingTimeS: s.moving_time,
    avgPace: formatPace(s.moving_time, s.distance),
  }));

  return {
    stravaId: String(detail.id),
    date: detail.start_date_local.slice(0, 10),
    distanceMi: detail.distance / 1609.34,
    movingTimeS: detail.moving_time,
    avgPace: formatPace(detail.moving_time, detail.distance),
    splits,
  };
}
```

- [ ] **Step 3: Write tests for the pure transform/filter logic**

```typescript
// lib/strava-client.test.ts
import { describe, it, expect } from 'vitest';
import { filterRuns, toStravaActivity, formatPace, StravaActivityDetail, StravaActivitySummary } from './strava-client';

describe('filterRuns', () => {
  it('keeps only activities of type Run', () => {
    const activities: StravaActivitySummary[] = [
      { id: 1, type: 'Run', start_date_local: '2026-06-24T06:00:00Z', distance: 8000, moving_time: 2400 },
      { id: 2, type: 'Ride', start_date_local: '2026-06-24T06:00:00Z', distance: 20000, moving_time: 3600 },
    ];
    expect(filterRuns(activities)).toEqual([activities[0]]);
  });
});

describe('formatPace', () => {
  it('formats meters/seconds into M:SS per mile', () => {
    // 1609.34m (1mi) in 480s (8:00) -> "8:00"
    expect(formatPace(480, 1609.34)).toBe('8:00');
  });
});

describe('toStravaActivity', () => {
  it('converts a Strava activity detail into our storage shape, including mile splits', () => {
    const detail: StravaActivityDetail = {
      id: 12345,
      type: 'Run',
      start_date_local: '2026-06-24T06:15:00-04:00',
      distance: 4828.02, // 3mi
      moving_time: 1440, // 24:00 -> 8:00/mi
      splits_standard: [
        { distance: 1609.34, moving_time: 480 },
        { distance: 1609.34, moving_time: 480 },
        { distance: 1609.34, moving_time: 480 },
      ],
    };

    const result = toStravaActivity(detail);

    expect(result.stravaId).toBe('12345');
    expect(result.date).toBe('2026-06-24');
    expect(result.distanceMi).toBeCloseTo(3, 1);
    expect(result.avgPace).toBe('8:00');
    expect(result.splits).toEqual([
      { mile: 1, distanceMi: expect.closeTo(1, 1), movingTimeS: 480, avgPace: '8:00' },
      { mile: 2, distanceMi: expect.closeTo(1, 1), movingTimeS: 480, avgPace: '8:00' },
      { mile: 3, distanceMi: expect.closeTo(1, 1), movingTimeS: 480, avgPace: '8:00' },
    ]);
  });
});
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
npx vitest run lib/strava-client.test.ts
```

Expected: all passing. (`formatPace`, `filterRuns`, `toStravaActivity` already exist from Step 2, so this confirms the existing implementation rather than driving new code — that's fine here since they're small pure functions extracted alongside the client.)

- [ ] **Step 5: OAuth connect + callback routes**

```typescript
// app/api/strava/connect/route.ts
import { NextResponse } from 'next/server';
import { getAuthorizeUrl } from '@/lib/strava-client';

export async function GET() {
  return NextResponse.redirect(getAuthorizeUrl());
}
```

```typescript
// app/api/strava/callback/route.ts
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
```

- [ ] **Step 6: Commit**

```bash
git add lib/strava-client.ts lib/strava-client.test.ts app/api/strava/connect app/api/strava/callback
git commit -m "feat: Strava OAuth client, transform helpers, and connect/callback routes"
```

---

## Task 10: Strava Sync Route + Cron

**Files:**
- Create: `app/api/strava/sync/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Write the sync route**

```typescript
// app/api/strava/sync/route.ts
import { NextResponse } from 'next/server';
import { getValidAccessToken, fetchActivitiesSince, fetchActivityDetail, filterRuns, toStravaActivity } from '@/lib/strava-client';
import { getLastSyncedDate, upsertStravaActivity } from '@/lib/db';

const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

export async function GET() {
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
```

- [ ] **Step 2: Configure Vercel Cron**

```json
// vercel.json
{
  "crons": [
    { "path": "/api/strava/sync", "schedule": "0 11 * * *" }
  ]
}
```

(`0 11 * * *` is 6am Eastern in UTC during EDT — adjust if needed; Vercel Cron runs in UTC.)

- [ ] **Step 3: Commit**

```bash
git add app/api/strava/sync vercel.json
git commit -m "feat: Strava sync route and daily cron schedule"
```

---

## Task 11: Strength Logs API

**Files:**
- Create: `app/api/strength-logs/route.ts`

- [ ] **Step 1: POST endpoint**

```typescript
// app/api/strength-logs/route.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/strength-logs
git commit -m "feat: strength logs API"
```

---

## Task 12: Calendar UI — Month Grid

**Files:**
- Create: `components/calendar/MonthGrid.tsx`
- Create: `components/calendar/DayCell.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: DayCell component**

```typescript
// components/calendar/DayCell.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PlannedWorkout, StravaActivity, StrengthLog } from '@/lib/types';

interface Props {
  date: string;
  dayOfMonth: number;
  isToday: boolean;
  workout?: PlannedWorkout;
  activity?: StravaActivity;
  strengthLog?: StrengthLog;
  onSelect: (date: string) => void;
}

export function DayCell({ date, dayOfMonth, isToday, workout, activity, strengthLog, onSelect }: Props) {
  const color =
    workout?.kind === 'race' ? 'bg-purple-100 border-purple-400' :
    workout?.kind === 'run' ? 'bg-blue-50 border-blue-300' :
    'bg-neutral-50 border-neutral-200';

  return (
    <button
      onClick={() => onSelect(date)}
      className={cn(
        'flex flex-col gap-1 rounded-md border p-2 text-left text-xs min-h-20 hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 transition',
        color,
        isToday && 'ring-2 ring-blue-500',
      )}
    >
      <span className="font-semibold">{dayOfMonth}</span>
      {workout?.kind === 'run' && (
        <Badge variant="secondary">{activity ? `${activity.distanceMi.toFixed(1)}mi run` : `${workout.targetMin}mi planned`}</Badge>
      )}
      {workout?.kind === 'race' && <Badge>{workout.note}</Badge>}
      {strengthLog && <Badge variant="outline">{strengthLog.activityType}</Badge>}
    </button>
  );
}
```

- [ ] **Step 2: MonthGrid component**

```typescript
// components/calendar/MonthGrid.tsx
'use client';

import { DayCell } from './DayCell';
import { PlannedWorkout, StravaActivity, StrengthLog } from '@/lib/types';

interface Props {
  year: number;
  month: number; // 0-indexed
  workouts: PlannedWorkout[];
  activities: StravaActivity[];
  strengthLogs: StrengthLog[];
  onSelectDay: (date: string) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthGrid({ year, month, workouts, activities, strengthLogs, onSelectDay }: Props) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay();
  const todayIso = new Date().toISOString().slice(0, 10);

  const workoutByDate = new Map(workouts.map(w => [w.date, w]));
  const activityByDate = new Map(activities.map(a => [a.date, a]));
  const strengthByDate = new Map(strengthLogs.map(s => [s.date, s]));

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(<div key={`blank-${i}`} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push(
      <DayCell
        key={iso}
        date={iso}
        dayOfMonth={day}
        isToday={iso === todayIso}
        workout={workoutByDate.get(iso)}
        activity={activityByDate.get(iso)}
        strengthLog={strengthByDate.get(iso)}
        onSelect={onSelectDay}
      />,
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {WEEKDAY_LABELS.map(label => (
        <div key={label} className="text-center text-xs font-medium text-neutral-500">{label}</div>
      ))}
      {cells}
    </div>
  );
}
```

- [ ] **Step 3: Wire up the home page**

```typescript
// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { DayDetailPanel } from '@/components/calendar/DayDetailPanel';
import { PlannedWorkout, StravaActivity, StrengthLog } from '@/lib/types';

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export default function HomePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());
  const [workouts, setWorkouts] = useState<PlannedWorkout[]>([]);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [strengthLogs, setStrengthLogs] = useState<StrengthLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  function refresh() {
    const { start, end } = monthRange(year, month);
    fetch(`/api/workouts?start=${start}&end=${end}`)
      .then(res => res.json())
      .then(data => {
        setWorkouts(data.workouts);
        setActivities(data.activities);
        setStrengthLogs(data.strengthLogs);
      });
  }

  useEffect(refresh, [year, month]);

  async function syncNow() {
    setSyncing(true);
    await fetch('/api/strava/sync');
    refresh();
    setSyncing(false);
  }

  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  }

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="px-3 py-1 rounded border">←</button>
        <h1 className="text-lg font-semibold">
          {new Date(Date.UTC(year, month, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </h1>
        <button onClick={() => changeMonth(1)} className="px-3 py-1 rounded border">→</button>
      </div>

      <div className="flex justify-end mb-3">
        <button
          onClick={syncNow}
          disabled={syncing}
          className="text-sm px-3 py-1 rounded border disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync Strava now'}
        </button>
      </div>

      <MonthGrid
        year={year} month={month}
        workouts={workouts} activities={activities} strengthLogs={strengthLogs}
        onSelectDay={setSelectedDate}
      />

      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          workout={workouts.find(w => w.date === selectedDate)}
          activity={activities.find(a => a.date === selectedDate)}
          strengthLog={strengthLogs.find(s => s.date === selectedDate)}
          onClose={() => setSelectedDate(null)}
          onUpdated={refresh}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Verify it builds** (DayDetailPanel doesn't exist yet — created next task, so add a temporary stub to unblock this build check)

```bash
mkdir -p components/calendar
cat > components/calendar/DayDetailPanel.tsx << 'EOF'
'use client';
export function DayDetailPanel(_props: any) { return null; }
EOF
npm run build
```

Expected: build succeeds (TypeScript may warn on the `any` stub — that's fine, it's replaced next task).

- [ ] **Step 5: Commit**

```bash
git add components/calendar app/page.tsx
git commit -m "feat: calendar month grid on home page"
```

---

## Task 13: Day Detail Panel

**Files:**
- Modify: `components/calendar/DayDetailPanel.tsx` (replace the stub)

- [ ] **Step 1: Implement the real panel**

```typescript
// components/calendar/DayDetailPanel.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlannedWorkout, StravaActivity, StrengthLog, StrengthActivityType } from '@/lib/types';

interface Props {
  date: string;
  workout?: PlannedWorkout;
  activity?: StravaActivity;
  strengthLog?: StrengthLog;
  onClose: () => void;
  onUpdated: () => void;
}

export function DayDetailPanel({ date, workout, activity, strengthLog, onClose, onUpdated }: Props) {
  const [editMiles, setEditMiles] = useState(String(workout?.targetMin ?? ''));
  const [strengthType, setStrengthType] = useState<StrengthActivityType>('lift');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');

  async function saveOverride() {
    const miles = parseFloat(editMiles);
    await fetch(`/api/workouts/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'run', targetMin: miles, targetMax: miles, note: workout?.note ?? null }),
    });
    onUpdated();
  }

  async function saveStrengthLog() {
    await fetch('/api/strength-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, activityType: strengthType,
        durationMin: duration ? parseInt(duration, 10) : null,
        note: note || null,
      }),
    });
    onUpdated();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{date}</DialogTitle>
        </DialogHeader>

        {workout && workout.kind !== 'open' && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">
              Planned: {workout.targetMin}mi {workout.kind === 'race' ? `(${workout.note})` : ''}
            </p>
            {activity && (
              <div className="text-sm">
                <p>Actual: {activity.distanceMi.toFixed(1)}mi, {activity.avgPace}/mi avg</p>
                {activity.splits.length > 0 && (
                  <table className="w-full text-xs mt-2">
                    <thead><tr><th className="text-left">Mile</th><th className="text-left">Pace</th></tr></thead>
                    <tbody>
                      {activity.splits.map(s => (
                        <tr key={s.mile}><td>{s.mile}</td><td>{s.avgPace}/mi</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {workout.kind === 'run' && (
              <div className="flex gap-2 items-end">
                <Input value={editMiles} onChange={e => setEditMiles(e.target.value)} placeholder="Miles" className="w-24" />
                <Button onClick={saveOverride}>Update plan</Button>
              </div>
            )}
          </div>
        )}

        {(!workout || workout.kind === 'open') && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">Open day — log lifting or boxing if you did one.</p>
            {strengthLog ? (
              <p className="text-sm">Logged: {strengthLog.activityType} {strengthLog.durationMin ? `(${strengthLog.durationMin} min)` : ''} {strengthLog.note}</p>
            ) : (
              <>
                <Select value={strengthType} onValueChange={v => setStrengthType(v as StrengthActivityType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lift">Lift</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration (min)" type="number" />
                <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Notes" />
                <Button onClick={saveStrengthLog}>Log it</Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/calendar/DayDetailPanel.tsx
git commit -m "feat: day detail panel with plan editing and strength logging"
```

---

## Task 14: Settings Page

**Files:**
- Create: `app/settings/page.tsx`

- [ ] **Step 1: Implement the settings page**

```typescript
// app/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlanConfig, Weekday, WeekdayConfig } from '@/lib/types';

const EDITABLE_DAYS: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS: Record<Weekday, string> = {
  sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
};

export default function SettingsPage() {
  const [config, setConfig] = useState<PlanConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/plan-config').then(res => res.json()).then(data => setConfig(data.config));
  }, []);

  if (!config) return <main className="p-6">Loading...</main>;

  async function save() {
    setSaving(true);
    await fetch('/api/plan-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    setSaving(false);
  }

  function setDayConfig(day: Weekday, dayConfig: WeekdayConfig) {
    setConfig({ ...config, weeklyTemplate: { ...config.weeklyTemplate, [day]: dayConfig } });
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      <section className="space-y-3">
        <h2 className="font-medium">Weekly Template</h2>
        <p className="text-sm text-neutral-500">
          Saturday is always the long run — its mileage is calculated automatically from the race-day progression below. Every other day is yours to set.
        </p>

        {EDITABLE_DAYS.map(day => {
          const dayConfig = config.weeklyTemplate[day];
          return (
            <div key={day} className="grid grid-cols-4 gap-2 items-end border-b pb-3">
              <Label className="col-span-4 font-medium">{DAY_LABELS[day]}</Label>
              <Select
                value={dayConfig.kind}
                onValueChange={(kind) => setDayConfig(
                  day,
                  kind === 'run' ? { kind: 'run', min: 3, max: 3 } : { kind: 'open' },
                )}
              >
                <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="run">Run</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
              {dayConfig.kind === 'run' && (
                <>
                  <Input
                    type="number" placeholder="Min mi" value={dayConfig.min}
                    onChange={e => setDayConfig(day, { kind: 'run', min: Number(e.target.value), max: dayConfig.max })}
                  />
                  <Input
                    type="number" placeholder="Max mi" value={dayConfig.max}
                    onChange={e => setDayConfig(day, { kind: 'run', min: dayConfig.min, max: Number(e.target.value) })}
                  />
                </>
              )}
            </div>
          );
        })}

        <div className="text-sm text-neutral-500">Saturday: Long run (auto-calculated)</div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Long Run Algorithm</h2>
        <Label>Half build: start miles</Label>
        <Input type="number" value={config.longRun.halfStartMiles}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, halfStartMiles: Number(e.target.value) } })} />
        <Label>Half build: ramp per week</Label>
        <Input type="number" value={config.longRun.halfRampPerWeek}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, halfRampPerWeek: Number(e.target.value) } })} />
        <Label>Recovery week miles</Label>
        <Input type="number" value={config.longRun.recoveryWeekMiles}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, recoveryWeekMiles: Number(e.target.value) } })} />
        <Label>Marathon build: ramp per week</Label>
        <Input type="number" value={config.longRun.marathonRampPerWeek}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, marathonRampPerWeek: Number(e.target.value) } })} />
        <Label>Marathon peak miles (cap)</Label>
        <Input type="number" value={config.longRun.marathonPeakMiles}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, marathonPeakMiles: Number(e.target.value) } })} />
      </section>

      <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save & Regenerate Plan'}</Button>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/settings
git commit -m "feat: settings page for weekly template and algorithm tuning"
```

---

## Task 15: Mobile Responsiveness + Deploy

**Files:** none new — verification and deployment only.

- [ ] **Step 1: Manual responsive check**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser, use dev tools device toolbar to check at 375px width (iPhone SE) and 414px (iPhone Pro). Confirm:
- The month grid doesn't overflow horizontally (7 columns should compress, not scroll).
- The day detail dialog is readable and tappable on a small screen.
- The settings page inputs don't overflow.

If the grid feels cramped at 375px, reduce `DayCell`'s `min-h-20` to `min-h-16` and drop the badge text to icons-only below the `sm:` breakpoint — make that adjustment directly in `components/calendar/DayCell.tsx` if needed.

- [ ] **Step 2: Push final commit**

```bash
git add -A
git commit -m "chore: responsive polish" --allow-empty
git push
```

- [ ] **Step 3: Deploy to Vercel**

```bash
npx vercel link
npx vercel env add POSTGRES_URL
npx vercel env add STRAVA_CLIENT_ID
npx vercel env add STRAVA_CLIENT_SECRET
npx vercel env add STRAVA_REDIRECT_URI
npx vercel --prod
```

This requires your own Vercel login (`npx vercel login` first if not already authenticated) — run interactively, not something to script blindly.

- [ ] **Step 4: One-time Strava connect on the live site**

Visit `https://<your-deployment>.vercel.app/api/strava/connect`, authorize, confirm it redirects back with `?strava=connected`.

- [ ] **Step 5: Run the seed script against production**

```bash
npx tsx scripts/apply-schema.ts
npx tsx scripts/seed.ts
```

(Make sure `.env.local` has the production `POSTGRES_URL` pulled via `npx vercel env pull .env.local` first.)

- [ ] **Step 6: Text yourself the link**

Open the deployed URL on your phone to confirm it loads and is usable — this is the "text it to myself" use case.
