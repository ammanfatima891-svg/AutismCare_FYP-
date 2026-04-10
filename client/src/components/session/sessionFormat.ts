/**
 * childResponse is stored as a string (SessionLog). New sessions use scale:1…scale:5 or percentages.
 */

export type ResponseMode = 'scale' | 'percent';

export function buildChildResponseString(mode: ResponseMode, scale: number, percent: number): string {
  if (mode === 'scale') {
    const n = Math.round(Math.min(5, Math.max(1, scale)));
    return `scale:${n}`;
  }
  const p = Math.round(Math.min(100, Math.max(0, percent)));
  return `${p}%`;
}

/** Labels aligned with session log UI (stored as scale:1 … scale:5). */
export const RESPONSE_SCALE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function scaleToLabel(n: number): string {
  const k = Math.round(Math.min(5, Math.max(1, n))) as 1 | 2 | 3 | 4 | 5;
  return RESPONSE_SCALE_LABELS[k] ?? 'Good';
}

export function formatChildResponseDisplay(raw: string | undefined): string {
  const s = String(raw || '').trim();
  if (!s) return '—';
  const m = s.match(/^scale\s*:\s*([1-5])$/i);
  if (m) {
    const n = Number(m[1]) as 1 | 2 | 3 | 4 | 5;
    return RESPONSE_SCALE_LABELS[n] ? `${RESPONSE_SCALE_LABELS[n]} (${n}/5)` : `Scale ${m[1]}/5`;
  }
  if (/%/.test(s) || /^\d+$/.test(s)) {
    const num = s.match(/(\d+(?:\.\d+)?)/);
    if (num) return s.includes('%') ? `${num[1]}%` : `${num[1]}%`;
  }
  return s;
}

export function parseChildResponseToForm(raw: string | undefined): { mode: ResponseMode; scale: number; percent: number } {
  const s = String(raw || '').trim();
  const scaleM = s.match(/^scale\s*:\s*([1-5])$/i);
  if (scaleM) {
    return { mode: 'scale', scale: Number(scaleM[1]), percent: 0 };
  }
  const num = s.match(/(\d+(?:\.\d+)?)/);
  if (num && (s.includes('%') || /^\d+\.?\d*$/.test(s))) {
    const p = Math.min(100, Math.max(0, Number(num[1])));
    return { mode: 'percent', scale: 3, percent: p };
  }
  return { mode: 'scale', scale: 3, percent: 75 };
}
