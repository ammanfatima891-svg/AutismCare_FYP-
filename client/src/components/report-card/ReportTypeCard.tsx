import React from 'react';
import { FileText } from 'lucide-react';
import { cn } from '../ui/utils';

export type ReportTypeOption = {
  value: string;
  title: string;
  subtitle: string;
};

export function ReportTypeCard({
  option,
  selected,
  onClick,
}: {
  option: ReportTypeOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border bg-card p-4 text-left transition-all duration-150',
        selected
          ? 'border-blue-300 shadow-[0_6px_18px_-14px_rgba(14,116,144,0.6)] ring-2 ring-blue-100'
          : 'border hover:border-blue-200 hover:bg-blue-50/30'
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        <FileText className="h-6 w-6" />
      </div>
      <p className="text-[22px] font-semibold leading-7 text-foreground">{option.title}</p>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{option.subtitle}</p>
    </button>
  );
}
