import React from 'react';
import { cn } from '../../ui/utils';
import { Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface SessionRow {
  id?: string;
  sessionDate?: string;
  duration?: number;
  status?: string;
  goalsTargeted?: string[];
  activitiesUsed?: string[];
  childResponse?: string;
}

interface SessionsTableProps {
  data: SessionRow[];
  className?: string;
}

function StatusBadge({ status }: { status?: string }) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'done') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    );
  }
  if (s === 'cancelled' || s === 'skipped') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertCircle className="h-3 w-3" />
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      <Clock className="h-3 w-3" />
      {status || 'Scheduled'}
    </span>
  );
}

export function SessionsTable({ data, className }: SessionsTableProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400">No session data available.</p>;
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
            <th className="pb-2 pr-4 pt-1">Date</th>
            <th className="pb-2 pr-4 pt-1">Duration</th>
            <th className="pb-2 pr-4 pt-1">Status</th>
            <th className="pb-2 pr-4 pt-1">Goals</th>
            <th className="pb-2 pt-1">Activities</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              className={cn(
                'border-b border-slate-50 transition-colors hover:bg-slate-50/50',
                i === data.length - 1 && 'border-b-0'
              )}
            >
              <td className="py-2.5 pr-4 font-medium text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {row.sessionDate
                    ? new Date(row.sessionDate).toLocaleDateString()
                    : '—'}
                </span>
              </td>
              <td className="py-2.5 pr-4 tabular-nums text-slate-600">
                {row.duration ? `${row.duration} min` : '—'}
              </td>
              <td className="py-2.5 pr-4">
                <StatusBadge status={row.status} />
              </td>
              <td className="py-2.5 pr-4 text-slate-600">
                {row.goalsTargeted && row.goalsTargeted.length > 0
                  ? row.goalsTargeted.join(', ')
                  : '—'}
              </td>
              <td className="py-2.5 text-slate-600">
                {row.activitiesUsed && row.activitiesUsed.length > 0
                  ? row.activitiesUsed.join(', ')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

