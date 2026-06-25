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
