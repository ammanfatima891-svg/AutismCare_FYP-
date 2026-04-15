import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { therapistAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2 } from 'lucide-react';
import { CaseProgressAnalyticsDashboard } from './CaseProgressAnalyticsDashboard';

type CaseOption = { caseId: string; childName: string };

function normalizeCaseId(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'object' && '_id' in (raw as object)) {
    const id = (raw as { _id?: unknown })._id;
    return id != null ? String(id) : '';
  }
  return String(raw);
}

/**
 * Therapist dashboard → Progress Analytics: pick an assigned case to view aggregated analytics.
 */
export function TherapistProgressHub() {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await therapistAPI.getDashboardSummary();
      const raw = res.data?.data?.assignedCases;
      const list: CaseOption[] = Array.isArray(raw)
        ? raw.map((c: { caseId?: unknown; childName?: string }) => ({
            caseId: normalizeCaseId(c.caseId),
            childName: c.childName || 'Child',
          }))
        : [];
      setCases(list.filter((c) => c.caseId));
      setSelectedCaseId((prev) => {
        if (prev && list.some((c) => c.caseId === prev)) return prev;
        return list[0]?.caseId || '';
      });
    } catch {
      setCases([]);
      setSelectedCaseId('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedName = cases.find((c) => c.caseId === selectedCaseId)?.childName;

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <Card className="max-w-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-bold text-foreground">Progress analytics</CardTitle>
          <CardDescription>
            Accept a referral and start therapy on a case to see session-based analytics here. You can also open{' '}
            <strong>Assigned Cases</strong> and use the case file&apos;s Progress tab.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Title + copy first; Case control on its own row so nothing can overlap the heading (flex side-by-side was colliding in some viewports). */}
      <div className="space-y-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">Progress analytics</h2>
          <p
            className="mt-1 text-sm text-muted-foreground whitespace-nowrap overflow-x-auto [scrollbar-width:thin]"
            title="Data is computed from session logs, therapy plan goals, and home assignments for the selected case."
          >
            Data is computed from session logs, therapy plan goals, and home assignments for the selected case.
          </p>
        </div>
        <div className="w-full max-w-[min(100%,220px)] space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground" htmlFor="progress-case-select">
            Case
          </Label>
          <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
            <SelectTrigger
              id="progress-case-select"
              className="h-9 w-full border bg-card"
            >
              <SelectValue placeholder="Select case" />
            </SelectTrigger>
            <SelectContent className="z-[100]" position="popper" sideOffset={4}>
              {cases.map((c) => (
                <SelectItem key={c.caseId} value={c.caseId}>
                  {c.childName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCaseId ? (
        <>
          <p className="text-sm text-muted-foreground">
            Case detail:{' '}
            <Link
              to={`/therapist/case/${selectedCaseId}?tab=progress`}
              className="font-medium text-blue-800 underline-offset-4 hover:underline"
            >
              Open case file (Progress tab)
            </Link>
          </p>
          <CaseProgressAnalyticsDashboard key={selectedCaseId} caseId={selectedCaseId} childLabel={selectedName} />
        </>
      ) : null}
    </div>
  );
}
