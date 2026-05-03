import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { AlertTriangle, CheckCircle, Clock, Eye, FileText } from 'lucide-react';
import { clinicianAPI, screeningAPI } from '../../api';
import { normalizeScreeningReviewStatus, SCREENING_REVIEW_STATUS } from '../../utils/workflowStatus';

type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';
type ScreeningStatus = 'SUBMITTED' | 'FLAGGED' | 'REVIEWED';

interface ClinicianScreeningReview {
  id: string;
  parent: {
    id: string | null;
    name: string;
    email: string;
  };
  child: {
    id: string | null;
    name: string;
    ageYears: number | null;
  };
  questionnaireType: 'ASQ-3' | 'MCHAT-R' | string;
  score: number | null;
  result: string;
  riskLevel: RiskLevel;
  status: ScreeningStatus;
  createdAt: string;
}

function childInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatAgeLine(ageYears: number | null | undefined): string {
  if (ageYears != null && !Number.isNaN(ageYears)) {
    return `${ageYears} ${ageYears === 1 ? 'year' : 'years'} old`;
  }
  return 'Age not available';
}

export function ScreeningReviews() {
  const [selectedTab, setSelectedTab] = useState('pending');
  const [screenings, setScreenings] = useState<ClinicianScreeningReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedScreeningId, setSelectedScreeningId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'review' | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [decision, setDecision] = useState<'clear' | 'monitor' | 'refer'>('monitor');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);

  const refreshScreenings = useCallback(async () => {
    try {
      setListError(null);
      const response = await clinicianAPI.getScreeningReviews();
      const data = response.data?.data || [];
      setScreenings(data);
    } catch (err: any) {
      console.error('Failed to load screening reviews:', err);
      setListError(err.response?.data?.message || 'Failed to load screening reviews');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setListError(null);
        await refreshScreenings();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshScreenings]);

  const getStatusIcon = (status: string) => {
    switch (normalizeScreeningReviewStatus(status)) {
      case SCREENING_REVIEW_STATUS.SUBMITTED:
        return <Clock className="h-4 w-4 text-accent" />;
      case SCREENING_REVIEW_STATUS.REVIEWED:
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case SCREENING_REVIEW_STATUS.FLAGGED:
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (normalizeScreeningReviewStatus(status)) {
      case SCREENING_REVIEW_STATUS.SUBMITTED:
        return 'bg-accent/10 text-accent-foreground';
      case SCREENING_REVIEW_STATUS.REVIEWED:
        return 'bg-secondary text-primary';
      case SCREENING_REVIEW_STATUS.FLAGGED:
        return 'bg-muted text-destructive';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-secondary text-primary';
      case 'medium':
        return 'bg-accent/10 text-accent-foreground';
      case 'high':
        return 'bg-muted text-destructive';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const filteredScreenings = screenings.filter((screening) => {
    if (selectedTab === 'all') return true;
    const st = normalizeScreeningReviewStatus(screening.status);
    if (selectedTab === 'pending') return st === SCREENING_REVIEW_STATUS.SUBMITTED;
    if (selectedTab === 'needs_attention') return st === SCREENING_REVIEW_STATUS.FLAGGED;
    if (selectedTab === 'reviewed') return st === SCREENING_REVIEW_STATUS.REVIEWED;
    return true;
  });

  const openSubmissionDialog = async (id: string, mode: 'view' | 'review') => {
    try {
      setSelectedScreeningId(id);
      setDialogMode(mode);
      setLoadingDetail(true);
      setSelectedSubmission(null);
      setDetailError(null);
      setDecision('monitor');
      setDecisionNotes('');
      const res = await screeningAPI.getSubmissionById(id);
      const submission = res.data?.data ?? res.data;
      setSelectedSubmission(submission);
    } catch (err: any) {
      console.error('Failed to load submission details:', err);
      setDetailError(err.response?.data?.message || 'Failed to load screening details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetails = () => {
    setSelectedScreeningId(null);
    setDialogMode(null);
    setSelectedSubmission(null);
    setDetailError(null);
    setDecisionNotes('');
    setSavingDecision(false);
  };

  const handleSaveDecision = async () => {
    if (!selectedScreeningId) return;
    try {
      setSavingDecision(true);
      setDetailError(null);
      await clinicianAPI.recordScreeningDecision(selectedScreeningId, {
        decision,
        notes: decisionNotes.trim(),
      });
      await refreshScreenings();
      closeDetails();
    } catch (err: any) {
      console.error('Failed to save screening decision:', err);
      setDetailError(err.response?.data?.message || 'Failed to save decision');
    } finally {
      setSavingDecision(false);
    }
  };

  const activeScreening = screenings.find((s) => s.id === selectedScreeningId);
  const activeSt = activeScreening ? normalizeScreeningReviewStatus(activeScreening.status) : '';
  const canRecordDecision =
    activeScreening &&
    (activeSt === SCREENING_REVIEW_STATUS.SUBMITTED || activeSt === SCREENING_REVIEW_STATUS.FLAGGED);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Screening Reviews</h2>
        <p className="text-muted-foreground">
          Review and analyze screening test results submitted by parents
        </p>
      </div>

      {listError && (
        <Card className="border border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{listError}</CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Loading screening reviews...
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({screenings.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending (
            {
              screenings.filter(
                (s) => normalizeScreeningReviewStatus(s.status) === SCREENING_REVIEW_STATUS.SUBMITTED
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="needs_attention">
            Needs Attention (
            {
              screenings.filter(
                (s) => normalizeScreeningReviewStatus(s.status) === SCREENING_REVIEW_STATUS.FLAGGED
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed (
            {
              screenings.filter(
                (s) => normalizeScreeningReviewStatus(s.status) === SCREENING_REVIEW_STATUS.REVIEWED
              ).length
            }
            )
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-5">
          {filteredScreenings.map((screening) => (
            <Card key={screening.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader className="space-y-0 pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback className="bg-secondary text-sm font-semibold text-primary">
                        {childInitials(screening.child.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-lg leading-snug">{screening.child.name}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {formatAgeLine(screening.child.ageYears)} • {screening.questionnaireType} • Submitted{' '}
                        {new Date(screening.createdAt).toLocaleDateString()}
                      </CardDescription>
                      <p className="text-xs text-muted-foreground">
                        Parent:{' '}
                        <span className="font-medium text-foreground">{screening.parent.name}</span>
                        {screening.parent.email ? (
                          <span className="text-muted-foreground"> ({screening.parent.email})</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <Badge className={getStatusColor(screening.status)}>
                      {getStatusIcon(screening.status)}
                      <span className="ml-1">
                        {normalizeScreeningReviewStatus(screening.status)
                          .toLowerCase()
                          .replace(/_/g, ' ')}
                      </span>
                    </Badge>
                    <Badge className={getRiskColor(screening.riskLevel)}>{screening.riskLevel} risk</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="border-t bg-muted/20 px-6 py-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0 space-y-2 text-sm">
                    <div>
                      <span className="font-semibold text-foreground">Score:</span>{' '}
                      <span className="text-muted-foreground">
                        {screening.score === null || screening.score === undefined ? 'N/A' : screening.score}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Result:</span>{' '}
                      <span className="text-muted-foreground">{screening.result || '—'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3 lg:shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-10 shrink-0 px-4"
                      onClick={() => openSubmissionDialog(screening.id, 'view')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {(normalizeScreeningReviewStatus(screening.status) === SCREENING_REVIEW_STATUS.SUBMITTED ||
                      normalizeScreeningReviewStatus(screening.status) === SCREENING_REVIEW_STATUS.FLAGGED) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="min-h-10 shrink-0 px-4"
                        onClick={() => openSubmissionDialog(screening.id, 'review')}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Review Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!loading && filteredScreenings.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No screenings found</h3>
                <p className="text-muted-foreground text-center">
                  {selectedTab === 'all'
                    ? 'No screening results available.'
                    : `No screenings with status "${selectedTab}".`}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedScreeningId} onOpenChange={(open) => !open && closeDetails()}>
        <DialogContent
          hideCloseButton
          className="max-h-[min(90vh,880px)] overflow-y-auto sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>Screening details</DialogTitle>
            <DialogDescription>
              {dialogMode === 'review' && canRecordDecision
                ? 'Review responses, then record your clinical decision.'
                : 'Questionnaire responses and scoring for this submission.'}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail && <p className="text-sm text-muted-foreground">Loading details…</p>}

          {detailError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {detailError}
            </div>
          )}

          {!loadingDetail && selectedSubmission && (
            <div className="space-y-4">
              <div className="text-sm text-foreground space-y-1">
                {selectedSubmission.childDisplayName && selectedSubmission.childDisplayName !== '—' ? (
                  <div>
                    <span className="font-medium">Child:</span> {selectedSubmission.childDisplayName}
                    {selectedSubmission.childDobText && selectedSubmission.childDobText !== '—' ? (
                      <span className="text-muted-foreground"> · DOB {selectedSubmission.childDobText}</span>
                    ) : null}
                    {typeof selectedSubmission.childAgeYears === 'number' &&
                    !Number.isNaN(selectedSubmission.childAgeYears) ? (
                      <span className="text-muted-foreground">
                        {' '}
                        (~{selectedSubmission.childAgeYears}{' '}
                        {selectedSubmission.childAgeYears === 1 ? 'year' : 'years'} old)
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {selectedSubmission.parentDisplayName && selectedSubmission.parentDisplayName !== '—' ? (
                  <div>
                    <span className="font-medium">Parent:</span> {selectedSubmission.parentDisplayName}
                    {selectedSubmission.parentEmail ? (
                      <span className="text-muted-foreground"> ({selectedSubmission.parentEmail})</span>
                    ) : null}
                  </div>
                ) : null}
                <div>
                  <span className="font-medium">Questionnaire:</span> {selectedSubmission.questionnaireType}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {selectedSubmission.createdAt
                    ? new Date(selectedSubmission.createdAt).toLocaleString()
                    : '—'}
                </div>
                <div>
                  <span className="font-medium">Total score:</span>{' '}
                  {selectedSubmission.scores?.totalScore ?? 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Result:</span>{' '}
                  {selectedSubmission.result ?? '—'}
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3 bg-muted/30">
                <h4 className="text-sm font-semibold text-foreground sticky top-0 bg-muted/30 pb-1">
                  Questionnaire Responses
                </h4>
                {(selectedSubmission.responses || []).map((resp: any, idx: number) => (
                  <div
                    key={resp.questionId || idx}
                    className="rounded-md border bg-background px-3 py-2 text-xs text-foreground"
                  >
                    <div className="font-medium mb-1">
                      Q{idx + 1}. {resp.questionId}
                    </div>
                    <div>
                      Answer: <span className="font-semibold">{String(resp.answer)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {dialogMode === 'review' && canRecordDecision && (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <Label htmlFor="screening-decision" className="text-foreground">
                    Clinical decision
                  </Label>
                  <select
                    id="screening-decision"
                    value={decision}
                    onChange={(e) =>
                      setDecision(e.target.value as 'clear' | 'monitor' | 'refer')
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="clear">Clear — no follow-up needed from this screen</option>
                    <option value="monitor">Monitor — continue routine surveillance</option>
                    <option value="refer">Refer — recommend further evaluation</option>
                  </select>
                  <div className="space-y-1.5">
                    <Label htmlFor="screening-notes">Notes (optional)</Label>
                    <Textarea
                      id="screening-notes"
                      rows={3}
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder="Brief rationale for the family record…"
                      className="resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeDetails}>
              Close
            </Button>
            {dialogMode === 'review' && canRecordDecision && !loadingDetail && selectedSubmission && (
              <Button type="button" onClick={handleSaveDecision} disabled={savingDecision}>
                {savingDecision ? 'Saving…' : 'Save decision'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
