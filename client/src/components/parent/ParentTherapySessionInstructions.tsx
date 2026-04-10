import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { parentAPI } from '../../api';
import { Loader2 } from 'lucide-react';

type Item = {
  _id?: string;
  sessionDate?: string;
  parentInstructions?: string;
  childName?: string;
  status?: string;
};

export function ParentTherapySessionInstructions({ childId }: { childId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await parentAPI.getTherapySessionInstructions({ childId: String(childId) });
        const body = res.data as { data?: Item[] };
        if (!cancelled) setItems(Array.isArray(body?.data) ? body.data : []);
      } catch {
        if (!cancelled) {
          setError('Could not load therapist instructions');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          Loading therapist instructions…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-sky-50/40">
        <CardTitle className="text-base text-sky-950">Instructions from therapy sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {items.map((row) => (
          <div key={String(row._id)} className="rounded-lg border border-slate-200 bg-slate-50/30 p-4">
            <p className="text-xs text-slate-500">
              {row.sessionDate ? new Date(row.sessionDate).toLocaleString() : '—'}
              {row.status ? ` · ${row.status}` : ''}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{row.parentInstructions}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
