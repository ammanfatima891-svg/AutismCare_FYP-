import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Loader2 } from 'lucide-react';
import { parentAPI } from '../../api';

type ActivityRef = { name?: string; materials?: string };

type Row = {
  _id?: string;
  caseId?: string;
  title?: string;
  activityName?: string;
  instructions?: string;
  materials?: string;
  dueDate?: string;
  status?: string;
  childName?: string;
  isLate?: boolean;
  activityId?: ActivityRef | string | null;
  submissionUrl?: string;
  parentSubmission?: {
    fileUrl?: string;
    submissionUrl?: string;
    fileType?: string;
    submittedAt?: string;
  };
  therapistFeedback?: {
    comment?: string | null;
    feedback?: string | null;
    rating?: number | null;
    reviewedAt?: string | null;
  };
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-slate-200 bg-slate-100 text-slate-800',
  submitted: 'border-sky-200 bg-sky-50 text-sky-900',
  reviewed: 'border-amber-200 bg-amber-50 text-amber-950',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-950',
};

function resolveUploadUrl(filePath: string) {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  const origin = base.replace(/\/api\/?$/, '');
  return `${origin}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
}

function activityTitle(a: Row) {
  const act = a.activityId && typeof a.activityId === 'object' ? a.activityId : null;
  const named = (a as Row & { activityName?: string }).activityName?.trim();
  return named || a.title?.trim() || act?.name?.trim() || 'Home activity';
}

function hasTherapistFeedback(tf: Row['therapistFeedback'] | undefined) {
  if (!tf || typeof tf !== 'object') return false;
  const c = String(tf.comment || tf.feedback || '').trim();
  if (c) return true;
  if (tf.rating != null && tf.rating > 0) return true;
  if (tf.reviewedAt) return true;
  return false;
}

export function ParentHomeAssignments() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [fileDraft, setFileDraft] = useState<Record<string, File | undefined>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await parentAPI.getHomeAssignments();
      const body = res.data as { data?: Row[] };
      setItems(Array.isArray(body?.data) ? body.data : []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to load assignments');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitFile = async (id: string, file: File | null) => {
    if (!file) {
      setError('Choose an image or video file.');
      return;
    }
    try {
      setUploadingId(id);
      setError(null);
      const fd = new FormData();
      fd.append('file', file);
      await parentAPI.submitAssignmentEvidence(id, fd);
      setFileDraft((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  const markComplete = async (id: string) => {
    try {
      setCompleteId(id);
      setError(null);
      await parentAPI.completeAssignment(id);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Could not update');
    } finally {
      setCompleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-sky-950">Home Activities</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your therapist assigns activities here. Upload photo or video evidence, then review feedback when ready.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {items.length === 0 ? (
        <Card className="border border-dashed border-sky-200 bg-white shadow-sm">
          <CardContent className="py-12 text-center text-sm text-slate-600">
            No home activities yet. When your therapist assigns one, it will appear here.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {items.map((a) => {
            const st = String(a.status || 'pending').toLowerCase();
            const badgeClass = STATUS_STYLES[st] || STATUS_STYLES.pending;
            const fb = a.therapistFeedback;
            const ps = a.parentSubmission;
            const rawUrl = a.submissionUrl || ps?.submissionUrl || ps?.fileUrl || '';
            const fileAbs = rawUrl ? resolveUploadUrl(rawUrl) : '';
            const showTherapistFeedback =
              (st === 'reviewed' || st === 'completed') && hasTherapistFeedback(fb);

            return (
              <li key={String(a._id)}>
                <Card className="border border-sky-100 bg-white shadow-sm">
                  <CardHeader className="border-b border-sky-50 pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-semibold text-sky-950">{activityTitle(a)}</CardTitle>
                        <CardDescription className="text-slate-600">
                          {a.childName || 'Child'} · Due {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}
                          {a.isLate && st === 'pending' ? (
                            <span className="ml-2 text-amber-700">· Overdue</span>
                          ) : null}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={`capitalize ${badgeClass}`}>
                        {st}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {a.instructions ? (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Instructions</p>
                        <p className="text-sm leading-relaxed text-slate-800">{a.instructions}</p>
                      </div>
                    ) : null}
                    {a.materials ? (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Materials</p>
                        <p className="text-sm text-slate-700">{a.materials}</p>
                      </div>
                    ) : null}

                    {st === 'pending' ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-4">
                        <Label className="text-slate-800">Upload photo or video</Label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                          disabled={uploadingId === String(a._id)}
                          className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-800"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            const id = String(a._id);
                            setFileDraft((prev) => ({ ...prev, [id]: f }));
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 border-slate-300 bg-slate-100 text-black hover:bg-slate-200 hover:text-black"
                          disabled={uploadingId === String(a._id) || !fileDraft[String(a._id)]}
                          onClick={() => void submitFile(String(a._id), fileDraft[String(a._id)] ?? null)}
                        >
                          {uploadingId === String(a._id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Submit activity
                        </Button>
                        <p className="mt-2 text-xs text-slate-500">Select a file, then submit. One submission per assignment.</p>
                      </div>
                    ) : null}

                    {rawUrl && st !== 'pending' ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Parent submission</p>
                        <p className="text-xs text-slate-500">{ps?.submittedAt ? new Date(ps.submittedAt).toLocaleString() : ''}</p>
                        {ps.fileType === 'image' ? (
                          <img src={fileAbs} alt="" className="mt-2 max-h-48 rounded-md border border-slate-200 object-contain" />
                        ) : ps.fileType === 'video' ? (
                          <video src={fileAbs} className="mt-2 max-h-48 w-full rounded-md border border-slate-200" controls />
                        ) : null}
                      </div>
                    ) : null}

                    {showTherapistFeedback ? (
                      <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">Therapist feedback</p>
                        {fb?.rating != null && fb.rating > 0 ? (
                          <p className="mt-1 text-sm text-sky-950">
                            Rating: <span className="font-medium">{fb.rating}/5</span>
                          </p>
                        ) : null}
                        {fb?.feedback || fb?.comment ? (
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                            {fb.feedback || fb.comment}
                          </p>
                        ) : null}
                        {fb?.reviewedAt ? (
                          <p className="mt-2 text-xs text-sky-800/90">
                            Reviewed{' '}
                            {new Date(fb.reviewedAt).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {st === 'reviewed' ? (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-sky-600 text-white hover:bg-sky-700"
                        disabled={completeId === String(a._id)}
                        onClick={() => void markComplete(String(a._id))}
                      >
                        {completeId === String(a._id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Acknowledge complete
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
