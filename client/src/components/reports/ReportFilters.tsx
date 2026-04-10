import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { REPORT_TYPE_FILTER_OPTIONS } from './reportLabels';

export type CaseOption = { caseId: string; childName: string };

export function ReportFilters({
  search,
  onSearchChange,
  reportType,
  onReportTypeChange,
  caseId,
  onCaseIdChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onReset,
  caseOptions,
  loadingCases,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  reportType: string;
  onReportTypeChange: (v: string) => void;
  caseId: string;
  onCaseIdChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReset: () => void;
  caseOptions: CaseOption[];
  loadingCases: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by child name or report type"
              className="h-10 rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
        </div>

        <div className="min-w-[160px] flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Report type</label>
          <Select value={reportType} onValueChange={onReportTypeChange}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPE_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px] flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Child</label>
          <Select value={caseId} onValueChange={onCaseIdChange}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
              <SelectValue placeholder={loadingCases ? 'Loading…' : 'All children'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All children</SelectItem>
              {caseOptions.map((c) => (
                <SelectItem key={c.caseId} value={c.caseId}>
                  {c.childName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:max-w-xs">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-10 rounded-xl border-slate-200 bg-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-10 rounded-xl border-slate-200 bg-white"
            />
          </div>
        </div>

        <div className="flex w-full justify-end lg:w-auto lg:pb-0.5">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 text-slate-700"
            onClick={onReset}
          >
            Reset filters
          </Button>
        </div>
      </div>
    </div>
  );
}
