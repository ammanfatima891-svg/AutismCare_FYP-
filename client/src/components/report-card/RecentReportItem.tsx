import React from 'react';
import { Calendar, Download, Eye, FileText } from 'lucide-react';
import { Button } from '../ui/button';

export type RecentReportRow = {
  id: string;
  caseId: string;
  type: string;
  childName: string;
  generatedAt: string;
  insufficientData?: boolean;
};

export function RecentReportItem({
  row,
  title,
  description,
  onPreview,
  onDownload,
}: {
  row: RecentReportRow;
  title: string;
  description: string;
  onPreview: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-5 last:border-b-0 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xl font-semibold text-slate-900">{title}</h4>
            <span className="rounded-full bg-slate-950 px-2.5 py-0.5 text-xs font-semibold uppercase text-white">
              {row.insufficientData ? 'Partial' : 'Ready'}
            </span>
          </div>
          <p className="mt-0.5 text-lg text-sky-700">{row.childName || 'Child'}</p>
          <p className="mt-1 text-slate-600">{description}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            Generated: {new Date(row.generatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  );
}
