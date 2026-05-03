import { useCallback, useEffect, useState } from 'react';
import { clinicianAPI } from '../../api';
import type { CaseloadHealth } from './CaseloadHealthSummary';

type CaseRow = {
  _id: string;
  childName: string;
  parentName?: string;
  riskLevel?: string;
  status?: string;
  updatedAt?: string;
};

export type CaseloadEngineEntry = {
  row: CaseRow;
  engine: Record<string, unknown> | null;
  loadError: string | null;
};

type ApiCaseRow = {
  caseId: string;
  childName: string;
  status?: string;
  riskLevel?: string;
  updatedAt?: string;
  loadError?: string | null;
  snapshot?: Record<string, unknown> | null;
};

export function useClinicianCaseloadEngines() {
  const [entries, setEntries] = useState<CaseloadEngineEntry[]>([]);
  const [health, setHealth] = useState<CaseloadHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await clinicianAPI.getCaseloadProgress();
      const payload = data as {
        data?: { cases?: ApiCaseRow[]; health?: CaseloadHealth };
      };
      const cases = Array.isArray(payload?.data?.cases) ? payload.data.cases : [];
      setHealth(payload?.data?.health ?? null);

      const built: CaseloadEngineEntry[] = cases.map((c) => ({
        row: {
          _id: c.caseId,
          childName: c.childName,
          riskLevel: c.riskLevel,
          status: c.status,
          updatedAt: c.updatedAt,
        },
        engine:
          c.snapshot && typeof c.snapshot === 'object'
            ? ({ caseId: c.caseId, ...c.snapshot } as Record<string, unknown>)
            : null,
        loadError: c.loadError || null,
      }));
      setEntries(built);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Failed to load caseload progress');
      setEntries([]);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { entries, health, loading, error, reload: load };
}
