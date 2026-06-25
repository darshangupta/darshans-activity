# darshans-activity

A personal training tracker for a half marathon (Aug 16, 2026) and marathon (Dec 25, 2026). It generates a calendar-based training plan, syncs completed runs from Strava automatically, and lets you log strength/box workouts and edit individual planned days — all in one month-grid view.

## Stack

Next.js (App Router) on Vercel, Vercel Postgres, Strava API for run sync.

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values:

| Variable | Required | Description |
| --- | --- | --- |
| `POSTGRES_URL` | yes | Vercel Postgres connection string |
| `STRAVA_CLIENT_ID` | yes | Strava API app client ID ([strava.com/settings/api](https://www.strava.com/settings/api)) |
| `STRAVA_CLIENT_SECRET` | yes | Strava API app client secret |
| `STRAVA_REDIRECT_URI` | yes | OAuth redirect URI registered with the Strava app, e.g. `https://your-app.vercel.app/api/strava/callback` |
| `CRON_SECRET` | optional, recommended | Authenticates Vercel Cron's calls to `/api/strava/sync` so the endpoint can't be triggered by anyone who finds the URL. Generate with `openssl rand -hex 32` and set it as a Vercel project env var — Vercel Cron automatically sends it as `Authorization: Bearer <CRON_SECRET>`. |

## Setup

Install dependencies, then apply the database schema and seed initial data (races, plan config, starting plan) in this order:

```bash
npm install
npx tsx scripts/apply-schema.ts
npx tsx scripts/seed.ts
```

### One-time Strava connection

After deploying (or while running locally with valid Strava env vars), visit `/api/strava/connect` once in a browser to authorize the app and store OAuth tokens. You'll be redirected back with `?strava=connected` on success. After this, the daily cron job (configured in `vercel.json`) keeps runs in sync automatically, and the "Sync Strava now" button on the home page can trigger a sync on demand.

## Development

```bash
npm run dev      # start the dev server at http://localhost:3000
npm run build    # production build
npm run test     # run the test suite (vitest)
```

## Deploying

```bash
npx vercel link
npx vercel env add POSTGRES_URL
npx vercel env add STRAVA_CLIENT_ID
npx vercel env add STRAVA_CLIENT_SECRET
npx vercel env add STRAVA_REDIRECT_URI
npx vercel env add CRON_SECRET
npx vercel --prod
```

Then run the one-time Strava connect step above against the live deployment, and run the schema/seed scripts against production (pull production env vars first with `npx vercel env pull .env.local`).
