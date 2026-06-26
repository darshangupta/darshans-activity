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
