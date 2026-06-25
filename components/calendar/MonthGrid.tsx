'use client';

import { DayCell } from './DayCell';
import { PlannedWorkout, StravaActivity, StrengthLog } from '@/lib/types';

interface Props {
  year: number;
  month: number; // 0-indexed
  workouts: PlannedWorkout[];
  activities: StravaActivity[];
  strengthLogs: StrengthLog[];
  onSelectDay: (date: string) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthGrid({ year, month, workouts, activities, strengthLogs, onSelectDay }: Props) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay();
  const todayIso = new Date().toISOString().slice(0, 10);

  const workoutByDate = new Map(workouts.map(w => [w.date, w]));
  const activityByDate = new Map(activities.map(a => [a.date, a]));
  const strengthByDate = new Map(strengthLogs.map(s => [s.date, s]));

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(<div key={`blank-${i}`} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push(
      <DayCell
        key={iso}
        date={iso}
        dayOfMonth={day}
        isToday={iso === todayIso}
        workout={workoutByDate.get(iso)}
        activity={activityByDate.get(iso)}
        strengthLog={strengthByDate.get(iso)}
        onSelect={onSelectDay}
      />,
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {WEEKDAY_LABELS.map(label => (
        <div key={label} className="text-center text-xs font-medium text-neutral-500">{label}</div>
      ))}
      {cells}
    </div>
  );
}
