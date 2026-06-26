'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlannedWorkout, StravaActivity, StrengthLog, StrengthActivityType } from '@/lib/types';

interface Props {
  date: string;
  workout?: PlannedWorkout;
  activity?: StravaActivity;
  strengthLog?: StrengthLog;
  onClose: () => void;
  onUpdated: () => void;
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function DayDetailPanel({ date, workout, activity, strengthLog, onClose, onUpdated }: Props) {
  const [editMiles, setEditMiles] = useState(String(workout?.targetMin ?? ''));
  const [strengthType, setStrengthType] = useState<StrengthActivityType>('lift');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');

  async function saveOverride() {
    const miles = parseFloat(editMiles);
    await fetch(`/api/workouts/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'run', targetMin: miles, targetMax: miles, note: workout?.note ?? null }),
    });
    onUpdated();
  }

  async function saveStrengthLog() {
    await fetch('/api/strength-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, activityType: strengthType,
        durationMin: duration ? parseInt(duration, 10) : null,
        note: note || null,
      }),
    });
    onUpdated();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-white">{formatDate(date)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Run section */}
          {workout && workout.kind !== 'open' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${workout.kind === 'race' ? 'bg-violet-400' : 'bg-orange-400'}`} />
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {workout.kind === 'race' ? 'Race Day' : 'Run'}
                </span>
              </div>

              <div className="bg-white/5 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Planned</span>
                  <span className="text-white font-medium">{workout.targetMin} mi</span>
                </div>
                {activity && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Actual</span>
                      <span className="text-orange-400 font-medium">{activity.distanceMi.toFixed(2)} mi</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Avg pace</span>
                      <span className="text-white font-medium">{activity.avgPace}/mi</span>
                    </div>
                  </>
                )}
              </div>

              {activity && activity.splits.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mile Splits</p>
                  <div className="bg-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Mile</th>
                          <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">Pace</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.splits.map(s => (
                          <tr key={s.mile} className="border-b border-white/5 last:border-0">
                            <td className="px-3 py-2 text-slate-400">{s.mile}</td>
                            <td className="px-3 py-2 text-right text-white font-medium font-mono">{s.avgPace}/mi</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {workout.kind === 'run' && (
                <div className="flex gap-2 items-end">
                  <Input
                    value={editMiles}
                    onChange={e => setEditMiles(e.target.value)}
                    placeholder="Miles"
                    className="w-24 bg-white/5 border-white/10 text-white"
                  />
                  <Button onClick={saveOverride} size="sm" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/10">
                    Override plan
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Strength section — always visible */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Strength / Boxing</span>
            </div>

            {strengthLog ? (
              <div className="bg-white/5 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Type</span>
                  <span className="text-white font-medium capitalize">{strengthLog.activityType}</span>
                </div>
                {strengthLog.durationMin && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-white font-medium">{strengthLog.durationMin} min</span>
                  </div>
                )}
                {strengthLog.note && (
                  <p className="text-sm text-slate-400 pt-1">{strengthLog.note}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Select value={strengthType} onValueChange={v => setStrengthType(v as StrengthActivityType)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lift">🏋️ Lift</SelectItem>
                    <SelectItem value="box">🥊 Box</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder="Duration (min)"
                  type="number"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                />
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Notes"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 resize-none"
                  rows={2}
                />
                <Button onClick={saveStrengthLog} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                  Log it
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
