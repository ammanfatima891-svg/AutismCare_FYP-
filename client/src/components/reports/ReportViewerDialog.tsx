import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ReportDocumentView } from './ReportDocumentView';
import { reportTypeLabel } from './reportLabels';

type ChildInfo = {
  childName?: string;
  age?: number | null;
};

export function ReportViewerDialog({
  open,
  onOpenChange,
  loading,
  reportType,
  payload,
  titleExtra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  reportType: string;
  payload: Record<string, unknown> | null;
  titleExtra?: string;
}) {
  const childInfo = (payload?.childInfo as ChildInfo | undefined) || {};
  const name =
    (typeof childInfo.childName === 'string' && childInfo.childName) || titleExtra || 'Child';
  const generatedAt = String(payload?.generatedAt || '');

  const typeLabel = reportTypeLabel(reportType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[1300] flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0">
        <DialogHeader className="border-b border-slate-100 bg-white px-6 py-5 text-left">
          <DialogTitle className="pr-8 text-xl font-semibold text-slate-900">
            {typeLabel} report
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{name}</span>
            {typeof childInfo.age === 'number' ? (
              <span className="text-slate-500"> · Age {childInfo.age}</span>
            ) : null}
            {generatedAt ? (
              <span className="mt-1 block text-xs text-slate-500">
                Generated {new Date(generatedAt).toLocaleString()}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-4 py-5 sm:px-6">
          {loading ? (
            <div className="space-y-3 animate-pulse px-1">
              <div className="h-8 rounded-lg bg-slate-200/80" />
              <div className="h-32 rounded-2xl bg-white shadow-sm" />
              <div className="h-32 rounded-2xl bg-white shadow-sm" />
              <div className="h-32 rounded-2xl bg-white shadow-sm" />
            </div>
          ) : payload ? (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <ReportDocumentView reportType={reportType} payload={payload} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No report data.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
