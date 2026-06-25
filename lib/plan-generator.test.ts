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
