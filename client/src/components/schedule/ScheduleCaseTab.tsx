import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Loader2, CalendarPlus } from 'lucide-react';
import { scheduleAPI } from '../../api';
import { toast } from 'sonner';

const DAY_OPTIONS: { id: string; label: string }[] = [
  { id: 'Mon', label: 'Mon' },
  { id: 'Tue', label: 'Tue' },
  { id: 'Wed', label: 'Wed' },
  { id: 'Thu', label: 'Thu' },
  { id: 'Fri', label: 'Fri' },
  { id: 'Sat', label: 'Sat' },
  { id: 'Sun', label: 'Sun' },
];

type ScheduleRow = {
  _id?: string;
  days?: string[];
  time?: string;
  duration?: number;
  startDate?: string;
  endDate?: string;
};

type SlotRow = {
  _id: string;
  date: string;
  time: string;
  duration: number;
  status: string;
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'border-slate-200 bg-slate-100 text-slate-800',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  missed: 'border-red-200 bg-red-50 text-red-900',
  rescheduled: 'border-amber-200 bg-amber-50 text-amber-950',
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  missed: 'Missed',
  rescheduled: 'Rescheduled',
};

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatTimeDisplay(hhmm: string) {
  if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm.trim())) return '—';
  const [hStr, mStr] = hhmm.trim().split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return '—';
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function defaultFormState() {
  return {
    days: { Mon: true, Wed: true, Fri: true } as Record<string, boolean>,
    time: '16:00',
    duration: '45',
    startDate: '',
    endDate: '',
  };
}

function dateRangeLabel(start: string, end: string) {
  if (!start || !end) return 'Select start and end dates in the form.';
  try {
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '—';
    return `${a.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} → ${b.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } catch {
    return '—';
  }
}

type Props = { caseId: string };

function slotStatusKey(s: string) {
  return String(s || '').toLowerCase();
}

function SessionSlotsTable({
  slots,
  slotBusy,
  onPatch,
  emptyHint,
}: {
  slots: SlotRow[];
  slotBusy: string | null;
  onPatch: (id: string, status: 'completed' | 'missed' | 'rescheduled') => void;
  /** Shown when there are no rows */
  emptyHint?: string;
}) {
  if (slots.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-sky-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
        {emptyHint ??
          'No session slots loaded. Submit the schedule form to generate slots for the selected range.'}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-slate-600">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Duration</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((row) => (
            <tr key={row._id} className="border-b border-slate-50">
              <td className="px-3 py-2.5 text-slate-900">{formatDay(row.date)}</td>
              <td className="px-3 py-2.5 text-slate-800">{row.time}</td>
              <td className="px-3 py-2.5 text-slate-700">{row.duration} min</td>
              <td className="px-3 py-2.5">
                <Badge
                  variant="outline"
                  className={STATUS_BADGE[slotStatusKey(row.status)] || STATUS_BADGE.scheduled}
                >
                  {STATUS_LABEL[slotStatusKey(row.status)] || row.status}
                </Badge>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-emerald-200 text-emerald-900 hover:bg-emerald-50"
                    disabled={slotBusy === row._id || slotStatusKey(row.status) !== 'scheduled'}
                    onClick={() => void onPatch(row._id, 'completed')}
                  >
                    {slotBusy === row._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Completed'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-red-200 text-red-900 hover:bg-red-50"
                    disabled={slotBusy === row._id || slotStatusKey(row.status) !== 'scheduled'}
                    onClick={() => void onPatch(row._id, 'missed')}
                  >
                    Missed
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-amber-200 text-amber-950 hover:bg-amber-50"
                    disabled={slotBusy === row._id || slotStatusKey(row.status) !== 'scheduled'}
                    onClick={() => void onPatch(row._id, 'rescheduled')}
                  >
                    Rescheduled
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const createScheduleBtnClass =
  'border border-sky-400 bg-sky-100 font-semibold text-black shadow-sm hover:bg-sky-200 focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60';

const cardShellClass =
  'w-full rounded-xl border border-sky-100 bg-white shadow-sm';

export function ScheduleCaseTab({ caseId }: Props) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createFlowOpen, setCreateFlowOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);
  const [form, setForm] = useState(defaultFormState);

  const firstFetch = useRef(true);

  const fetchBundle = useCallback(async () => {
    if (!caseId) return;
    try {
      if (firstFetch.current) setLoading(true);
      const res = await scheduleAPI.getTherapistScheduleBundle(caseId);
      const body = res.data as { data?: { schedules?: ScheduleRow[]; slots?: SlotRow[] } };
      const bundle = body?.data;
      setSchedules(Array.isArray(bundle?.schedules) ? bundle.schedules : []);
      setSlots(Array.isArray(bundle?.slots) ? bundle.slots : []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to load schedule.');
      setSchedules([]);
      setSlots([]);
    } finally {
      if (firstFetch.current) {
        setLoading(false);
        firstFetch.current = false;
      }
    }
  }, [caseId]);

  useEffect(() => {
    firstFetch.current = true;
    void fetchBundle();
  }, [caseId, fetchBundle]);

  const openCreateFlow = () => {
    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + 3);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setForm({
      ...defaultFormState(),
      startDate: fmt(today),
      endDate: fmt(end),
    });
    setCreateFlowOpen(true);
  };

  const toggleDay = (id: string) => {
    setForm((prev) => ({ ...prev, days: { ...prev.days, [id]: !prev.days[id] } }));
  };

  const selectedDayLabels = DAY_OPTIONS.filter((d) => form.days[d.id]).map((d) => d.label);
  const previewHeadline =
    selectedDayLabels.length > 0
      ? `${selectedDayLabels.join(', ')} — ${formatTimeDisplay(form.time)}`
      : 'Select at least one weekday —';

  const handleSubmitSchedule = async () => {
    const selectedDays = DAY_OPTIONS.map((d) => d.id).filter((id) => form.days[id]);
    if (selectedDays.length === 0) {
      toast.error('Select at least one day.');
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error('Start and end dates are required.');
      return;
    }
    if (form.startDate > form.endDate) {
      toast.error('End date must be on or after start date.');
      return;
    }
    const dur = Number(form.duration);
    if (Number.isNaN(dur) || dur < 1) {
      toast.error('Duration must be at least 1 minute.');
      return;
    }
    try {
      setSaving(true);
      await scheduleAPI.create({
        caseId,
        days: selectedDays,
        time: form.time,
        duration: dur,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      toast.success('Schedule saved. Session slots were generated.');
      setCreateFlowOpen(false);
      await fetchBundle();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not submit schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const patchSlot = async (id: string, status: 'completed' | 'missed' | 'rescheduled') => {
    try {
      setSlotBusy(id);
      await scheduleAPI.updateSessionSlot(id, { status });
      toast.success('Slot updated');
      await fetchBundle();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSlotBusy(null);
    }
  };

  const hasNoData = !loading && schedules.length === 0 && slots.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between ${cardShellClass}`}>
        <div>
          <h2 className="text-lg font-semibold text-sky-950">Therapy schedule</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Set recurring therapy times for this case. Generated slots appear below and can be marked when sessions occur.
          </p>
        </div>
        <Button
          type="button"
          className={createScheduleBtnClass}
          onClick={openCreateFlow}
          disabled={loading}
        >
          <CalendarPlus className="mr-2 h-4 w-4 text-black" />
          Create schedule
        </Button>
      </div>

      {createFlowOpen && (
        <>
          <Card className={cardShellClass}>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-sky-950">Schedule form</CardTitle>
              <CardDescription>
                Choose days, session time, duration, and the date range. Submit to POST /api/schedules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-slate-800">Days</Label>
                <div className="flex flex-wrap gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  {DAY_OPTIONS.map((d) => (
                    <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                      <Checkbox checked={!!form.days[d.id]} onCheckedChange={() => toggleDay(d.id)} />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Time</Label>
                  <Input
                    type="time"
                    className="border-slate-200"
                    value={form.time}
                    onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    className="border-slate-200"
                    value={form.duration}
                    onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Start date</Label>
                  <Input
                    type="date"
                    className="border-slate-200"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-800">End date</Label>
                  <Input
                    type="date"
                    className="border-slate-200"
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setCreateFlowOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="min-w-[160px] bg-sky-700 font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                  disabled={saving}
                  onClick={() => void handleSubmitSchedule()}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Submit Schedule'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={cardShellClass}>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-sky-950">Schedule view</CardTitle>
              <CardDescription>Live preview of this schedule before you submit.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-lg border border-sky-100 bg-sky-50/40 px-4 py-4">
                <p className="text-lg font-semibold text-sky-950">{previewHeadline}</p>
                <p className="mt-1 text-sm text-slate-700">
                  Duration {form.duration || '—'} min · {dateRangeLabel(form.startDate, form.endDate)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={cardShellClass}>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-sky-950">Session slots</CardTitle>
              <CardDescription>
                {slots.length === 0
                  ? 'No slots yet. After you submit the form above, generated slots will appear here and below.'
                  : 'Current slots for this case (date, time, status). New slots are added when you submit a new schedule.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <SessionSlotsTable slots={slots} slotBusy={slotBusy} onPatch={patchSlot} />
            </CardContent>
          </Card>

          <div className="flex w-full justify-center pt-1 sm:justify-end">
            <Button
              type="button"
              className={`${createScheduleBtnClass} min-w-[180px]`}
              disabled={saving}
              onClick={() => void handleSubmitSchedule()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-sky-800" />
                  <span className="text-black">Submitting…</span>
                </>
              ) : (
                <span className="text-black">Submit Schedule</span>
              )}
            </Button>
          </div>
        </>
      )}

      {loading && !createFlowOpen ? (
        <Card className={cardShellClass}>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
            <p className="text-sm text-slate-600">Loading schedule data…</p>
          </CardContent>
        </Card>
      ) : hasNoData && !createFlowOpen ? (
        <Card className={`${cardShellClass} border-dashed border-sky-200 bg-sky-50/40`}>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="rounded-full bg-sky-100 p-4">
              <CalendarPlus className="h-10 w-10 text-sky-700" />
            </div>
            <div className="max-w-md space-y-2">
              <p className="text-base font-medium text-sky-950">No therapy schedule yet</p>
              <p className="text-sm text-slate-600">
                Create a recurring schedule to generate session slots for this case.
              </p>
            </div>
            <Button type="button" className={createScheduleBtnClass} onClick={openCreateFlow}>
              Create schedule
            </Button>
          </CardContent>
        </Card>
      ) : !createFlowOpen ? (
        <>
          <Card className={cardShellClass}>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-sky-950">Schedule view</CardTitle>
              <CardDescription>Active recurrence rules (days, time, duration, date range).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {schedules.length === 0 ? (
                <p className="text-sm text-slate-500">No saved rules yet.</p>
              ) : (
                <ul className="space-y-3">
                  {schedules.map((s) => (
                    <li
                      key={String(s._id)}
                      className="rounded-lg border border-sky-100 bg-sky-50/30 px-4 py-3 text-sm text-slate-800"
                    >
                      <p className="text-lg font-semibold text-sky-950">
                        {(s.days || []).join(', ')} — {formatTimeDisplay(String(s.time || ''))}
                      </p>
                      <p className="mt-1 text-slate-700">
                        {s.duration != null ? `${s.duration} min` : '—'} ·{' '}
                        {dateRangeLabel(String(s.startDate || '').slice(0, 10), String(s.endDate || '').slice(0, 10))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className={cardShellClass}>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-sky-950">Session slots</CardTitle>
              <CardDescription>Dates and times from your schedules.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <SessionSlotsTable
                slots={slots}
                slotBusy={slotBusy}
                onPatch={patchSlot}
                emptyHint="No slots yet."
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
