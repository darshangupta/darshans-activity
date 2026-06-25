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
  let minutes = Math.floor(paceSecondsPerMi / 60);
  let seconds = Math.round(paceSecondsPerMi % 60);
  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }
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
