// components/calendar/DayDetailPanel.tsx
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{date}</DialogTitle>
        </DialogHeader>

        {workout && workout.kind !== 'open' && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">
              Planned: {workout.targetMin}mi {workout.kind === 'race' ? `(${workout.note})` : ''}
            </p>
            {activity && (
              <div className="text-sm">
                <p>Actual: {activity.distanceMi.toFixed(1)}mi, {activity.avgPace}/mi avg</p>
                {activity.splits.length > 0 && (
                  <table className="w-full text-xs mt-2">
                    <thead><tr><th className="text-left">Mile</th><th className="text-left">Pace</th></tr></thead>
                    <tbody>
                      {activity.splits.map(s => (
                        <tr key={s.mile}><td>{s.mile}</td><td>{s.avgPace}/mi</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {workout.kind === 'run' && (
              <div className="flex gap-2 items-end">
                <Input value={editMiles} onChange={e => setEditMiles(e.target.value)} placeholder="Miles" className="w-24" />
                <Button onClick={saveOverride}>Update plan</Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 border-t pt-3 mt-1">
          <p className="text-sm font-medium">Strength / Boxing</p>
          {strengthLog ? (
            <p className="text-sm text-neutral-600">Logged: {strengthLog.activityType} {strengthLog.durationMin ? `(${strengthLog.durationMin} min)` : ''} {strengthLog.note}</p>
          ) : (
            <>
              <Select value={strengthType} onValueChange={v => setStrengthType(v as StrengthActivityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lift">Lift</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                </SelectContent>
              </Select>
              <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration (min)" type="number" />
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Notes" />
              <Button onClick={saveStrengthLog}>Log it</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
