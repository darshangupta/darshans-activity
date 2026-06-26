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
