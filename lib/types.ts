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
