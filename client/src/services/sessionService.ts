import { sessionAPI } from '../api';

/** Normalize Axios / API error bodies for user-visible messages. */
export function getSessionApiErrorMessage(e: unknown): string {
  const err = e as {
    response?: { data?: unknown; status?: number };
    message?: string;
    code?: string;
  };
  const d = err.response?.data;
  if (typeof d === 'string' && d.trim()) return d.trim();
  if (d && typeof d === 'object') {
    const o = d as { message?: string; error?: string; success?: boolean };
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (typeof o.error === 'string' && o.error.trim()) return o.error.trim();
  }
  if (err.code === 'ERR_NETWORK') {
    return 'Network error — check that the API server is running and VITE_API_BASE_URL is correct.';
  }
  return err.message?.trim() || 'Request failed';
}

export type SessionPayload = {
  caseId?: string;
  sessionDate: string;
  duration: number;
  goalsTargeted: string[];
  activitiesUsed: string[];
  childResponse: string;
  notes?: string;
  parentInstructions?: string;
  status: string;
  /** Optional link to a scheduled SessionSlot — persisted on SessionLog; server marks slot completed. */
  sessionSlotId?: string;
};

export async function createSession(payload: SessionPayload) {
  const { data } = await sessionAPI.create(payload);
  return data;
}

export async function updateSession(id: string, payload: Partial<SessionPayload>) {
  const { data } = await sessionAPI.update(id, payload);
  return data;
}

export async function fetchSessionsForCase(caseId: string) {
  const { data } = await sessionAPI.getByCase(caseId);
  return data;
}

export async function fetchAllSessionsForTherapist() {
  const { data } = await sessionAPI.listAll();
  return data;
}
