import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { therapyAPI, clinicianAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TherapyOversightTabProps {
  caseId: string;
}

function responseBadgeClass(value: string) {
  const v = String(value || '').toLowerCase();
  if (v.includes('good') || v.includes('positive')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (v.includes('moderate')) return 'bg-yellow-100 text-yellow-900 border-yellow-200';
  if (v.includes('poor') || v.includes('low')) return 'bg-muted text-destructive border';
  return 'bg-muted text-foreground border';
}

export function TherapyOversightTab({ caseId }: TherapyOversightTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const [plan, setPlan] = useState<any | null>(null);
  const [goals, setGoals] = useState<any>({ longTermGoals: [], shortTermGoals: [], allGoals: [] });
  const [sessions, setSessions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [approving, setApproving] = useState(false);

  const hasPlan = useMemo(() => !!plan, [plan]);
  const hasSessions = useMemo(() => sessions.length > 0, [sessions]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [planRes, goalsRes, sessionsRes, notesRes] = await Promise.all([
        therapyAPI.getPlan(caseId),
        therapyAPI.getGoals(caseId),
        therapyAPI.getSessions(caseId),
        therapyAPI.getNotes(caseId),
      ]);
      setPlan(planRes.data?.data || null);
      setGoals(goalsRes.data?.data || { longTermGoals: [], shortTermGoals: [], allGoals: [] });
      setSessions(sessionsRes.data?.data || []);
      setNotes(notesRes.data?.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load therapy oversight');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const planApprovalStatus = plan?.approval?.status ? String(plan.approval.status) : 'none';
  const planIdForApproval = plan?._id ? String(plan._id) : '';

  const approveTherapyPlan = async () => {
    if (!planIdForApproval) return;
    try {
      setApproving(true);
      setError(null);
      await clinicianAPI.approveTherapyPlan(planIdForApproval);
      toast.success('Therapy plan approved');
      await load();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to approve plan';
      setError(msg);
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  };

  const submitNote = async () => {
    const text = noteInput.trim();
    if (!text) return;
    try {
      setSavingNote(true);
      setError(null);
      await therapyAPI.addNote(caseId, text);
      setNoteInput('');
      const notesRes = await therapyAPI.getNotes(caseId);
      setNotes(notesRes.data?.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to add recommendation');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Therapy Oversight</h3>
          <p className="text-sm text-muted-foreground">
            Read-only therapy plan, goals, and session data with clinician recommendations.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <Card className="border shadow-sm bg-card">
            <CardHeader className="border-b border bg-blue-50/40">
              <CardTitle className="text-base text-blue-900">Read-only Therapy Data</CardTitle>
              <CardDescription>Clinicians can monitor only; no edits to therapist-owned records.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-2">Therapy Plan</h4>
                {!hasPlan ? (
                  <div className="rounded-lg border-dashed border bg-background p-4 text-sm text-muted-foreground">
                    No therapy started yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {planApprovalStatus === 'pending' && planIdForApproval ? (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-950">
                        <p className="font-medium">Therapy plan pending your approval</p>
                        <p className="mt-1 text-yellow-900/90">
                          Review the plan content below, then approve to record supervisory sign-off.
                        </p>
                        <Button
                          type="button"
                          className="mt-3 bg-blue-700 text-white hover:bg-blue-800"
                          disabled={approving}
                          onClick={() => void approveTherapyPlan()}
                        >
                          {approving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Approve therapy plan
                        </Button>
                      </div>
                    ) : null}
                    {planApprovalStatus === 'approved' ? (
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-900">
                        Plan approved by clinician
                      </Badge>
                    ) : null}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Domains</p>
                      {Array.isArray(plan.domains) && plan.domains.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {plan.domains.map((d: string) => (
                            <Badge key={d} variant="outline">{d}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-foreground">No domains listed.</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Long-term Goals</p>
                        {goals.longTermGoals?.length ? (
                          <ul className="space-y-1 text-sm text-foreground">
                            {goals.longTermGoals.map((g: any, idx: number) => (
                              <li key={`${g.title}-${idx}`}>• {g.title}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No long-term goals</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Short-term Goals</p>
                        {goals.shortTermGoals?.length ? (
                          <ul className="space-y-1 text-sm text-foreground">
                            {goals.shortTermGoals.map((g: any, idx: number) => (
                              <li key={`${g.title}-${idx}`}>• {g.title}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No short-term goals</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Activities</p>
                      {Array.isArray(plan.activities) && plan.activities.length > 0 ? (
                        <ul className="space-y-1 text-sm text-foreground">
                          {plan.activities.map((a: any, idx: number) => (
                            <li key={`${a.title}-${idx}`}>• {a.title}{a.linkedGoal ? ` (${a.linkedGoal})` : ''}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No activities listed.</p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h4 className="text-sm font-semibold text-foreground mb-2">Session Logs</h4>
                {!hasSessions ? (
                  <div className="rounded-lg border-dashed border bg-background p-4 text-sm text-muted-foreground">
                    No sessions logged yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div key={s._id} className="rounded-lg border p-3 bg-card">
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                          <p className="text-sm font-medium text-foreground">
                            {new Date(s.sessionDate).toLocaleDateString()} • {s.duration || 0} mins
                          </p>
                          <Badge variant="outline" className={responseBadgeClass(s.childResponse)}>
                            {s.childResponse || 'n/a'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Goals: {Array.isArray(s.goalsTargeted) ? s.goalsTargeted.join(', ') || '—' : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Activities: {Array.isArray(s.activitiesUsed) ? s.activitiesUsed.join(', ') || '—' : '—'}
                        </p>
                        {s.notes ? <p className="text-sm text-foreground mt-2">{s.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card">
            <CardHeader className="border-b border bg-blue-50/40">
              <CardTitle className="text-base text-blue-900">Clinician Recommendations</CardTitle>
              <CardDescription>Add read-only oversight notes for therapist reference.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Add Recommendation</Label>
                <Textarea
                  rows={4}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add clinical recommendation for therapist and care team."
                />
              </div>
              <Button onClick={submitNote} disabled={savingNote || !noteInput.trim()} className="bg-blue-600 hover:bg-blue-700">
                {savingNote ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Recommendation
              </Button>

              <div className="pt-2 border-t border">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recommendations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((n) => {
                      const name = n.createdBy
                        ? `${n.createdBy.firstName || ''} ${n.createdBy.lastName || ''}`.trim()
                        : 'Clinician';
                      return (
                        <div key={n._id} className="rounded-lg border p-3 bg-card">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{n.note}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {name} • {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
