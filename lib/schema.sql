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
