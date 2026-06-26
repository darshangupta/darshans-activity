'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { DayDetailPanel } from '@/components/calendar/DayDetailPanel';
import { PlannedWorkout, StravaActivity, StrengthLog } from '@/lib/types';
import { syncStravaAction } from '@/app/actions';

const RACES = [
  { name: 'Half Marathon', date: '2026-08-16' },
  { name: 'Marathon', date: '2026-12-25' },
];

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

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
    await syncStravaAction();
    refresh();
    setSyncing(false);
  }

  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  }

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">

      {/* Race countdown chips */}
      <div className="flex gap-2 flex-wrap">
        {RACES.map(race => {
          const days = daysUntil(race.date);
          if (days < 0) return null;
          return (
            <div key={race.name} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
              <span className="text-orange-400 font-bold text-sm">{days}d</span>
              <span className="text-xs text-slate-400">{race.name}</span>
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition"
        >
          ‹
        </button>
        <h1 className="text-xl font-semibold tracking-tight text-white">{monthLabel}</h1>
        <button
          onClick={() => changeMonth(1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition"
        >
          ›
        </button>
      </div>

      {/* Action bar */}
      <div className="flex justify-end gap-2">
        <button
          onClick={syncNow}
          disabled={syncing}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 disabled:opacity-40 transition"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          {syncing ? 'Syncing…' : 'Sync Strava'}
        </button>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Link>
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
