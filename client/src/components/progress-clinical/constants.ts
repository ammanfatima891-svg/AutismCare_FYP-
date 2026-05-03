/** Unified confidence visualization (therapy module). */

export type ConfidenceTier = 'low' | 'medium' | 'high';

export const CONFIDENCE_COLORS: Record<ConfidenceTier, string> = {
  low: '#f59e0b',
  medium: '#3b82f6',
  high: '#16a34a',
};

export const CONFIDENCE_BG: Record<ConfidenceTier, string> = {
  low: 'bg-amber-500/15 text-amber-950 border-amber-200',
  medium: 'bg-blue-500/15 text-blue-950 border-blue-200',
  high: 'bg-emerald-500/15 text-emerald-950 border-emerald-200',
};

export function confidenceTierFromScore(score: number | null | undefined): ConfidenceTier {
  const s = Number(score);
  if (!Number.isFinite(s)) return 'low';
  if (s > 0.7) return 'high';
  if (s > 0.4) return 'medium';
  return 'low';
}

export function confidenceTierFromLabel(label?: string): ConfidenceTier {
  const l = String(label || '').toLowerCase();
  if (l === 'high' || l === 'medium' || l === 'low') return l;
  return 'low';
}

export type GoalTrendUi = 'improving' | 'stagnant' | 'declining';

export function trendIcon(trend?: string): string {
  const t = String(trend || '').toLowerCase();
  if (t === 'improving') return '↑';
  if (t === 'declining') return '↓';
  return '→';
}
