import React from 'react';
import { cn } from '../../ui/utils';

interface ReportLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ReportLayout({ children, className }: ReportLayoutProps) {
  return (
    <div className={cn('space-y-5 rounded-2xl bg-slate-50 p-4 md:p-6', className)}>
      {children}
    </div>
  );
}

interface ReportLayoutZoneProps {
  children: React.ReactNode;
  className?: string;
}

export function ReportHeaderZone({ children, className }: ReportLayoutZoneProps) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

export function ReportSummaryZone({ children, className }: ReportLayoutZoneProps) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {children}
    </div>
  );
}

export function ReportChartsZone({ children, className }: ReportLayoutZoneProps) {
  return (
    <div className={cn('grid gap-5 lg:grid-cols-2', className)}>
      {children}
    </div>
  );
}

export function ReportDetailsZone({ children, className }: ReportLayoutZoneProps) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

export function ReportRecommendationsZone({ children, className }: ReportLayoutZoneProps) {
  return <div className={cn('', className)}>{children}</div>;
}

