/**
 * Dedicated full-page session log: /therapist/sessions/new?caseId=
 * After save → /therapist/sessions, or case file Sessions tab if opened with ?caseId=
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { therapistAPI, therapyPlanAPI, sessionAPI } from '../../api';
import { SessionForm, type TherapyPlanLike } from '../../components/session/SessionForm';
import type { SessionRow } from '../../components/session/SessionList';
import { normalizeShortTermGoalsList, therapyPlanFromApiResponse } from '../../utils/therapyPlanResponse';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';

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
  const sessionId = searchParams.get('sessionId')?.trim() || '';
  const [editSession, setEditSession] = useState<SessionRow | null>(null);
  const [sessionEditError, setSessionEditError] = useState<string | null>(null);
  const [sessionEditLoading, setSessionEditLoading] = useState(false);

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

  useEffect(() => {
    if (!sessionId || !/^[a-fA-F0-9]{24}$/.test(sessionId)) {
      setEditSession(null);
      setSessionEditError(null);
      setSessionEditLoading(false);
      return;
    }
    if (!selectedCaseId || !/^[a-fA-F0-9]{24}$/.test(selectedCaseId)) {
      setEditSession(null);
      setSessionEditError(null);
      setSessionEditLoading(false);
      return;
    }
    let cancelled = false;
    setSessionEditLoading(true);
    setSessionEditError(null);
    setEditSession(null);
    void (async () => {
      try {
        const res = await sessionAPI.getByCase(selectedCaseId);
        const list = (res.data as { data?: SessionRow[] })?.data || [];
        const found = list.find((x) => String(x._id) === sessionId) || null;
        if (!cancelled) {
          if (found) setEditSession(found);
          else setSessionEditError('Session not found for this case.');
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        if (!cancelled) {
          setSessionEditError(err.response?.data?.message || 'Failed to load session');
        }
      } finally {
        if (!cancelled) setSessionEditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, selectedCaseId]);

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-muted/50 via-background to-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your cases…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 via-background to-muted/30 px-4 py-12">
        <Alert variant="destructive" className="mx-auto max-w-lg">
          <AlertTriangle />
          <AlertTitle>Cannot open session log</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (sessionId && sessionEditLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-muted/50 via-background to-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  if (sessionId && sessionEditError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 via-background to-muted/30 px-4 py-12">
        <Alert variant="destructive" className="mx-auto max-w-lg">
          <AlertTriangle />
          <AlertTitle>Cannot edit session</AlertTitle>
          <AlertDescription>{sessionEditError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (caseOptions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 via-background to-muted/30 px-4 py-12">
        <Card className="mx-auto max-w-lg overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/80 bg-muted/30">
            <CardTitle className="text-lg">No cases to log</CardTitle>
            <CardDescription>You need an assigned case before logging a session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm leading-relaxed text-foreground">
              Accept a referral or start therapy for a case first, then return here.
            </p>
            <Button type="button" onClick={() => void navigate('/therapist-dashboard')}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEdit = Boolean(sessionId && editSession);

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
      mode={isEdit ? 'edit' : 'create'}
      initialSession={isEdit ? editSession : null}
      casePicker={isEdit ? null : casePicker}
      domainLabel={domainLabel}
    />
  );
}
