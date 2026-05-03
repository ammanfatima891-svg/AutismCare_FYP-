import React from 'react';
import { cn } from '../../ui/utils';
import { FileText, Calendar, User } from 'lucide-react';
import { reportTypeLabel } from '../reportLabels';

interface ReportHeaderProps {
  reportType: string;
  childName?: string;
  age?: number | null;
  generatedAt?: string;
  className?: string;
}

export function ReportHeader({
  reportType,
  childName,
  age,
  generatedAt,
  className,
}: ReportHeaderProps) {
  const typeLabel = reportTypeLabel(reportType);
  const dateStr = generatedAt
    ? new Date(generatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-500" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              {typeLabel} Report
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            {childName && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {childName}
                {age != null ? ` · Age ${age}` : null}
              </span>
            )}
            {dateStr && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Generated {dateStr}
              </span>
            )}
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {typeLabel}
        </span>
      </div>
    </div>
  );
}

