/**
 * Unwrap GET /api/therapy-plan/:caseId (and similar) payloads whether the plan
 * lives at res.data.data or is already the plan object.
 */
export function therapyPlanFromApiResponse(data: unknown): Record<string, unknown> | null {
  if (data == null || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (
    'shortTermGoals' in d ||
    'domains' in d ||
    'caseId' in d ||
    'therapistId' in d ||
    'activities' in d ||
    'goals' in d ||
    'longTermGoal' in d
  ) {
    return d as Record<string, unknown>;
  }
  if ('therapyPlan' in d && d.therapyPlan != null && typeof d.therapyPlan === 'object') {
    return therapyPlanFromApiResponse(d.therapyPlan);
  }
  if ('data' in d && d.data != null && typeof d.data === 'object') {
    return therapyPlanFromApiResponse(d.data);
  }
  return null;
}

/** Backend may send an array or (legacy) a map-like object. */
export function normalizeShortTermGoalsList(
  raw: unknown
): {
  _id?: string;
  goalKey?: string;
  title?: string;
  domain?: string;
  status?: string;
  measurement?: { type?: string; unit?: string };
  masteryRule?: { threshold?: number; window?: number; minSessions?: number; ruleType?: string };
}[] {
  if (Array.isArray(raw)) return raw.filter(Boolean) as ReturnType<typeof normalizeShortTermGoalsList>;
  if (raw && typeof raw === 'object')
    return Object.values(raw as object).filter(Boolean) as ReturnType<typeof normalizeShortTermGoalsList>;
  return [];
}

/**
 * Therapy plan schema uses Active | Achieved | Modified.
 * Session logging must list all of these — filtering to "Active" only hid Modified/Achieved rows.
 */
export function isActiveGoalStatus(status: unknown): boolean {
  const s = String(status ?? '').trim().toLowerCase();
  if (!s) return true;
  if (s === 'retired' || s === 'onhold') return false;
  return s === 'active' || s === 'achieved' || s === 'modified';
}
