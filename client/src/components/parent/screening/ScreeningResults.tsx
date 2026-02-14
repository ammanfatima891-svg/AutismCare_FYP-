import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Download,
  Share2,
  Calendar,
  TrendingUp,
  Target,
  FileText,
  Sparkles,
  EyeOff,
  Eye,
  User,
  Mail,
  Phone,
  ListChecks,
  BookOpen,
  Heart
} from 'lucide-react';
import { getScreeningRecommendations } from '../../../constants/screeningRecommendations';
import { Alert, AlertDescription } from '../../ui/alert';
import { useState, useEffect } from 'react';
import API, { screeningAPI } from '../../../api';
import jsPDF from 'jspdf';

interface ScreeningResultsProps {
  results: any;
  screeningType: string;
  child: any;
}

const PDF_MARGIN = 20;
const PDF_MAX_WIDTH = 170;
const PDF_LINE_HEIGHT = 6;
const PDF_PAGE_HEIGHT = 297;
const PDF_FOOTER_Y = 285;

export function ScreeningResults({ results, screeningType, child }: ScreeningResultsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [cliniciansAndTherapists, setCliniciansAndTherapists] = useState({ clinicians: [], therapists: [] });
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<any>(null);



  useEffect(() => {
    if (screeningType === 'M-CHAT-R') {
      const fetchQuestions = async () => {
        try {
          const response = await API.get(`/screening/questionnaires/MCHAT-R?dob=${child.dateOfBirth}`);
          setQuestions(response.data.data.questions || []);
        } catch (error) {
          console.error('Error fetching questions:', error);
        }
      };
      fetchQuestions();
    }
  }, [screeningType, child.dateOfBirth]);

  useEffect(() => {
    const fetchCliniciansAndTherapists = async () => {
      setLoading(true);
      try {
        const response = await screeningAPI.getAvailableCliniciansAndTherapists();
        setCliniciansAndTherapists(response.data.data);
      } catch (error) {
        console.error('Error fetching clinicians and therapists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCliniciansAndTherapists();
  }, []);

  useEffect(() => {
    if ((screeningType === 'M-CHAT-R' || screeningType === 'ASQ-3') && results.submissionId) {
      const fetchSubmission = async () => {
        try {
          const response = await screeningAPI.getSubmissionById(results.submissionId);
          setSubmission(response.data.data);
        } catch (error) {
          console.error('Error fetching submission:', error);
        }
      };
      fetchSubmission();
    }
  }, [screeningType, results.submissionId]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'high':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="w-6 h-6" />;
      case 'medium':
        return <AlertTriangle className="w-6 h-6" />;
      case 'high':
        return <AlertCircle className="w-6 h-6" />;
      default:
        return null;
    }
  };

  // M-CHAT-R: official wording (mchatscreen.com); fallback if resultDescription missing
  const getRiskMessage = (risk: string, type: string) => {
    if (type === 'M-CHAT-R' || type === 'MCHAT-R') {
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
    } else {
      // ASQ-3 uses domain statuses, but overall risk message
      switch (risk) {
        case 'low':
          return 'Child developing within expected range';
        case 'medium':
          return 'Development should be monitored and rescreened';
        case 'high':
          return 'Further developmental evaluation recommended';
        default:
          return '';
      }
    }
  };

  const color = getRiskColor(results.riskLevel);

  // M-CHAT-R official labels: "LOW/MODERATE/HIGH likelihood" (test document)
  const getRiskBadgeLabel = () => {
    if (screeningType === 'M-CHAT-R' || screeningType === 'MCHAT-R') {
      const labels: Record<string, string> = { low: 'LOW LIKELIHOOD', medium: 'MODERATE LIKELIHOOD', high: 'HIGH LIKELIHOOD' };
      return labels[results.riskLevel] ?? `${(results.riskLevel || '').toUpperCase()} RISK`;
    }
    return `${(results.riskLevel || '').toUpperCase()} RISK`;
  };

  // M-CHAT-R official score ranges and interpretation (mchatscreen.com)
  const getMCHATScoreRange = (totalScore: number) => {
    if (totalScore <= 2) return { band: '0–2', level: 'LOW', interpretation: 'No Follow-Up needed. Child has screened negative.' };
    if (totalScore <= 7) return { band: '3–7', level: 'MODERATE', interpretation: 'Administer M-CHAT-R Follow-Up for elevated items. Refer if 2+ items remain elevated.' };
    return { band: '8–20', level: 'HIGH', interpretation: 'Child has screened positive. Refer immediately for early intervention and diagnostic evaluation.' };
  };

  // Add wrapped text to PDF; returns new y. Adds new page if needed.
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

    // —— Branding header ——
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

    // Report title
    doc.setFontSize(18);
    doc.text(`${screeningType} Screening Report`, PDF_MARGIN, y);
    y += 12;

    // Child and date
    doc.setFontSize(12);
    doc.text(`Child: ${child?.firstName ?? ''} ${child?.lastName ?? ''}`, PDF_MARGIN, y);
    y += 8;
    doc.text(
      `Screening date: ${new Date(results.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      PDF_MARGIN,
      y
    );
    y += 14;

    // Results section
    doc.setFontSize(14);
    doc.text('Results', PDF_MARGIN, y);
    y += 10;
    doc.setFontSize(11);

    if (screeningType === 'M-CHAT-R' || screeningType === 'MCHAT-R') {
      const total = results.scores?.totalScore ?? 0;
      const range = getMCHATScoreRange(total);
      doc.text(`Total score: ${total}/20 (Score range ${range.band} = ${range.level} risk)`, PDF_MARGIN, y);
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
    } else if (screeningType === 'ASQ-3') {
      doc.text(`Overall risk level: ${(results.riskLevel ?? '').toUpperCase()}`, PDF_MARGIN, y);
      y += 10;
      if (results.scores?.domainScores && results.scores?.domainStatuses) {
        doc.text('Domain scores:', PDF_MARGIN, y);
        y += 8;
        Object.entries(results.scores.domainScores).forEach(([domain, score]: [string, unknown]) => {
          const status = (results.scores.domainStatuses as Record<string, string>)[domain];
          doc.text(`  ${domain}: ${score}/60 (${status ?? ''})`, PDF_MARGIN, y);
          y += 6;
        });
        y += 4;
      }
    }

    // Footer on all pages (jsPDF type def may omit getNumberOfPages)
    const totalPages = typeof (doc as unknown as { getNumberOfPages?: () => number }).getNumberOfPages === 'function'
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

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card className={`border-2 border-${color}-300 bg-gradient-to-br from-${color}-50 to-purple-50`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-600`}>
                {getRiskIcon(results.riskLevel)}
              </div>
              <div>
                <CardTitle className={`text-${color}-900 flex items-center gap-2`}>
                  Screening Complete! 🎉
                </CardTitle>
                <CardDescription className="mt-1">
                  {results.type} for {child?.firstName} {child?.lastName}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`bg-${color}-600 text-white`}>
                {getRiskBadgeLabel()}
              </Badge>
              <p className="text-xs text-gray-600 mt-2">
                {new Date(results.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Result: <span className="text-foreground font-semibold">{results.result ?? '—'}</span></p>
          <Alert className={`bg-${color}-100 border-${color}-300`}>
            <Sparkles className={`h-4 w-4 text-${color}-600`} />
            <AlertDescription className={`text-${color}-900`}>
              {(screeningType === 'MCHAT-R' || screeningType === 'M-CHAT-R') && results.resultDescription
                ? results.resultDescription
                : getRiskMessage(results.riskLevel, screeningType)}
            </AlertDescription>
          </Alert>
          <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${results.reportEmailed ? 'bg-muted/50 dark:bg-muted/20' : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'}`}>
            <Mail className={`w-4 h-4 shrink-0 ${results.reportEmailed ? 'text-green-600' : 'text-amber-600'}`} />
            <span>
              {results.reportEmailed
                ? 'A copy of this report has been sent to your registered email address.'
                : 'Report saved. Email could not be sent—please download the report below.'}
            </span>
          </div>
          <Button type="button" variant="default" className="gap-2" onClick={downloadReport}>
            <Download className="w-4 h-4" />
            Download Report
          </Button>
        </CardContent>
      </Card>

      {/* Rule-based recommendations: What to do next */}
      {(() => {
        const rec = getScreeningRecommendations(screeningType, {
          result: results.result,
          riskLevel: results.riskLevel,
          scores: results.scores,
        });
        return (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ListChecks className="w-5 h-5" />
                What to do next
              </CardTitle>
              <CardDescription className="text-base font-medium text-foreground mt-1">
                {rec.headline}
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-1">
                {rec.summary}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Recommended steps
                </h4>
                <ul className="space-y-3">
                  {rec.steps.map((step, index) => (
                    <li
                      key={index}
                      className={`flex gap-3 p-3 rounded-lg border ${
                        step.priority === 'do'
                          ? 'bg-primary/10 border-primary/30'
                          : step.priority === 'consider'
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                            : 'bg-muted/50 border-border'
                      }`}
                    >
                      <span
                        className={`shrink-0 mt-0.5 ${
                          step.priority === 'do'
                            ? 'text-primary'
                            : step.priority === 'consider'
                              ? 'text-amber-600 dark:text-amber-500'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {step.priority === 'do' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/20 text-xs font-medium">
                            {index + 1}
                          </span>
                        )}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{step.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {rec.domainTips && rec.domainTips.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    Tips by area
                  </h4>
                  <ul className="space-y-2">
                    {rec.domainTips.map(({ domain, tip }, i) => (
                      <li
                        key={i}
                        className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800"
                      >
                        <p className="font-medium text-foreground text-sm">
                          {domain}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tip}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* M-CHAT-R Scores (aligned with official scoring: 0-2 Low, 3-7 Moderate, 8-20 High) */}
      {screeningType === 'M-CHAT-R' && results.scores && (() => {
        const total = results.scores.totalScore ?? 0;
        const range = getMCHATScoreRange(total);
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                M-CHAT-R Scores
              </CardTitle>
              <CardDescription>
                Total score and interpretation per M-CHAT-R scoring guidelines. Score range 0–2 = Low risk, 3–7 = Moderate (Follow-Up), 8–20 = High risk.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-900 font-medium">Total Score</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {total}/20
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Score range {range.band} = {range.level} risk
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg gap-4">
                <span className="text-gray-900 font-medium">Result</span>
                <div className="text-right">
                  <Badge className={`bg-${getRiskColor(results.riskLevel)}-500 text-white`}>
                    {results.result}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">{range.interpretation}</p>
                </div>
              </div>
              {results.scores.elevatedItems && results.scores.elevatedItems.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-900 font-medium">Elevated likelihood responses (items to review for Follow-Up)</span>
                  <ul className="mt-2 list-disc list-inside text-sm text-gray-600">
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

      {/* Domain Scores (ASQ-3 only) */}
      {results.scores?.domainScores && results.scores?.domainStatuses && screeningType === 'ASQ-3' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Domain Scores & Recommendations
            </CardTitle>
            <CardDescription>
              Individual domain scores with developmental recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(results.scores.domainScores).map(([domain, score]: [string, any]) => {
              const status = results.scores.domainStatuses[domain];
              let statusColor = 'gray';
              let statusText = '';

              switch (status) {
                case 'normal development':
                  statusColor = 'green';
                  statusText = 'Normal';
                  break;
                case 'need monitoring':
                  statusColor = 'yellow';
                  statusText = 'Needs Monitoring';
                  break;
                case 'referral for further evaluation':
                  statusColor = 'red';
                  statusText = 'Referral';
                  break;
                default:
                  statusColor = 'gray';
                  statusText = 'Unknown';
              }

              return (
                <div key={domain} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-900 font-medium capitalize">{domain}</span>
                    <Badge className={`bg-${statusColor}-500 text-white`}>
                      {statusText}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {score}/60
                    </div>
                    <div className="text-sm text-gray-600">
                      {status === 'normal development' && 'Normal development'}
                      {status === 'need monitoring' && 'Needs monitoring'}
                      {status === 'referral for further evaluation' && 'Referral recommended'}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Clinicians and Therapists */}
      {(cliniciansAndTherapists.clinicians.length > 0 || cliniciansAndTherapists.therapists.length > 0) && (screeningType === 'ASQ-3' || screeningType === 'MCHAT-R') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <User className="w-5 h-5" />
              Available Specialists
            </CardTitle>
            <CardDescription>
              Schedule appointments with approved clinicians and therapists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Clinicians */}
            {cliniciansAndTherapists.clinicians.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Clinicians
                </h4>
                <div className="grid gap-4">
                  {cliniciansAndTherapists.clinicians.map((clinician: any) => (
                    <div key={clinician._id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">
                            Dr. {clinician.firstName} {clinician.lastName}
                          </h5>
                          <p className="text-sm text-gray-600 capitalize">
                            {clinician.specialization}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {clinician.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {clinician.phoneNumber}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Book Appointment
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Therapists */}
            {cliniciansAndTherapists.therapists.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Therapists
                </h4>
                <div className="grid gap-4">
                  {cliniciansAndTherapists.therapists.map((therapist: any) => (
                    <div key={therapist._id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {therapist.firstName} {therapist.lastName}
                          </h5>
                          <p className="text-sm text-gray-600 capitalize">
                            {therapist.specialization}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {therapist.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {therapist.phoneNumber}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Book Appointment
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      {/* Download report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-600">
            <FileText className="w-5 h-5" />
            Download report
          </CardTitle>
          <CardDescription>
            Download your screening report (with AutismCare branding and full results).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="gap-2" onClick={downloadReport}>
            <Download className="w-4 h-4" />
            Download Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

