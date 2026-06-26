'use client';

import { Badge } from '@/components/ui/badge';
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
  const color =
    workout?.kind === 'race' ? 'bg-purple-100 border-purple-400' :
    workout?.kind === 'run' ? 'bg-blue-50 border-blue-300' :
    'bg-neutral-50 border-neutral-200';

  return (
    <button
      onClick={() => onSelect(date)}
      className={cn(
        'flex flex-col gap-1 rounded-md border p-1.5 sm:p-2 text-left text-xs min-h-16 sm:min-h-20 hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 transition',
        color,
        isToday && 'ring-2 ring-blue-500',
      )}
    >
      <span className="font-semibold">{dayOfMonth}</span>
      {workout?.kind === 'run' && (
        <Badge variant="secondary" className="max-w-full overflow-hidden">
          <span className="truncate">
            <span className="sm:hidden">{activity ? `${activity.distanceMi.toFixed(1)}mi` : `${workout.targetMin}mi`}</span>
            <span className="hidden sm:inline">{activity ? `${activity.distanceMi.toFixed(1)}mi run` : `${workout.targetMin}mi planned`}</span>
          </span>
        </Badge>
      )}
      {workout?.kind === 'race' && (
        <Badge className="max-w-full overflow-hidden">
          <span className="truncate">{workout.note}</span>
        </Badge>
      )}
      {strengthLog && (
        <Badge variant="outline" className="max-w-full overflow-hidden">
          <span className="truncate">{strengthLog.activityType}</span>
        </Badge>
      )}
    </button>
  );
}
