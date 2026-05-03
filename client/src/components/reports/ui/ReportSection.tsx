import React from 'react';
import { cn } from '../../ui/utils';

type HighlightVariant = 'blue' | 'green' | 'yellow' | 'red' | 'neutral';

interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  highlight?: HighlightVariant;
  icon?: React.ReactNode;
}

const headerStyles: Record<HighlightVariant, string> = {
  blue: 'bg-blue-50/80 border-blue-100',
  green: 'bg-green-50/80 border-green-100',
  yellow: 'bg-yellow-50/80 border-yellow-100',
  red: 'bg-red-50/80 border-red-100',
  neutral: 'bg-slate-50/80 border-slate-100',
};

const titleStyles: Record<HighlightVariant, string> = {
  blue: 'text-blue-950',
  green: 'text-green-950',
  yellow: 'text-yellow-950',
  red: 'text-red-950',
  neutral: 'text-slate-800',
};

const leftBorderStyles: Record<HighlightVariant, string> = {
  blue: 'border-l-4 border-l-blue-400',
  green: 'border-l-4 border-l-green-400',
  yellow: 'border-l-4 border-l-yellow-400',
  red: 'border-l-4 border-l-red-400',
  neutral: 'border-l-4 border-l-slate-300',
};

export function ReportSection({
  title,
  children,
  className,
  highlight = 'neutral',
  icon,
}: ReportSectionProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl bg-white shadow-sm',
        leftBorderStyles[highlight],
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b px-5 py-3',
          headerStyles[highlight]
        )}
      >
        {icon ? <span className="text-slate-500">{icon}</span> : null}
        <h3 className={cn('text-sm font-semibold', titleStyles[highlight])}>
          {title}
        </h3>
      </div>
      <div className="px-5 py-4 text-sm text-slate-700">{children}</div>
    </section>
  );
}

