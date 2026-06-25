'use client';

import { useEffect, useState } from 'react';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { DayDetailPanel } from '@/components/calendar/DayDetailPanel';
import { PlannedWorkout, StravaActivity, StrengthLog } from '@/lib/types';

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export default function HomePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());
  const [workouts, setWorkouts] = useState<PlannedWorkout[]>([]);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [strengthLogs, setStrengthLogs] = useState<StrengthLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  function refresh() {
    const { start, end } = monthRange(year, month);
    fetch(`/api/workouts?start=${start}&end=${end}`)
      .then(res => res.json())
      .then(data => {
        setWorkouts(data.workouts);
        setActivities(data.activities);
        setStrengthLogs(data.strengthLogs);
      });
  }

  useEffect(refresh, [year, month]);

  async function syncNow() {
    setSyncing(true);
    await fetch('/api/strava/sync');
    refresh();
    setSyncing(false);
  }

  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  }

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="px-3 py-1 rounded border">←</button>
        <h1 className="text-lg font-semibold">
          {new Date(Date.UTC(year, month, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </h1>
        <button onClick={() => changeMonth(1)} className="px-3 py-1 rounded border">→</button>
      </div>

      <div className="flex justify-end mb-3">
        <button
          onClick={syncNow}
          disabled={syncing}
          className="text-sm px-3 py-1 rounded border disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync Strava now'}
        </button>
      </div>

      <MonthGrid
        year={year} month={month}
        workouts={workouts} activities={activities} strengthLogs={strengthLogs}
        onSelectDay={setSelectedDate}
      />

      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          workout={workouts.find(w => w.date === selectedDate)}
          activity={activities.find(a => a.date === selectedDate)}
          strengthLog={strengthLogs.find(s => s.date === selectedDate)}
          onClose={() => setSelectedDate(null)}
          onUpdated={refresh}
        />
      )}
    </main>
  );
}
