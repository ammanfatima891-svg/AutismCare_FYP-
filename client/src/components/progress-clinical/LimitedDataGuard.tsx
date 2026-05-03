import React from 'react';

type Props = {
  /** True when backend flags limited reliability (e.g. goal-level or overall low confidence). */
  limited?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
};

export function LimitedDataGuard({ limited, children, fallback = 'Limited data', className }: Props) {
  if (limited) {
    return (
      <span className={`tabular-nums text-muted-foreground ${className || ''}`} title="Interpret with caution">
        {fallback}
      </span>
    );
  }
  return <>{children}</>;
}

export function LowConfidenceBanner({
  visible,
  message = 'Interpret with caution: confidence in this metric is limited.',
}: {
  visible: boolean;
  message?: string;
}) {
  if (!visible) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">{message}</div>
  );
}
