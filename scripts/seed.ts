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
