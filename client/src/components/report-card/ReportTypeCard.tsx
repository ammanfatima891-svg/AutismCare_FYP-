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
        'w-full rounded-xl border bg-white p-4 text-left transition-all duration-150',
        selected
          ? 'border-sky-300 shadow-[0_6px_18px_-14px_rgba(14,116,144,0.6)] ring-2 ring-sky-100'
          : 'border-slate-200 hover:border-sky-200 hover:bg-sky-50/30'
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
        <FileText className="h-6 w-6" />
      </div>
      <p className="text-[22px] font-semibold leading-7 text-slate-900">{option.title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-500">{option.subtitle}</p>
    </button>
  );
}
