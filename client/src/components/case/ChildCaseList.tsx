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
import { CaseStatusBadge } from '../CaseStatusBadge';

export interface ChildCaseListProps {
  onOpenCase: (caseId: string) => void;
}

const RISK_ALL = 'all';
const STATUS_ALL = 'all';

const riskBadgeClass: Record<string, string> = {
  low: 'bg-primary/10 text-primary border-primary/20 font-medium',
  medium: 'bg-warning-yellow/10 text-warning-yellow border-warning-yellow/20 font-medium',
  high: 'bg-destructive/10 text-destructive border-destructive/20 font-medium',
  unknown: 'bg-muted text-muted-foreground border-muted font-medium',
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
  <h2 className="text-2xl font-semibold text-primary tracking-tight">Child Cases</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Centralized cases linked to approved appointments, screening results, and care status.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <Card className="border shadow-sm bg-card">
        <CardHeader className="pb-4 border-b border">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div>
              <CardTitle className="text-lg text-foreground">Caseload</CardTitle>
              <CardDescription>Filter by risk level and case status</CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="w-[160px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Risk level</label>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="bg-card border">
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-card border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
                    <SelectItem value="REVIEW">REVIEW</SelectItem>
                    <SelectItem value="DIAGNOSIS">DIAGNOSIS</SelectItem>
                    <SelectItem value="DIAGNOSIS_READY">DIAGNOSIS_READY</SelectItem>
                    <SelectItem value="THERAPY">THERAPY</SelectItem>
                    <SelectItem value="THERAPY_ACTIVE">THERAPY_ACTIVE</SelectItem>
                    <SelectItem value="MONITORING">MONITORING</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 rounded-lg border bg-muted px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-dashed border rounded-lg bg-background/50">
              <UserCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-foreground">No cases match your filters</p>
              <p className="text-sm mt-1">Cases are created when you approve a diagnostic appointment for a child.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background">
                    <TableHead className="font-semibold text-foreground">Child</TableHead>
                    <TableHead className="font-semibold text-foreground">Parent / Guardian</TableHead>
                    <TableHead className="font-semibold text-foreground">Risk</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground">Last updated</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row._id} className="hover:bg-blue-50/40">
                      <TableCell className="font-medium text-foreground">{row.childName}</TableCell>
                      <TableCell>
                        <div className="text-foreground">{row.parentName}</div>
                        {row.parentEmail && (
                          <div className="text-xs text-muted-foreground">{row.parentEmail}</div>
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
                        <CaseStatusBadge status={row.status} showMeaning={false} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(row.updatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="btn-accent"
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
