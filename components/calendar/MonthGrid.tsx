'use client';

import { DayCell } from './DayCell';
import { PlannedWorkout, StravaActivity, StrengthLog } from '@/lib/types';

interface Props {
  year: number;
  month: number;
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
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={label} className={`text-center text-[10px] font-medium pb-1 ${i === 0 || i === 6 ? 'text-slate-600' : 'text-slate-500'}`}>
            {label}
          </div>
        ))}
        {cells}
      </div>

      {/* Legend */}
      <div className="flex gap-4 pt-2 text-[10px] text-slate-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500/40 inline-block" /> Run</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-500/40 inline-block" /> Race</span>
        <span className="flex items-center gap-1"><span className="text-emerald-500">🥊</span> Strength</span>
      </div>
    </div>
  );
}
