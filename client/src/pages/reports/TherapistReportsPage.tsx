import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { reportAPI, therapistAPI } from '../../api';
import {
  ReportCard,
  ReportCardSkeleton,
  ReportFilters,
  type CaseOption,
  ReportViewerDialog,
  GenerateReportModal,
  type ReportListRow,
  reportTypeLabel,
} from '../../components/reports';
import { toast } from 'sonner';

const PAGE_SIZE = 12;

function ReportsEmptyIllustration() {
  return (
    <div
      className="mx-auto flex h-40 w-full max-w-md items-center justify-center rounded-2xl border/80 bg-gradient-to-b from-blue-50/50 to-white"
      aria-hidden
    >
      <svg viewBox="0 0 240 120" className="h-28 w-full max-w-xs text-blue-200" fill="none">
        <rect x="32" y="24" width="176" height="72" rx="8" className="stroke-blue-300" strokeWidth="1.5" fill="white" />
        <path d="M48 44h96M48 56h72M48 68h120" className="stroke-blue-200" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="188" cy="52" r="14" className="stroke-yellow-400" strokeWidth="1.5" fill="#fffbeb" />
        <path d="M182 52l4 4 8-10" className="stroke-yellow-500" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function TherapistReportsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('__all__');
  const [caseFilter, setCaseFilter] = useState('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [caseOptions, setCaseOptions] = useState<CaseOption[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  const [rows, setRows] = useState<ReportListRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerType, setViewerType] = useState('');
  const [viewerPayload, setViewerPayload] = useState<Record<string, unknown> | null>(null);
  const [viewerNameHint, setViewerNameHint] = useState<string | undefined>();

  const loadCaseOptions = useCallback(async () => {
    setLoadingCases(true);
    try {
      const res = await therapistAPI.getDashboardSummary();
      const assigned = Array.isArray(res.data?.data?.assignedCases) ? res.data.data.assignedCases : [];
      const uniq = new Map<string, CaseOption>();
      for (const row of assigned) {
        const id = String(row?.caseId || '');
        if (!id) continue;
        if (!uniq.has(id)) uniq.set(id, { caseId: id, childName: String(row?.childName || 'Child') });
      }
      setCaseOptions(Array.from(uniq.values()));
    } catch {
      setCaseOptions([]);
    } finally {
      setLoadingCases(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingRows(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (caseFilter !== '__all__') params.caseId = caseFilter;
      if (typeFilter !== '__all__') params.type = typeFilter;
      if (dateFrom) params.from = new Date(`${dateFrom}T00:00:00`).toISOString();
      if (dateTo) params.to = new Date(`${dateTo}T23:59:59.999`).toISOString();
      const res = await reportAPI.listMine(params);
      setRows((res.data?.data || []) as ReportListRow[]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to load reports';
      setError(msg);
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }, [caseFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    void loadCaseOptions();
  }, [loadCaseOptions]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, caseFilter, dateFrom, dateTo]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = String(r.childName || '').toLowerCase();
      const label = reportTypeLabel(r.type).toLowerCase();
      const raw = String(r.type || '').toLowerCase();
      return name.includes(q) || label.includes(q) || raw.includes(q);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('__all__');
    setCaseFilter('__all__');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const openViewer = async (id: string, nameHint?: string) => {
    setViewerOpen(true);
    setViewerLoading(true);
    setViewerType('');
    setViewerPayload(null);
    setViewerNameHint(nameHint);
    try {
      const res = await reportAPI.getById(id);
      const d = res.data?.data;
      setViewerType(String(d?.type || ''));
      setViewerPayload((d?.data || {}) as Record<string, unknown>);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to load report');
      setViewerOpen(false);
    } finally {
      setViewerLoading(false);
    }
  };

  const handleGenerate = async (caseId: string, reportType: string) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await reportAPI.generate({ caseId, type: reportType });
      const id = String(res.data?.data?.reportId || '');
      toast.success('Report generated');
      setGenerateOpen(false);
      await loadReports();
      if (id) {
        const hint = caseOptions.find((c) => c.caseId === caseId)?.childName;
        await openViewer(id, hint);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to generate report';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const defaultCaseForModal = caseOptions[0]?.caseId;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            View and manage all generated therapy reports
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setGenerateOpen(true)}
          className="h-11 shrink-0 rounded-xl border-2 border-yellow-200 bg-blue-600 px-5 text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </header>

      {error && !loadingRows ? (
        <div className="rounded-2xl border bg-muted/90 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <ReportFilters
        search={search}
        onSearchChange={setSearch}
        reportType={typeFilter}
        onReportTypeChange={setTypeFilter}
        caseId={caseFilter}
        onCaseIdChange={setCaseFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onReset={resetFilters}
        caseOptions={caseOptions}
        loadingCases={loadingCases}
      />

      <section className="space-y-4" aria-busy={loadingRows}>
        {loadingRows ? (
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ReportCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-2xl border/90 bg-card px-6 py-14 text-center shadow-sm">
            <ReportsEmptyIllustration />
            <h2 className="mt-6 text-lg font-semibold text-foreground">No reports generated yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              When you generate reports from here or from a child&apos;s case file, they will appear in this list.
            </p>
            <Button
              type="button"
              className="mt-6 rounded-xl border-2 border-yellow-200 bg-blue-600 px-6 text-white hover:bg-blue-700"
              onClick={() => setGenerateOpen(true)}
              disabled={caseOptions.length === 0}
            >
              Generate your first report
            </Button>
            {caseOptions.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Assign a case to generate reports.</p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {pageRows.map((row) => (
                <ReportCard key={row.id} row={row} onView={() => void openViewer(row.id, row.childName)} />
              ))}
            </div>

            {filteredRows.length > PAGE_SIZE ? (
              <div className="flex flex-col items-center justify-between gap-3 border-t border pt-6 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <GenerateReportModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        caseOptions={caseOptions}
        loadingCases={loadingCases}
        defaultCaseId={defaultCaseForModal}
        onSubmit={handleGenerate}
        submitting={generating}
      />

      <ReportViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        loading={viewerLoading}
        reportType={viewerType}
        payload={viewerPayload}
        titleExtra={viewerNameHint}
      />
    </div>
  );
}
