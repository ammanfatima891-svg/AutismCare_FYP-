import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { GENERATE_TYPE_OPTIONS } from './reportLabels';
import type { CaseOption } from './ReportFilters';

export function GenerateReportModal({
  open,
  onOpenChange,
  caseOptions,
  loadingCases,
  defaultCaseId,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseOptions: CaseOption[];
  loadingCases: boolean;
  defaultCaseId?: string;
  onSubmit: (caseId: string, reportType: string) => Promise<void>;
  submitting: boolean;
}) {
  const [caseId, setCaseId] = useState<string>('');
  const [reportType, setReportType] = useState<string>('monthly');

  React.useEffect(() => {
    if (!open) return;
    setCaseId((prev) => {
      const validPrev = prev && caseOptions.some((c) => c.caseId === prev);
      if (validPrev) return prev;
      return defaultCaseId || caseOptions[0]?.caseId || '';
    });
  }, [open, defaultCaseId, caseOptions]);

  const typeHelp = GENERATE_TYPE_OPTIONS.find((o) => o.value === reportType)?.description;

  const handleSubmit = async () => {
    if (!caseId) return;
    await onSubmit(caseId, reportType);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[1301] gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 sm:max-w-md">
        <DialogHeader className="border-b border-slate-100 bg-sky-50/40 px-6 py-5 text-left">
          <DialogTitle className="text-lg font-semibold text-slate-900">Generate report</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Choose a child and report type. The document is built from existing case data and analytics.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Child</label>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
                <SelectValue placeholder={loadingCases ? 'Loading…' : 'Select child'} />
              </SelectTrigger>
              <SelectContent>
                {caseOptions.map((c) => (
                  <SelectItem key={c.caseId} value={c.caseId}>
                    {c.childName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Report type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[min(320px,50vh)]">
                {GENERATE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeHelp ? <p className="mt-1.5 text-xs text-slate-500">{typeHelp}</p> : null}
          </div>
        </div>
        <DialogFooter className="gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-slate-200"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl border-2 border-amber-200/90 bg-sky-600 text-white shadow-sm hover:bg-sky-700"
            disabled={submitting || !caseId}
            onClick={() => void handleSubmit()}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
