import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { therapyAPI } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2, AlertCircle } from 'lucide-react';

interface TherapyOversightTabProps {
  caseId: string;
}

function responseBadgeClass(value: string) {
  const v = String(value || '').toLowerCase();
  if (v.includes('good') || v.includes('positive')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (v.includes('moderate')) return 'bg-amber-100 text-amber-900 border-amber-200';
  if (v.includes('poor') || v.includes('low')) return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-300';
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
          <h3 className="text-xl font-semibold text-slate-900">Therapy Oversight</h3>
          <p className="text-sm text-slate-600">
            Read-only therapy plan, goals, and session data with clinician recommendations.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
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
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 bg-blue-50/40">
              <CardTitle className="text-base text-blue-900">Read-only Therapy Data</CardTitle>
              <CardDescription>Clinicians can monitor only; no edits to therapist-owned records.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Therapy Plan</h4>
                {!hasPlan ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No therapy started yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Domains</p>
                      {Array.isArray(plan.domains) && plan.domains.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {plan.domains.map((d: string) => (
                            <Badge key={d} variant="outline">{d}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700">No domains listed.</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Long-term Goals</p>
                        {goals.longTermGoals?.length ? (
                          <ul className="space-y-1 text-sm text-slate-800">
                            {goals.longTermGoals.map((g: any, idx: number) => (
                              <li key={`${g.title}-${idx}`}>• {g.title}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-600">No long-term goals</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Short-term Goals</p>
                        {goals.shortTermGoals?.length ? (
                          <ul className="space-y-1 text-sm text-slate-800">
                            {goals.shortTermGoals.map((g: any, idx: number) => (
                              <li key={`${g.title}-${idx}`}>• {g.title}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-600">No short-term goals</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Activities</p>
                      {Array.isArray(plan.activities) && plan.activities.length > 0 ? (
                        <ul className="space-y-1 text-sm text-slate-800">
                          {plan.activities.map((a: any, idx: number) => (
                            <li key={`${a.title}-${idx}`}>• {a.title}{a.linkedGoal ? ` (${a.linkedGoal})` : ''}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-600">No activities listed.</p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Session Logs</h4>
                {!hasSessions ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No sessions logged yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div key={s._id} className="rounded-lg border border-slate-200 p-3 bg-white">
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                          <p className="text-sm font-medium text-slate-900">
                            {new Date(s.sessionDate).toLocaleDateString()} • {s.duration || 0} mins
                          </p>
                          <Badge variant="outline" className={responseBadgeClass(s.childResponse)}>
                            {s.childResponse || 'n/a'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Goals: {Array.isArray(s.goalsTargeted) ? s.goalsTargeted.join(', ') || '—' : '—'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Activities: {Array.isArray(s.activitiesUsed) ? s.activitiesUsed.join(', ') || '—' : '—'}
                        </p>
                        {s.notes ? <p className="text-sm text-slate-700 mt-2">{s.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 bg-blue-50/40">
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

              <div className="pt-2 border-t border-slate-100">
                {notes.length === 0 ? (
                  <p className="text-sm text-slate-600">No recommendations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((n) => {
                      const name = n.createdBy
                        ? `${n.createdBy.firstName || ''} ${n.createdBy.lastName || ''}`.trim()
                        : 'Clinician';
                      return (
                        <div key={n._id} className="rounded-lg border border-slate-200 p-3 bg-white">
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.note}</p>
                          <p className="text-xs text-slate-500 mt-2">
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
