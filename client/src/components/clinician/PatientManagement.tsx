import { useCallback, useEffect, useMemo, useState } from 'react';
import { caseAPI } from '../../api';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Search, Plus, Eye, Edit, Mail, Loader2 } from 'lucide-react';
import { CaseStatusBadge } from '../CaseStatusBadge';

type CaseRow = {
  _id: string;
  childId: string;
  childName: string;
  parentName: string;
  parentEmail: string | null;
  riskLevel: string;
  status: string;
  updatedAt: string;
};

const riskBadgeClass: Record<string, string> = {
  low: 'bg-primary/10 text-primary font-medium border-primary/20',
  medium: 'bg-warning-yellow/10 text-warning-yellow font-medium border-warning-yellow/20',
  high: 'bg-destructive/10 text-destructive font-medium border-destructive/20',
  unknown: 'bg-muted text-muted-foreground font-medium border-muted',
};

const STATUS_ALL = 'all';

export interface PatientManagementProps {
  /** When set, opens the clinician case file for this case id. */
  onOpenCase?: (caseId: string) => void;
}

export function PatientManagement({ onOpenCase }: PatientManagementProps) {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (statusFilter !== STATUS_ALL) params.status = statusFilter;
      const { data } = await caseAPI.list(params);
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPatients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.childName.toLowerCase().includes(q) ||
        r.parentName.toLowerCase().includes(q) ||
        (r.parentEmail && r.parentEmail.toLowerCase().includes(q)),
    );
  }, [rows, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Patient Management</h2>
          <p className="text-muted-foreground">Cases on your caseload (same data as Case directory)</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-default">
              <Button type="button" variant="accent" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Add New Patient
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            Not implemented — new cases are created when a parent completes onboarding or through your intake workflow.
          </TooltipContent>
        </Tooltip>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by child, parent, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Case status" />
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
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPatients.map((row) => (
            <Card key={row._id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback className="bg-secondary text-primary">
                        {row.childName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{row.childName}</h3>
                      <p className="text-muted-foreground text-sm">Parent: {row.parentName}</p>
                      {row.parentEmail ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {row.parentEmail}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <CaseStatusBadge status={row.status} showMeaning={false} />
                        <Badge
                          variant="outline"
                          className={riskBadgeClass[row.riskLevel] || riskBadgeClass.unknown}
                        >
                          {row.riskLevel} risk
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:text-right">
                    <div className="text-sm text-muted-foreground">
                      <p>Last updated</p>
                      <p className="text-foreground font-medium">{new Date(row.updatedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {onOpenCase ? (
                        <Button variant="outline" size="sm" onClick={() => onOpenCase(row._id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Open case
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button variant="outline" size="sm" disabled>
                                <Eye className="h-4 w-4 mr-2" />
                                Open case
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Wire PatientManagement with onOpenCase from the clinician dashboard to navigate.</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button variant="outline" size="sm" disabled>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Edit case details in Case directory → open case.</TooltipContent>
                      </Tooltip>
                      {row.parentEmail ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`mailto:${row.parentEmail}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Email parent
                          </a>
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button variant="outline" size="sm" disabled>
                                <Mail className="h-4 w-4 mr-2" />
                                Email parent
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>No email on file for this guardian.</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredPatients.length === 0 && !loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No cases found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {searchTerm || statusFilter !== STATUS_ALL
                    ? 'Try adjusting search or status filter.'
                    : 'No cases on your caseload yet.'}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
