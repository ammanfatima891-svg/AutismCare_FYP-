import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar } from 'lucide-react';
import { formatChildResponseDisplay } from './sessionFormat';

export type SessionRow = {
  _id?: string;
  sessionDate?: string;
  duration?: number;
  goalsTargeted?: string[];
  activitiesUsed?: string[];
  childResponse?: string;
  status?: string;
};

const STATUS_CLASS: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  missed: 'bg-amber-50 text-amber-900 border-amber-200',
  rescheduled: 'bg-sky-50 text-sky-900 border-sky-200',
};

type Props = {
  sessions: SessionRow[];
  /** Required when showAddButton is true (default). Omit when the parent renders its own action. */
  onAdd?: () => void;
  onEdit?: (s: SessionRow) => void;
  addButtonLabel?: string;
  /** Case file: card list aligned with global Sessions page (no inline modal). */
  variant?: 'table' | 'cards';
  /** When false, hides the toolbar add button (e.g. parent puts + Add New Session in card header). */
  showAddButton?: boolean;
};

export function SessionList({
  sessions,
  onAdd,
  onEdit,
  addButtonLabel = '+ Add New Session',
  variant = 'table',
  showAddButton = true,
}: Props) {
  const showEdit = typeof onEdit === 'function';
  const cards = variant === 'cards';

  return (
    <div className="space-y-4">
      {showAddButton ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {cards
              ? 'Sessions for this child only. Same data powers clinician analytics.'
              : 'Structured logs feed clinician progress and trend analytics.'}
          </p>
          <Button
            type="button"
            size="sm"
            className="shrink-0 rounded-lg border border-slate-300 bg-white text-sm font-medium text-black shadow-sm hover:bg-slate-50"
            onClick={() => onAdd?.()}
          >
            {addButtonLabel}
          </Button>
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
          No sessions logged yet. Use Add New Session to record goals, activities, and parent-facing instructions.
        </p>
      ) : cards ? (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const dt = s.sessionDate ? new Date(s.sessionDate) : null;
            const dateStr = dt
              ? dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : '—';
            const timeStr = dt ? dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—';
            const st = (s.status || 'completed').toLowerCase();
            const completed = st === 'completed';
            return (
              <li
                key={String(s._id)}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100">
                    <Calendar className="h-5 w-5 text-sky-700" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="font-semibold text-slate-900">{dateStr}</span>
                      <span className="text-sm text-slate-500">{timeStr}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      Goals: {(s.goalsTargeted || []).join(', ') || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
                  <div>
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {s.duration != null && s.duration > 0 ? `${s.duration} min` : '—'}
                    </p>
                  </div>
                  {completed ? (
                    <div>
                      <p className="text-xs text-slate-500">Response</p>
                      <p className="text-sm font-semibold text-slate-900">{formatChildResponseDisplay(s.childResponse)}</p>
                    </div>
                  ) : null}
                  <Badge variant="outline" className={`text-xs font-normal capitalize ${STATUS_CLASS[st] || 'border-slate-200'}`}>
                    {st}
                  </Badge>
                  {showEdit ? (
                    <Button type="button" variant="outline" size="sm" className="border-slate-200" onClick={() => onEdit!(s)}>
                      Edit
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                <TableHead className="text-slate-800">Date</TableHead>
                <TableHead className="text-slate-800">Duration</TableHead>
                <TableHead className="text-slate-800">Goals targeted</TableHead>
                <TableHead className="text-slate-800">Child response</TableHead>
                <TableHead className="text-slate-800">Status</TableHead>
                {showEdit ? <TableHead className="w-[100px] text-slate-800">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => {
                const st = (s.status || 'completed').toLowerCase();
                return (
                  <TableRow key={String(s._id)} className="border-slate-100">
                    <TableCell className="whitespace-nowrap text-sm text-slate-800">
                      {s.sessionDate ? new Date(s.sessionDate).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {s.duration != null && s.duration > 0 ? `${s.duration} min` : '—'}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm text-slate-700">
                      {(s.goalsTargeted || []).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="max-w-[180px] text-sm text-slate-700">
                      {formatChildResponseDisplay(s.childResponse)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-normal capitalize ${STATUS_CLASS[st] || 'border-slate-200'}`}>
                        {st}
                      </Badge>
                    </TableCell>
                    {showEdit ? (
                      <TableCell>
                        <Button type="button" variant="outline" size="sm" className="border-slate-200" onClick={() => onEdit!(s)}>
                          Edit
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
