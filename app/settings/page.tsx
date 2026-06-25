// app/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlanConfig, Weekday, WeekdayConfig } from '@/lib/types';

const EDITABLE_DAYS: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS: Record<Weekday, string> = {
  sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
};

export default function SettingsPage() {
  const [config, setConfig] = useState<PlanConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/plan-config').then(res => res.json()).then(data => setConfig(data.config));
  }, []);

  if (!config) return <main className="p-6">Loading...</main>;

  async function save() {
    setSaving(true);
    await fetch('/api/plan-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    setSaving(false);
  }

  function setDayConfig(day: Weekday, dayConfig: WeekdayConfig) {
    if (!config) return;
    setConfig({ ...config, weeklyTemplate: { ...config.weeklyTemplate, [day]: dayConfig } });
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      <section className="space-y-3">
        <h2 className="font-medium">Weekly Template</h2>
        <p className="text-sm text-neutral-500">
          Saturday is always the long run — its mileage is calculated automatically from the race-day progression below. Every other day is yours to set.
        </p>

        {EDITABLE_DAYS.map(day => {
          const dayConfig = config.weeklyTemplate[day];
          return (
            <div key={day} className="grid grid-cols-4 gap-2 items-end border-b pb-3">
              <Label className="col-span-4 font-medium">{DAY_LABELS[day]}</Label>
              <Select
                value={dayConfig.kind}
                onValueChange={(kind) => setDayConfig(
                  day,
                  kind === 'run' ? { kind: 'run', min: 3, max: 3 } : { kind: 'open' },
                )}
              >
                <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="run">Run</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
              {dayConfig.kind === 'run' && (
                <>
                  <Input
                    type="number" placeholder="Min mi" value={dayConfig.min}
                    onChange={e => setDayConfig(day, { kind: 'run', min: Number(e.target.value), max: dayConfig.max })}
                  />
                  <Input
                    type="number" placeholder="Max mi" value={dayConfig.max}
                    onChange={e => setDayConfig(day, { kind: 'run', min: dayConfig.min, max: Number(e.target.value) })}
                  />
                </>
              )}
            </div>
          );
        })}

        <div className="text-sm text-neutral-500">Saturday: Long run (auto-calculated)</div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Long Run Algorithm</h2>
        <Label>Half build: start miles</Label>
        <Input type="number" value={config.longRun.halfStartMiles}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, halfStartMiles: Number(e.target.value) } })} />
        <Label>Half build: ramp per week</Label>
        <Input type="number" value={config.longRun.halfRampPerWeek}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, halfRampPerWeek: Number(e.target.value) } })} />
        <Label>Recovery week miles</Label>
        <Input type="number" value={config.longRun.recoveryWeekMiles}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, recoveryWeekMiles: Number(e.target.value) } })} />
        <Label>Marathon build: ramp per week</Label>
        <Input type="number" value={config.longRun.marathonRampPerWeek}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, marathonRampPerWeek: Number(e.target.value) } })} />
        <Label>Marathon peak miles (cap)</Label>
        <Input type="number" value={config.longRun.marathonPeakMiles}
          onChange={e => setConfig({ ...config, longRun: { ...config.longRun, marathonPeakMiles: Number(e.target.value) } })} />
      </section>

      <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save & Regenerate Plan'}</Button>
    </main>
  );
}
