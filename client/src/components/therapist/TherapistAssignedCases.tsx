import { useCallback, useEffect, useMemo, useState } from 'react';
import { referralAPI, therapistAPI } from '../../services/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, AlertCircle, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../ui/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

const normalizeStatus = (value: string | undefined) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const priorityBadgeClass: Record<string, string> = {
  high: 'bg-muted text-destructive border',
  medium: 'bg-accent/10 text-accent-foreground border-border',
  low: 'bg-secondary text-primary border-border',
};

const assignedChipBtn =
  'inline-flex h-9 min-h-9 shrink-0 items-center justify-center gap-1 rounded-md px-3 py-0 text-sm font-medium leading-none shadow-none';

function childAgeLabel(child: { dateOfBirth?: string | null } | null | undefined): string {
  if (!child?.dateOfBirth) return '—';
  const birth = new Date(child.dateOfBirth);
  if (Number.isNaN(birth.getTime())) return '—';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  return `${years} year${years === 1 ? '' : 's'}`;
}

function formatGender(g: string | null | undefined): string {
  if (!g || !String(g).trim()) return '—';
  const s = String(g).trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatLastSessionDate(value: string | Date | null | undefined): string {
  if (value == null) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusDisplayLabel(normalized: string): string {
  if (normalized === 'in-progress') return 'Therapy active';
  if (normalized === 'accepted') return 'Accepted';
  if (normalized === 'pending') return 'Pending';
  if (normalized === 'sent') return 'Sent';
  return normalized || '—';
}

function statusBadgeClassForCard(normalized: string): string {
  if (normalized === 'in-progress') {
    return 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100';
  }
  if (normalized === 'accepted') return 'rounded-full border bg-card px-3 py-2 text-xs font-medium text-foreground';
  return 'rounded-full border bg-muted px-3 py-2 text-xs font-medium text-foreground';
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'in-progress';

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in-progress', label: 'In progress' },
];

export function TherapistAssignedCases() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await referralAPI.getAssigned();
      setItems(data?.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load assigned referrals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    let list = items;
    if (statusFilter !== 'all') {
      list = list.filter((item) => {
        const n = normalizeStatus(item.status);
        if (statusFilter === 'pending') return n === 'pending' || n === 'sent';
        return n === statusFilter;
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const child = item.case?.child;
      const name = child
        ? `${child.firstName || ''} ${child.lastName || ''}`.trim().toLowerCase()
        : '';
      const age = childAgeLabel(child).toLowerCase();
      const domain = String(item.therapistType || '').toLowerCase();
      const parent = item.case?.parent
        ? `${item.case.parent.firstName || ''} ${item.case.parent.lastName || ''}`.trim().toLowerCase()
        : '';
      return (
        name.includes(q) ||
        age.includes(q) ||
        domain.includes(q) ||
        parent.includes(q) ||
        normalizeStatus(item.status).includes(q)
      );
    });
  }, [items, searchQuery, statusFilter]);

  const accept = async (id: string) => {
    try {
      setActingId(id);
      await referralAPI.accept(id);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to accept referral');
    } finally {
      setActingId(null);
    }
  };

  const start = async (id: string) => {
    try {
      setActingId(id);
      const { data } = await therapistAPI.startTherapyFromReferral(id);
      await load();
      const caseId = data?.caseId ?? data?.therapyCase?.caseId ?? data?.data?.caseId;
      if (caseId) {
        navigate(`/therapist/case/${String(caseId)}`);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to start therapy');
    } finally {
      setActingId(null);
    }
  };

  const activeFilterLabel = FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All statuses';

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-10 pt-2">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Assigned Cases</h1>
        <p className="text-base text-muted-foreground">Manage your assigned children and their therapy programs</p>
      </header>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <Label htmlFor="assigned-cases-search" className="sr-only">
            Search cases
          </Label>
          <div className="flex h-11 w-full min-w-0 items-center gap-2.5 rounded-lg border border-border bg-background px-3 shadow-sm transition-[color,box-shadow] focus-within:border focus-within:ring-2 focus-within:ring-ring/40">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              id="assigned-cases-search"
              type="search"
              autoComplete="off"
              placeholder="Search by name, age, or therapy domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 md:text-sm"
            />
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 border bg-card px-4 text-foreground shadow-sm hover:bg-background"
            >
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="border-b border px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="text-sm text-muted-foreground">
                Current: <span className="font-medium text-foreground">{activeFilterLabel}</span>
              </p>
            </div>
            <div className="flex flex-col p-1">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    'rounded-md px-3 py-2 text-left text-sm transition-colors',
                    statusFilter === opt.value
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-foreground hover:bg-background'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-dashed border bg-muted/80 px-6 py-12 text-center text-sm text-muted-foreground">
          No assigned referrals at the moment.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border-dashed border bg-muted/80 px-6 py-12 text-center text-sm text-muted-foreground">
          No cases match your search or filters.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredItems.map((item) => {
            const normalizedStatus = normalizeStatus(item.status);
            const caseLifecycle = String(item.case?.status ?? '').toUpperCase();
            const caseIdForRoute = String(item.caseId ?? item.case?.caseId ?? '');
            const showStartTherapy =
              normalizedStatus === 'accepted' && caseLifecycle === 'THERAPY';
            const child = item.case?.child;
            const childName = child
              ? `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Child'
              : 'Child';
            const ageStr = childAgeLabel(child);
            const genderStr = formatGender(child?.gender);
            const ageGenderLine = [ageStr !== '—' ? ageStr : null, genderStr !== '—' ? genderStr : null]
              .filter(Boolean)
              .join(' • ');
            const parentContact = item.case?.parent?.email || '—';
            const domainLabel = item.therapistType ? String(item.therapistType) : '—';
            const lastSessionLabel = formatLastSessionDate(item.lastSessionDate);

            return (
              <li
                key={item._id}
                className="flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-lg font-bold text-foreground">{childName}</h2>
                    <p className="text-sm text-muted-foreground">{ageGenderLine || '—'}</p>
                  </div>
                  <span className={cn('shrink-0', statusBadgeClassForCard(normalizedStatus))}>
                    {statusDisplayLabel(normalizedStatus)}
                  </span>
                </div>

                <div className="mt-5 space-y-4 border-t border pt-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parent contact</p>
                    <p className="mt-1 text-sm text-foreground">{parentContact}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Therapy domains</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                        {domainLabel}
                      </span>
                    </div>
                  </div>
                  {item.priority ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Priority</span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', priorityBadgeClass[item.priority] || 'border bg-background')}
                      >
                        {item.priority}
                      </Badge>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last session</p>
                    <p className="mt-1 text-sm text-foreground">{lastSessionLabel}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2 border-t border pt-5">
                  {normalizedStatus === 'pending' || normalizedStatus === 'sent' ? (
                    <>
                      <Button
                        type="button"
                        className={cn(
                          assignedChipBtn,
                          'w-full border bg-card text-foreground hover:bg-background'
                        )}
                        onClick={() => accept(item._id)}
                        disabled={actingId === item._id}
                      >
                        {actingId === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Accept
                      </Button>
                      {caseIdForRoute ? (
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            assignedChipBtn,
                            'w-full border bg-card text-foreground hover:bg-background'
                          )}
                          onClick={() => navigate(`/therapist/case/${caseIdForRoute}`)}
                        >
                          View Case File
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {showStartTherapy ? (
                    <>
                      <Button
                        type="button"
                        className={cn(
                          assignedChipBtn,
                          'w-full border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                        )}
                        onClick={() => start(item._id)}
                        disabled={actingId === item._id}
                      >
                        {actingId === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Start therapy
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(assignedChipBtn, 'w-full border bg-card text-foreground hover:bg-background')}
                        onClick={() => navigate(`/therapist/case/${caseIdForRoute}`)}
                      >
                        View Case File
                      </Button>
                    </>
                  ) : null}
                  {normalizedStatus === 'accepted' && !showStartTherapy && caseIdForRoute ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(assignedChipBtn, 'w-full border bg-card text-foreground hover:bg-background')}
                      onClick={() => navigate(`/therapist/case/${caseIdForRoute}`)}
                    >
                      View Case File
                    </Button>
                  ) : null}
                  {normalizedStatus === 'in-progress' ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(assignedChipBtn, 'w-full border bg-card text-foreground hover:bg-background')}
                      onClick={() => navigate(`/therapist/case/${caseIdForRoute}`)}
                    >
                      View Case File
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
