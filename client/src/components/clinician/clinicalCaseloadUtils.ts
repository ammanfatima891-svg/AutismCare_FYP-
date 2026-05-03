import type { CaseloadEngineEntry } from './useClinicianCaseloadEngines';

export function urgencyScore(entry: CaseloadEngineEntry): number {
  const eng = entry.engine;
  if (!eng) return entry.loadError ? 5 : 0;
  const status = String(eng.overallClinicalStatus || 'on_track');
  let s = 0;
  if (status === 'high_concern') s += 100;
  else if (status === 'needs_attention') s += 50;
  if (String(eng.overallTrend) === 'declining' || String(eng.shortTermTrend) === 'declining') s += 35;
  const conf = (eng.confidence as { overall?: number } | undefined)?.overall ?? 1;
  if (conf < 0.4) s += 25;
  if (eng.actionRequired === true) s += 15;
  const alerts = Array.isArray(eng.smartAlerts) ? eng.smartAlerts : [];
  s += alerts.filter((a: { severity?: string }) => String(a?.severity).toLowerCase() === 'critical').length * 20;
  s += alerts.filter((a: { severity?: string }) => String(a?.severity).toLowerCase() === 'warning').length * 8;
  return s;
}

export function isAtRisk(entry: CaseloadEngineEntry): boolean {
  const eng = entry.engine;
  if (!eng && entry.loadError) return true;
  if (!eng) return false;
  if (eng.actionRequired === true) return true;
  const st = String(eng.overallClinicalStatus || '');
  if (st === 'high_concern' || st === 'needs_attention') return true;
  if (String(eng.overallTrend) === 'declining' || String(eng.shortTermTrend) === 'declining') return true;
  const conf = (eng.confidence as { overall?: number } | undefined)?.overall ?? 1;
  const rawSessions =
    eng.sessionsCounted ??
    (eng._meta as { sessionsCounted?: number } | undefined)?.sessionsCounted;
  const sessionsN = Number(rawSessions ?? 0);
  if (conf < 0.4 && sessionsN > 0) {
    return true;
  }
  const alerts = Array.isArray(eng.smartAlerts) ? eng.smartAlerts : [];
  return alerts.some((a: { severity?: string }) => String(a?.severity).toLowerCase() === 'critical');
}

export function sortCaseloadByUrgency(entries: CaseloadEngineEntry[]): CaseloadEngineEntry[] {
  return [...entries].sort((a, b) => urgencyScore(b) - urgencyScore(a));
}
