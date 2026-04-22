import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Download,
  TrendingUp,
  Target,
  Sparkles,
  Mail,
  ListChecks,
  BookOpen,
  Heart,
  ChevronDown,
  ClipboardList,
} from 'lucide-react';
import { getScreeningRecommendations } from '../../../constants/screeningRecommendations';
import { Alert, AlertDescription } from '../../ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import jsPDF from 'jspdf';
import { DecisionSummaryCard } from '../../results/DecisionSummaryCard';
import { useNavigate } from 'react-router-dom';
import { parentAPI } from '../../../api';

interface ScreeningResultsProps {
  results: any;
  screeningType: string;
  child: any;
}

const PDF_MARGIN = 20;
const PDF_MAX_WIDTH = 170;
const PDF_FOOTER_Y = 285;

function isMchatType(type: string) {
  return type === 'M-CHAT-R' || type === 'MCHAT-R';
}

function isAsqType(type: string) {
  return type === 'ASQ-3';
}

/** Parent-friendly label for ASQ-3 domain status from backend */
function asqDomainZoneLabel(status: string): { badge: string; detail: string; tone: 'good' | 'warn' | 'bad' | 'neutral' } {
  switch (status) {
    case 'normal development':
      return { badge: 'On track', detail: 'In the expected range for this age', tone: 'good' };
    case 'need monitoring':
      return { badge: 'Monitoring zone', detail: 'Worth extra practice and a check-in with your doctor', tone: 'warn' };
    case 'referral for further evaluation':
      return { badge: 'Below cutoff', detail: 'Discuss with your pediatrician for next steps', tone: 'bad' };
    default:
      return { badge: '—', detail: status || '', tone: 'neutral' };
  }
}

function asqBadgeClass(tone: 'good' | 'warn' | 'bad' | 'neutral') {
  if (tone === 'good') return 'bg-primary text-primary-foreground';
  if (tone === 'warn') return 'border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
  if (tone === 'bad') return 'bg-destructive text-destructive-foreground';
  return 'bg-muted text-foreground';
}

export function ScreeningResults({ results, screeningType, child }: ScreeningResultsProps) {
  const [tipsOpen, setTipsOpen] = useState(false);
  const navigate = useNavigate();
  const [caseStatus, setCaseStatus] = useState<string | null>(null);

  const isMchat = isMchatType(screeningType);
  const isAsq = isAsqType(screeningType);
  const clinicianNeeded =
    typeof results?.decisionSupport?.recommendation === 'string' &&
    results.decisionSupport.recommendation.toLowerCase().includes('clinician needed');

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await parentAPI.getCases();
        const rows = res?.data?.data || [];
        const match = rows.find((r: any) => String(r.childId) === String(child?.id));
        if (!cancelled) setCaseStatus(match?.status || null);
      } catch {
        if (!cancelled) setCaseStatus(null);
      }
    }
    if (child?.id) load();
    return () => {
      cancelled = true;
    };
  }, [child?.id]);

  const getRiskTone = (risk: string): 'good' | 'warn' | 'bad' | 'neutral' => {
    switch (risk) {
      case 'low':
        return 'good';
      case 'medium':
        return 'warn';
      case 'high':
        return 'bad';
      default:
        return 'neutral';
    }
  };

  const riskToneStyles = (tone: 'good' | 'warn' | 'bad' | 'neutral') => {
    switch (tone) {
      case 'good':
        return {
          header: 'border-primary/30 bg-secondary/40',
          iconWrap: 'bg-card text-primary',
          badge: 'bg-primary text-primary-foreground',
          alert: 'border-border bg-card',
          alertIcon: 'text-accent',
        };
      case 'warn':
        return {
          header: 'border-accent/50 bg-accent/10',
          iconWrap: 'bg-card text-accent',
          badge: 'bg-accent text-accent-foreground',
          alert: 'border-border bg-card',
          alertIcon: 'text-accent',
        };
      case 'bad':
        return {
          header: 'border-destructive/40 bg-muted',
          iconWrap: 'bg-card text-destructive',
          badge: 'bg-destructive text-destructive-foreground',
          alert: 'border-border bg-card',
          alertIcon: 'text-accent',
        };
      default:
        return {
          header: 'border-border bg-card',
          iconWrap: 'bg-card text-primary',
          badge: 'bg-muted text-foreground',
          alert: 'border-border bg-card',
          alertIcon: 'text-accent',
        };
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="h-6 w-6" />;
      case 'medium':
        return <AlertTriangle className="h-6 w-6" />;
      case 'high':
        return <AlertCircle className="h-6 w-6" />;
      default:
        return <ClipboardList className="h-6 w-6" />;
    }
  };

  const getRiskMessage = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'The score indicates LOW likelihood for autism. No Follow-Up needed. Child has screened negative.';
      case 'medium':
        return 'The score indicates MODERATE likelihood for autism. Administer M-CHAT-R Follow-Up for elevated items; refer if 2+ remain elevated.';
      case 'high':
        return 'The score indicates HIGH likelihood for autism. Child has screened positive. Refer immediately for early intervention and diagnostic evaluation.';
      default:
        return '';
    }
  };

  const getMCHATScoreRange = (totalScore: number) => {
    if (totalScore <= 2) return { band: '0–2', level: 'LOW', interpretation: 'No Follow-Up needed. Child has screened negative.' };
    if (totalScore <= 7) return { band: '3–7', level: 'MODERATE', interpretation: 'Administer M-CHAT-R Follow-Up for elevated items. Refer if 2+ items remain elevated.' };
    return { band: '8–20', level: 'HIGH', interpretation: 'Child has screened positive. Refer immediately for early intervention and diagnostic evaluation.' };
  };

  const getMchatBadgeLabel = () => {
    const labels: Record<string, string> = {
      low: 'LOW LIKELIHOOD',
      medium: 'MODERATE LIKELIHOOD',
      high: 'HIGH LIKELIHOOD',
    };
    return labels[results.riskLevel] ?? `${(results.riskLevel || '').toString().toUpperCase()} LIKELIHOOD`;
  };

  const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, fontSize: number, maxWidth: number = PDF_MAX_WIDTH): number => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.35 + 2;
    for (const line of lines) {
      if (y > PDF_FOOTER_Y - lineHeight) {
        doc.addPage();
        y = PDF_MARGIN + 12;
      }
      doc.text(line, x, y);
      y += lineHeight;
    }
    return y;
  };

  const addPdfFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `AutismCare · Screening Report · Confidential · Page ${pageNum} of ${totalPages} · ${new Date().toLocaleDateString()}`,
      105,
      PDF_FOOTER_Y,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
  };

  const buildReportPdf = (): jsPDF => {
    const doc = new jsPDF();
    let y = PDF_MARGIN;

    doc.setFontSize(22);
    doc.setTextColor(15, 118, 110);
    doc.text('AutismCare', 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text('ASD Management Platform · Screening Report', 105, y, { align: 'center' });
    y += 14;
    doc.setDrawColor(200, 200, 200);
    doc.line(PDF_MARGIN, y, 210 - PDF_MARGIN, y);
    y += 14;
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(18);
    doc.text(`${screeningType} Screening Report`, PDF_MARGIN, y);
    y += 12;

    doc.setFontSize(12);
    doc.text(`Child: ${child?.firstName ?? ''} ${child?.lastName ?? ''}`, PDF_MARGIN, y);
    y += 8;
    doc.text(
      `Screening date: ${new Date(results.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      PDF_MARGIN,
      y
    );
    y += 14;

    doc.setFontSize(14);
    doc.text('Results', PDF_MARGIN, y);
    y += 10;
    doc.setFontSize(11);

    if (isMchat) {
      const total = results.scores?.totalScore ?? 0;
      const range = getMCHATScoreRange(total);
      doc.text(`Total score: ${total}/20 (Score range ${range.band} = ${range.level} likelihood)`, PDF_MARGIN, y);
      y += 8;
      y = addWrappedText(doc, `Interpretation: ${results.result ?? 'N/A'} — ${range.interpretation}`, PDF_MARGIN, y, 11);
      y += 4;
      if (results.resultDescription) {
        y = addWrappedText(doc, `Full guidance: ${results.resultDescription}`, PDF_MARGIN, y, 10);
        y += 6;
      }
      if (results.scores?.elevatedItems && results.scores.elevatedItems.length > 0) {
        doc.text('Elevated likelihood items (for Follow-Up):', PDF_MARGIN, y);
        y += 8;
        results.scores.elevatedItems.forEach((item: string, index: number) => {
          doc.text(`  ${index + 1}. ${item}`, PDF_MARGIN, y);
          y += 6;
        });
        y += 4;
      }
    } else if (isAsq) {
      y = addWrappedText(
        doc,
        'ASQ-3 is scored in five developmental areas. Each area is interpreted on its own (on track, monitoring zone, or below cutoff)—not as a single overall pass or fail.',
        PDF_MARGIN,
        y,
        10
      );
      y += 6;
      if (results.scores?.domainScores && results.scores?.domainStatuses) {
        doc.setFontSize(12);
        doc.text('Domain results', PDF_MARGIN, y);
        y += 8;
        doc.setFontSize(10);
        Object.entries(results.scores.domainScores).forEach(([domain, score]: [string, unknown]) => {
          const raw = (results.scores.domainStatuses as Record<string, string>)[domain];
          const { badge, detail } = asqDomainZoneLabel(raw);
          const line = `${domain}: ${String(score)}/60 — ${badge}. ${detail}`;
          y = addWrappedText(doc, line, PDF_MARGIN, y, 10);
          y += 2;
        });
        y += 4;
      }
    } else {
      y = addWrappedText(doc, `Summary: ${results.result ?? results.riskLevel ?? 'See clinical record.'}`, PDF_MARGIN, y, 11);
    }

    const totalPages =
      typeof (doc as unknown as { getNumberOfPages?: () => number }).getNumberOfPages === 'function'
        ? (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
        : 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      addPdfFooter(doc, p, totalPages);
    }
    return doc;
  };

  const downloadReport = () => {
    const doc = buildReportPdf();
    doc.save(`${screeningType}_Report_${child?.firstName ?? 'Child'}_${new Date(results.date).toISOString().split('T')[0]}.pdf`);
  };

  const asqRec =
    isAsq &&
    getScreeningRecommendations(screeningType, {
      result: results.result,
      riskLevel: results.riskLevel,
      scores: results.scores,
    });

  const asqDomainCard =
    results.scores?.domainScores && results.scores?.domainStatuses && isAsq ? (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-5 w-5" />
            Development by area
          </CardTitle>
          <CardDescription>
            ASQ-3 looks at five skill areas separately. There is no single “autism risk” or pass/fail grade for the whole form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(results.scores.domainScores).map(([domain, score]: [string, any]) => {
            const status = results.scores.domainStatuses[domain];
            const { badge, detail, tone } = asqDomainZoneLabel(status);
            return (
              <div key={domain} className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium capitalize text-foreground">{domain}</span>
                  <Badge className={asqBadgeClass(tone)}>{badge}</Badge>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-lg font-bold text-foreground">{score}/60</div>
                  <div className="text-sm text-muted-foreground">{detail}</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    ) : null;

  if (isAsq) {
    return (
      <div className="space-y-6">
        {results?.decisionSupport ? <DecisionSummaryCard decisionSupport={results.decisionSupport} /> : null}
        {asqDomainCard}

        <Card className="border-2 border-border bg-card">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <ClipboardList className="h-7 w-7" />
                </div>
                <div>
                  <CardTitle className="text-foreground">ASQ-3 complete</CardTitle>
                  <CardDescription className="mt-1">
                    {results.type} · {child?.firstName} {child?.lastName}
                  </CardDescription>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(results.date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${results.reportEmailed ? 'bg-muted/50' : 'border border-border bg-accent/10'}`}>
              <Mail className={`h-4 w-4 shrink-0 ${results.reportEmailed ? 'text-primary' : 'text-accent'}`} />
              <span>
                {results.reportEmailed
                  ? 'A copy of this summary was emailed to your account when available.'
                  : 'Report saved. If you did not get an email, use Download below.'}
              </span>
            </div>
            <Button type="button" className="gap-2" onClick={downloadReport}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </CardContent>
        </Card>

        {asqRec && (
          <Card className="border border-primary/20 bg-secondary/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <ListChecks className="h-5 w-5" />
                Next steps
              </CardTitle>
              <p className="text-sm font-medium text-foreground">{asqRec.headline}</p>
              <p className="text-sm text-muted-foreground">{asqRec.summary}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                {asqRec.steps.map((step, i) => (
                  <li key={i}>
                    <span className="font-medium">{step.title}</span>
                    {' — '}
                    <span className="text-muted-foreground">{step.description}</span>
                  </li>
                ))}
              </ul>
              {asqRec.domainTips && asqRec.domainTips.length > 0 && (
                <Collapsible open={tipsOpen} onOpenChange={setTipsOpen} className="pt-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 px-0 text-primary">
                      <Heart className="h-4 w-4" />
                      Ideas for home (optional)
                      <ChevronDown className={`h-4 w-4 transition-transform ${tipsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {asqRec.domainTips.map(({ domain, tip }, i) => (
                      <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <span className="font-medium text-foreground">{domain}</span>
                        <span className="text-muted-foreground"> — {tip}</span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        )}

        {results?.decisionSupport && clinicianNeeded && (
          <Button
            type="button"
            variant={results.decisionSupport.urgencyLevel === 'red' || results.decisionSupport.urgencyLevel === 'orange' ? 'default' : 'secondary'}
            onClick={() => navigate('/parent-dashboard', { state: { section: 'book-appointment' } })}
            className="w-full sm:w-auto"
            disabled={caseStatus != null && !['SCREENING', 'REVIEW'].includes(String(caseStatus))}
            title={caseStatus != null && !['SCREENING', 'REVIEW'].includes(String(caseStatus)) ? 'Not available in the current case stage' : undefined}
          >
            Book Appointment
          </Button>
        )}
      </div>
    );
  }

  const tone = getRiskTone(results.riskLevel);
  const toneStyles = riskToneStyles(tone);

  return (
    <div className="space-y-6">
      {results?.decisionSupport ? <DecisionSummaryCard decisionSupport={results.decisionSupport} /> : null}
      <Card className={`border-2 ${toneStyles.header}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${toneStyles.iconWrap}`}>
                {getRiskIcon(results.riskLevel)}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">M-CHAT-R complete</CardTitle>
                <CardDescription className="mt-1">
                  {results.type} for {child?.firstName} {child?.lastName}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <Badge className={toneStyles.badge}>{getMchatBadgeLabel()}</Badge>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(results.date).toLocaleDateString()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Screening result:{' '}
            <span className="font-semibold text-foreground">{results.result ?? '—'}</span>
          </p>
          <Alert className={toneStyles.alert}>
            <Sparkles className={`h-4 w-4 ${toneStyles.alertIcon}`} />
            <AlertDescription className="text-foreground">
              {results.resultDescription ? results.resultDescription : getRiskMessage(results.riskLevel)}
            </AlertDescription>
          </Alert>
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-sm ${results.reportEmailed ? 'bg-muted/50 dark:bg-muted/20' : 'border border-border bg-accent/10'}`}
          >
            <Mail className={`h-4 w-4 shrink-0 ${results.reportEmailed ? 'text-primary' : 'text-accent'}`} />
            <span>
              {results.reportEmailed
                ? 'A copy of this report has been sent to your registered email address.'
                : 'Report saved. Email could not be sent—please download the PDF below.'}
            </span>
          </div>
          <Button type="button" className="gap-2" onClick={downloadReport}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </CardContent>
      </Card>

      {isMchat &&
        (() => {
          const rec = getScreeningRecommendations(screeningType, {
            result: results.result,
            riskLevel: results.riskLevel,
            scores: results.scores,
          });
          return (
            <Card className="border-2 border-primary/20 bg-secondary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <ListChecks className="h-5 w-5" />
                  What to do next
                </CardTitle>
                <CardDescription className="mt-1 text-base font-medium text-foreground">{rec.headline}</CardDescription>
                <p className="mt-1 text-sm text-muted-foreground">{rec.summary}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BookOpen className="h-4 w-4" />
                    Recommended steps
                  </h4>
                  <ul className="space-y-3">
                    {rec.steps.map((step, index) => (
                      <li
                        key={index}
                        className={`flex gap-3 rounded-lg border p-3 ${
                          step.priority === 'do'
                            ? 'border-primary/30 bg-primary/10'
                            : step.priority === 'consider'
                              ? 'border-border bg-accent/10'
                              : 'border-border bg-muted/50'
                        }`}
                      >
                        <span
                          className={`mt-0.5 shrink-0 ${
                            step.priority === 'do' ? 'text-primary' : step.priority === 'consider' ? 'text-accent' : 'text-muted-foreground'
                          }`}
                        >
                          {step.priority === 'do' ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/20 text-xs font-medium">
                              {index + 1}
                            </span>
                          )}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{step.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {isMchat && results.scores && (() => {
        const total = results.scores.totalScore ?? 0;
        const range = getMCHATScoreRange(total);
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                M-CHAT-R scores
              </CardTitle>
              <CardDescription>
                Total score 0–2 = low likelihood; 3–7 = moderate (use Follow-Up); 8–20 = high likelihood—seek prompt evaluation per clinical guidance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                <span className="font-medium text-foreground">Total score</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">{total}/20</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Range {range.band} = {range.level} likelihood
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-foreground">Result label</span>
                <div className="text-left sm:text-right">
                  <Badge className={toneStyles.badge}>{results.result}</Badge>
                  <p className="mt-1 text-sm text-muted-foreground">{range.interpretation}</p>
                </div>
              </div>
              {results.scores.elevatedItems && results.scores.elevatedItems.length > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <span className="font-medium text-foreground">Elevated items (for Follow-Up)</span>
                  <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                    {results.scores.elevatedItems.map((item: any, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {!isMchat && !isAsq && (
        <Card>
          <CardHeader>
            <CardTitle>Screening complete</CardTitle>
            <CardDescription>
              {results.type} · {child?.firstName} {child?.lastName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" className="gap-2" onClick={downloadReport}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </CardContent>
        </Card>
      )}

      {results?.decisionSupport && clinicianNeeded && (
        <Button
          type="button"
          variant={results.decisionSupport.urgencyLevel === 'red' || results.decisionSupport.urgencyLevel === 'orange' ? 'default' : 'secondary'}
          onClick={() => navigate('/parent-dashboard', { state: { section: 'book-appointment' } })}
          className="w-full sm:w-auto"
          disabled={caseStatus != null && !['SCREENING', 'REVIEW'].includes(String(caseStatus))}
          title={caseStatus != null && !['SCREENING', 'REVIEW'].includes(String(caseStatus)) ? 'Not available in the current case stage' : undefined}
        >
          Book Appointment
        </Button>
      )}
    </div>
  );
}
