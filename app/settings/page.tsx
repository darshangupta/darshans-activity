'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/plan-config').then(res => res.json()).then(data => setConfig(data.config));
  }, []);

  if (!config) return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-slate-500 text-sm">Loading…</div>
    </main>
  );

  async function save() {
    setSaving(true);
    await fetch('/api/plan-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function setDayConfig(day: Weekday, dayConfig: WeekdayConfig) {
    if (!config) return;
    setConfig({ ...config, weeklyTemplate: { ...config.weeklyTemplate, [day]: dayConfig } });
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 transition">
          ←
        </Link>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
      </div>

      {/* Weekly Template */}
      <section className="space-y-4">
        <div>
          <h2 className="font-medium text-white">Weekly Template</h2>
          <p className="text-sm text-slate-500 mt-1">
            Saturday is always the long run — calculated automatically from the race progression. Set everything else here.
          </p>
        </div>

        <div className="space-y-2">
          {EDITABLE_DAYS.map(day => {
            const dayConfig = config.weeklyTemplate[day];
            return (
              <div key={day} className="flex items-center gap-2 bg-white/[0.03] border border-white/8 rounded-xl p-3">
                <span className="text-sm text-slate-300 w-24 shrink-0">{DAY_LABELS[day]}</span>
                <Select
                  value={dayConfig.kind}
                  onValueChange={(kind) => setDayConfig(
                    day,
                    kind === 'run' ? { kind: 'run', min: 3, max: 3 } : { kind: 'open' },
                  )}
                >
                  <SelectTrigger className="w-24 bg-white/5 border-white/10 text-white text-sm h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="run">Run</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
                {dayConfig.kind === 'run' && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Input
                      type="number" placeholder="Min" value={dayConfig.min}
                      onChange={e => setDayConfig(day, { kind: 'run', min: Number(e.target.value), max: dayConfig.max })}
                      className="w-16 h-8 text-sm bg-white/5 border-white/10 text-white text-center"
                    />
                    <span className="text-slate-600 text-xs">–</span>
                    <Input
                      type="number" placeholder="Max" value={dayConfig.max}
                      onChange={e => setDayConfig(day, { kind: 'run', min: dayConfig.min, max: Number(e.target.value) })}
                      className="w-16 h-8 text-sm bg-white/5 border-white/10 text-white text-center"
                    />
                    <span className="text-slate-500 text-xs">mi</span>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 opacity-50">
            <span className="text-sm text-slate-400 w-24">Saturday</span>
            <span className="text-sm text-slate-500">Long run (auto-calculated)</span>
          </div>
        </div>
      </section>

      {/* Algorithm knobs */}
      <section className="space-y-4">
        <h2 className="font-medium text-white">Long Run Algorithm</h2>
        <div className="space-y-3">
          {[
            { label: 'Half build — start miles', key: 'halfStartMiles' },
            { label: 'Half build — ramp per week', key: 'halfRampPerWeek' },
            { label: 'Recovery week miles', key: 'recoveryWeekMiles' },
            { label: 'Marathon build — ramp per week', key: 'marathonRampPerWeek' },
            { label: 'Marathon peak miles (cap)', key: 'marathonPeakMiles' },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2.5 gap-4">
              <Label className="text-sm text-slate-300 leading-tight">{label}</Label>
              <Input
                type="number"
                value={config.longRun[key as keyof typeof config.longRun] as number}
                onChange={e => setConfig({ ...config, longRun: { ...config.longRun, [key]: Number(e.target.value) } })}
                className="w-20 h-8 text-sm bg-white/5 border-white/10 text-white text-center"
              />
            </div>
          ))}
        </div>
      </section>

      <Button
        onClick={save}
        disabled={saving}
        className={`w-full h-11 font-medium transition-all ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-400'} text-white border-0`}
      >
        {saved ? '✓ Saved & Plan Regenerated' : saving ? 'Saving…' : 'Save & Regenerate Plan'}
      </Button>
    </main>
  );
}
