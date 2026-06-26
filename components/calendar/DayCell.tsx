'use client';

import { cn } from '@/lib/utils';
import { PlannedWorkout, StravaActivity, StrengthLog } from '@/lib/types';

interface Props {
  date: string;
  dayOfMonth: number;
  isToday: boolean;
  workout?: PlannedWorkout;
  activity?: StravaActivity;
  strengthLog?: StrengthLog;
  onSelect: (date: string) => void;
}

export function DayCell({ date, dayOfMonth, isToday, workout, activity, strengthLog, onSelect }: Props) {
  const isRun = workout?.kind === 'run';
  const isRace = workout?.kind === 'race';
  const isCompleted = isRun && !!activity;

  return (
    <button
      onClick={() => onSelect(date)}
      className={cn(
        'flex flex-col gap-1 rounded-xl border p-1.5 sm:p-2 text-left min-h-16 sm:min-h-20 transition-all hover:scale-[1.02] hover:z-10 relative',
        isRace
          ? 'bg-violet-500/10 border-violet-500/40 hover:border-violet-400/70'
          : isCompleted
            ? 'bg-orange-500/15 border-orange-500/50 hover:border-orange-400/80'
            : isRun
              ? 'bg-orange-500/8 border-orange-500/25 hover:border-orange-500/50'
              : 'bg-white/[0.03] border-white/8 hover:border-white/20',
        isToday && 'ring-2 ring-orange-500 ring-offset-1 ring-offset-background',
      )}
    >
      <span className={cn(
        'text-xs font-semibold leading-none',
        isToday ? 'text-orange-400' : 'text-slate-400',
      )}>
        {dayOfMonth}
      </span>

      {isRace && (
        <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wide leading-tight mt-auto truncate max-w-full">
          {workout.note ?? 'Race'}
        </span>
      )}

      {isRun && (
        <span className={cn(
          'text-[10px] font-semibold leading-none mt-auto truncate max-w-full',
          isCompleted ? 'text-orange-300' : 'text-orange-500/70',
        )}>
          {isCompleted
            ? `${activity.distanceMi.toFixed(1)}mi ✓`
            : `${workout.targetMin}mi`}
        </span>
      )}

      {strengthLog && (
        <span className={cn(
          'text-[10px] font-medium leading-none truncate max-w-full',
          isRun ? 'text-emerald-400/80' : 'text-emerald-400',
        )}>
          {strengthLog.activityType === 'box' ? '🥊' : '🏋️'}{' '}
          <span className="sm:inline hidden">{strengthLog.activityType}</span>
        </span>
      )}
    </button>
  );
}
