import React, { useCallback, useEffect, useState } from 'react';
import { reportAPI } from '../../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { ReportDocumentView } from '../../reports/ReportDocumentView';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { cn } from '../../ui/utils';

const REPORT_OPTIONS = [
  { value: 'monthly', label: 'Monthly therapy report' },
  { value: 'iep', label: 'IEP summary' },
  { value: 'clinician', label: 'Clinician report' },
  { value: 'parent', label: 'Parent-friendly report' },
] as const;

type ReportRow = {
  id: string;
  type: string;
  generatedAt: string;
  insufficientData?: boolean;
};

export function ReportsCaseTab({ caseId }: { caseId: string }) {
  const [list, setList] = useState<ReportRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ type: string; data: Record<string, unknown> } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadList = useCallback(async () => {
    if (!caseId) return;
    setLoadingList(true);
    setError(null);
    try {
      const res = await reportAPI.listByCase(caseId);
      const rows = (res.data?.data || []) as ReportRow[];
      setList(rows);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to load reports');
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadDetail = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await reportAPI.getById(id);
      const d = res.data?.data;
      setDetail({
        type: d?.type || '',
        data: (d?.data || {}) as Record<string, unknown>,
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to load report');
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const generate = async (type: string) => {
    setGenerating(type);
    setError(null);
    try {
      const res = await reportAPI.generate({ caseId, type });
      const body = res.data?.data;
      const id = body?.reportId;
      await loadList();
      if (id) {
        await loadDetail(String(id));
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-sky-50/50">
          <CardTitle className="flex items-center gap-2 text-base text-sky-900">
            <FileText className="h-5 w-5 text-sky-600" />
            Reports
          </CardTitle>
          <CardDescription>
            Auto-generated from this case&apos;s therapy plan, sessions, home assignments, and analytics. Reports are
            read-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Generate</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-sky-200 bg-white text-sky-900 hover:bg-sky-50"
                  disabled={!!generating}
                  onClick={() => generate(opt.value)}
                >
                  {generating === opt.value ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => void loadList()} disabled={loadingList}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loadingList && 'animate-spin')} />
              Refresh list
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <p className="mb-2 text-slate-600">Generated reports</p>
              {loadingList ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : list.length === 0 ? (
                <p className="text-sm text-slate-500">None yet — use the buttons above.</p>
              ) : (
                <Select
                  value={selectedId || undefined}
                  onValueChange={(v) => {
                    void loadDetail(v);
                  }}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select a report" />
                  </SelectTrigger>
                  <SelectContent>
                    {list.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.type} · {new Date(r.generatedAt).toLocaleString()}
                        {r.insufficientData ? ' (partial)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="min-h-[120px] rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              {loadingDetail ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                </div>
              ) : detail ? (
                <div className="print:print-friendly">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {detail.type} · generated {String(detail.data?.generatedAt || '')}
                  </p>
                  <ReportDocumentView reportType={detail.type} payload={detail.data} />
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">Select a report to preview.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
