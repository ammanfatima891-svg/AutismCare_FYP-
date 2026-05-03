import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../ui/utils';

type SectionTone = 'default' | 'blue' | 'green' | 'yellow';

const toneClasses: Record<SectionTone, string> = {
  default: 'bg-white',
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  yellow: 'bg-yellow-50',
};

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DashboardPageHeader({ title, description, actions }: DashboardPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-600 sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

interface DashboardSectionProps {
  title?: string;
  description?: string;
  tone?: SectionTone;
  className?: string;
  children: React.ReactNode;
}

export function DashboardSection({
  title,
  description,
  tone = 'default',
  className,
  children,
}: DashboardSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('rounded-2xl border border-slate-200/80 p-5 shadow-sm sm:p-6', toneClasses[tone], className)}
    >
      {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      <div className={cn(title || description ? 'mt-4' : '')}>{children}</div>
    </motion.section>
  );
}

interface DashboardCardProps {
  title: string;
  description?: string;
  value?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function DashboardCard({ title, description, value, icon, className }: DashboardCardProps) {
  return (
    <Card className={cn('bg-white', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-slate-700">{title}</CardTitle>
          {description ? <CardDescription className="text-xs text-slate-500">{description}</CardDescription> : null}
        </div>
        {icon ? <div className="rounded-xl bg-blue-50 p-2 text-blue-700">{icon}</div> : null}
      </CardHeader>
      {value ? (
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'No data available',
  description = 'There is currently nothing to show in this section.',
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm',
        className,
      )}
    >
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        <Inbox className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

