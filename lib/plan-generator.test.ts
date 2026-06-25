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
