/**
 * Dedicated full-page session log: /therapist/sessions/new?caseId=
 * After save → /therapist/sessions, or case file Sessions tab if opened with ?caseId=
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { therapistAPI, therapyPlanAPI } from '../../api';
import { SessionForm, type TherapyPlanLike } from '../../components/session/SessionForm';
import { normalizeShortTermGoalsList, therapyPlanFromApiResponse } from '../../utils/therapyPlanResponse';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Loader2 } from 'lucide-react';

type CaseOpt = { caseId: string; label: string };

export default function LogTherapySessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [caseOptions, setCaseOptions] = useState<CaseOpt[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  /** undefined = not loaded yet; null = loaded, no document; object = plan */
  const [therapyPlan, setTherapyPlan] = useState<TherapyPlanLike | undefined>(undefined);
  const [therapyPlanError, setTherapyPlanError] = useState<string | null>(null);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    const oid = (s: string) => /^[a-fA-F0-9]{24}$/.test(s);
    try {
      setLoadingCases(true);
      setLoadError(null);
      const axiosRes = await therapistAPI.getDashboardSummary();
      const payload = axiosRes.data?.data as { assignedCases?: unknown } | undefined;
      const raw = payload?.assignedCases;
      const list = Array.isArray(raw)
        ? raw.map((c: { caseId?: string; childName?: string }) => ({
            caseId: String(c.caseId || ''),
            label: String(c.childName || 'Child'),
          }))
        : [];
      const filtered = list.filter((x) => x.caseId);
      const fromUrl = searchParams.get('caseId')?.trim() || '';

      if (fromUrl && !oid(fromUrl)) {
        setCaseOptions(filtered);
        setSelectedCaseId('');
        setLoadError('Invalid case link.');
        return;
      }

      let merged = filtered;
      let selected = '';

      if (fromUrl) {
        if (filtered.some((c) => c.caseId === fromUrl)) {
          selected = fromUrl;
        } else {
          try {
            const { data: res } = await therapistAPI.getCaseFile(fromUrl);
            const child = res?.data?.child as { firstName?: string; lastName?: string } | undefined;
            const name = child ? `${child.firstName || ''} ${child.lastName || ''}`.trim() : 'Child';
            merged = [...filtered, { caseId: fromUrl, label: name || 'Child' }];
            selected = fromUrl;
          } catch {
            setLoadError('Case not found or you do not have access to this case.');
            merged = filtered;
            selected = '';
          }
        }
      } else if (filtered.length === 1) {
        selected = filtered[0].caseId;
      }

      setCaseOptions(merged);
      setSelectedCaseId(selected);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setLoadError(err.response?.data?.message || 'Failed to load cases');
      setCaseOptions([]);
      setSelectedCaseId('');
    } finally {
      setLoadingCases(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (!selectedCaseId) {
      setTherapyPlan(undefined);
      setTherapyPlanError(null);
      return;
    }
    let cancelled = false;
    setTherapyPlan(undefined);
    setTherapyPlanError(null);
    void (async () => {
      try {
        const axiosRes = await therapyPlanAPI.getByCase(selectedCaseId);
        const extracted = therapyPlanFromApiResponse(axiosRes.data);
        const plan = extracted ? (extracted as unknown as TherapyPlanLike) : null;
        const stList = normalizeShortTermGoalsList(plan?.shortTermGoals);
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console -- session logging debug
          console.log('[LogTherapySessionPage] API Response:', axiosRes.data);
          // eslint-disable-next-line no-console -- session logging debug
          console.log('[LogTherapySessionPage] Case ID:', selectedCaseId, 'Goals:', stList);
          // eslint-disable-next-line no-console -- session logging debug
          console.info('[LogTherapySessionPage] GET /therapy-plan payload', {
            rawKeys: axiosRes.data && typeof axiosRes.data === 'object' ? Object.keys(axiosRes.data as object) : [],
            shortTermGoalsCount: stList.length,
            goals: stList.map((g) => ({ title: g.title, status: g.status, domain: g.domain })),
          });
        }
        if (!cancelled) {
          setTherapyPlan(plan);
          setTherapyPlanError(null);
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        const msg = err.response?.data?.message || 'Failed to load therapy plan';
        if (!cancelled) {
          setTherapyPlan(null);
          setTherapyPlanError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCaseId]);

  const domainLabel = useMemo(() => {
    const d = therapyPlan?.domains;
    if (Array.isArray(d) && d.length > 0) return String(d[0]);
    return '';
  }, [therapyPlan]);

  const casePicker = useMemo(() => {
    if (caseOptions.length === 0) return null;
    return {
      options: caseOptions,
      value: selectedCaseId,
      onChange: (id: string) => setSelectedCaseId(id),
    };
  }, [caseOptions, selectedCaseId]);

  const handleSaved = useCallback(async () => {
    const cid = searchParams.get('caseId')?.trim();
    if (cid && /^[a-fA-F0-9]{24}$/.test(cid)) {
      await navigate(`/therapist/case/${cid}?tab=sessions`, { replace: true });
      return;
    }
    await navigate('/therapist/sessions', { replace: true });
  }, [navigate, searchParams]);

  if (loadingCases) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
      </div>
    );
  }

  if (caseOptions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <Card className="mx-auto max-w-lg border-slate-200">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-slate-700">No active assigned cases are available. Accept a referral or start therapy for a case before logging sessions.</p>
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => void navigate('/therapist-dashboard')}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SessionForm
      variant="page"
      caseId={selectedCaseId}
      open
      onOpenChange={(open) => {
        if (!open) {
          const cid = searchParams.get('caseId')?.trim();
          if (cid && /^[a-fA-F0-9]{24}$/.test(cid)) {
            void navigate(`/therapist/case/${cid}?tab=sessions`);
            return;
          }
          void navigate('/therapist/sessions');
        }
      }}
      therapyPlan={therapyPlan}
      therapyPlanError={therapyPlanError}
      onSaved={handleSaved}
      mode="create"
      initialSession={null}
      casePicker={casePicker}
      domainLabel={domainLabel}
    />
  );
}
