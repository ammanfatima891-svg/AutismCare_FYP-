import { useEffect, useState, useCallback } from 'react';
import { caseAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, RefreshCw, UserCircle2 } from 'lucide-react';

export interface ChildCaseListProps {
  onOpenCase: (caseId: string) => void;
}

const RISK_ALL = 'all';
const STATUS_ALL = 'all';

const riskBadgeClass: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-900 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
  unknown: 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusBadgeClass: Record<string, string> = {
  Active: 'bg-blue-100 text-blue-800 border-blue-200',
  'Under Evaluation': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Referred: 'bg-violet-100 text-violet-800 border-violet-200',
  'Ongoing Therapy': 'bg-teal-100 text-teal-800 border-teal-200',
};

type Row = {
  _id: string;
  childId: string;
  childName: string;
  parentName: string;
  parentEmail: string | null;
  riskLevel: string;
  status: string;
  updatedAt: string;
};

export function ChildCaseList({ onOpenCase }: ChildCaseListProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>(RISK_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (riskFilter !== RISK_ALL) params.riskLevel = riskFilter;
      if (statusFilter !== STATUS_ALL) params.status = statusFilter;
      const { data } = await caseAPI.list(params);
      setRows(data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load child cases');
    } finally {
      setLoading(false);
    }
  }, [riskFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Child Cases</h2>
          <p className="text-slate-600 mt-1 text-sm">
            Centralized cases linked to approved appointments, screening results, and care status.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div>
              <CardTitle className="text-lg text-slate-900">Caseload</CardTitle>
              <CardDescription>Filter by risk level and case status</CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="w-[160px]">
                <label className="text-xs font-medium text-slate-500 mb-1 block">Risk level</label>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RISK_ALL}>All risks</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[200px]">
                <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Under Evaluation">Under Evaluation</SelectItem>
                    <SelectItem value="Referred">Referred</SelectItem>
                    <SelectItem value="Ongoing Therapy">Ongoing Therapy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <UserCircle2 className="h-10 w-10 mx-auto mb-3 text-slate-400" />
              <p className="font-medium text-slate-700">No cases match your filters</p>
              <p className="text-sm mt-1">Cases are created when you approve a diagnostic appointment for a child.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-800">Child</TableHead>
                    <TableHead className="font-semibold text-slate-800">Parent / Guardian</TableHead>
                    <TableHead className="font-semibold text-slate-800">Risk</TableHead>
                    <TableHead className="font-semibold text-slate-800">Status</TableHead>
                    <TableHead className="font-semibold text-slate-800">Last updated</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row._id} className="hover:bg-blue-50/40">
                      <TableCell className="font-medium text-slate-900">{row.childName}</TableCell>
                      <TableCell>
                        <div className="text-slate-800">{row.parentName}</div>
                        {row.parentEmail && (
                          <div className="text-xs text-slate-500">{row.parentEmail}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={riskBadgeClass[row.riskLevel] || riskBadgeClass.unknown}
                        >
                          {row.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusBadgeClass[row.status] || 'bg-slate-100 text-slate-700'}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {new Date(row.updatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => onOpenCase(row._id)}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
