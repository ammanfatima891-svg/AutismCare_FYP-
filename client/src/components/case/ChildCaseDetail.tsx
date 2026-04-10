import { useEffect, useState } from 'react';
import { caseAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, ArrowLeft, AlertCircle, ClipboardList, Users, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ClinicalEvaluationTab } from '../evaluation/ClinicalEvaluationTab';
import { ReferralTab } from '../referral/ReferralTab';
import { TherapyOversightTab } from '../therapy/TherapyOversightTab';
import { ProgressMonitoringTab } from '../progress/ProgressMonitoringTab';
import { ClinicianCaseReports } from '../reports/ClinicianCaseReports';

export interface ChildCaseDetailProps {
  caseId: string;
  onBack: () => void;
}

const riskBadgeClass: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-900 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
  unknown: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function ChildCaseDetail({ caseId, onBack }: ChildCaseDetailProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'evaluation' | 'referrals' | 'therapy' | 'progress' | 'reports'
  >('overview');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: res } = await caseAPI.getById(caseId);
        if (!cancelled && res.success) {
          setData(res.data);
          setStatus(res.data.status);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load case');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const handleStatusChange = async (next: string) => {
    setStatus(next);
    try {
      setSaving(true);
      await caseAPI.updateStatus(caseId, next);
      const { data: res } = await caseAPI.getById(caseId);
      if (res.success) setData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not update status');
    } finally {
      setSaving(false);
    }
  };

  const childName = data?.childProfile
    ? `${data.childProfile.firstName || ''} ${data.childProfile.lastName || ''}`.trim()
    : 'Child';
  const screening = data?.screeningSummary || {};
  const statusOptions: string[] = data?.statusOptions || [
    'Active',
    'Under Evaluation',
    'Referred',
    'Ongoing Therapy',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-700">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to cases
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{childName}</h2>
              <p className="text-slate-600 text-sm mt-1">Child case · ID {data._id}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Case status</span>
              <Select
                value={status}
                onValueChange={handleStatusChange}
                disabled={saving}
              >
                <SelectTrigger className="w-[220px] border-slate-200 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as 'overview' | 'evaluation' | 'referrals' | 'therapy' | 'progress' | 'reports')
            }
          >
            <TabsList className="w-full justify-start sm:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="evaluation">Clinical Evaluation</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
              <TabsTrigger value="therapy">Therapy Oversight</TabsTrigger>
              <TabsTrigger value="progress">Progress Monitoring</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm bg-white">
                  <CardHeader className="border-b border-slate-100 bg-blue-50/50">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                      <Users className="h-5 w-5" />
                      Child profile
                    </CardTitle>
                    <CardDescription>Linked from parent account</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4 text-sm">
                    {data.childProfile ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wide">Name</p>
                            <p className="font-medium text-slate-900">{childName}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wide">Gender</p>
                            <p className="text-slate-800 capitalize">{data.childProfile.gender || '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wide">Date of birth</p>
                            <p className="text-slate-800">
                              {data.childProfile.dateOfBirth
                                ? new Date(data.childProfile.dateOfBirth).toLocaleDateString()
                                : '—'}
                            </p>
                          </div>
                        </div>
                        {(data.childProfile.medicalHistory || data.childProfile.allergies) && (
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            {data.childProfile.medicalHistory && (
                              <div>
                                <p className="text-slate-500 text-xs uppercase tracking-wide">Medical history</p>
                                <p className="text-slate-700">{data.childProfile.medicalHistory}</p>
                              </div>
                            )}
                            {data.childProfile.allergies && (
                              <div>
                                <p className="text-slate-500 text-xs uppercase tracking-wide">Allergies</p>
                                <p className="text-slate-700">{data.childProfile.allergies}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-600">Child profile could not be loaded.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white">
                  <CardHeader className="border-b border-slate-100 bg-blue-50/50">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                      <Users className="h-5 w-5" />
                      Parent / guardian
                    </CardTitle>
                    <CardDescription>Primary contact</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3 text-sm">
                    {data.parentInfo ? (
                      <>
                        <p className="font-medium text-slate-900">
                          {data.parentInfo.firstName} {data.parentInfo.lastName}
                        </p>
                        <p className="text-slate-700">{data.parentInfo.email}</p>
                        {data.parentInfo.phoneNumber && (
                          <p className="text-slate-600">{data.parentInfo.phoneNumber}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-600">Parent information unavailable.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 bg-blue-50/50">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                    <ClipboardList className="h-5 w-5" />
                    Screening summary
                  </CardTitle>
                  <CardDescription>M-CHAT-R / ASQ-3 data from screening module</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {!screening.hasScreening ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
                      {screening.message || 'No screening data on file for this child yet.'}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {screening.latest && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Latest tool</p>
                            <p className="font-medium text-slate-900">{screening.latest.questionnaireType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Result</p>
                            <p className="font-medium text-slate-900">{screening.latest.result}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Risk (from screening)</p>
                            <Badge
                              variant="outline"
                              className={
                                riskBadgeClass[screening.latest.riskLevel] || riskBadgeClass.unknown
                              }
                            >
                              {screening.latest.riskLevel}
                            </Badge>
                          </div>
                        </div>
                      )}
                      {screening.latest?.resultDescription && (
                        <p className="text-sm text-slate-700 border-t border-slate-100 pt-4">
                          {screening.latest.resultDescription}
                        </p>
                      )}
                      {Array.isArray(screening.submissions) && screening.submissions.length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                          <p className="text-xs font-semibold text-slate-600 mb-2">All submissions</p>
                          <ul className="space-y-2 text-sm">
                            {screening.submissions.map((s: any) => (
                              <li
                                key={s.submissionId}
                                className="flex flex-wrap gap-2 justify-between px-3 py-2 rounded-md bg-slate-50 border border-slate-100"
                              >
                                <span className="text-slate-800">{s.questionnaireType}</span>
                                <span className="text-slate-600">{s.result}</span>
                                <Badge variant="outline" className="text-xs">
                                  {s.riskLevel}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 bg-blue-50/50">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                    <Activity className="h-5 w-5" />
                    Case risk indicator
                  </CardTitle>
                  <CardDescription>Stored on the case record (from latest screening when available)</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={riskBadgeClass[data.riskLevel] || riskBadgeClass.unknown}
                  >
                    {data.riskLevel}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    Use status above to reflect where the child is in your diagnostic workflow.
                  </span>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evaluation" className="pt-2">
              <ClinicalEvaluationTab
                caseId={caseId}
                childName={childName}
                onCreateReferral={() => setActiveTab('referrals')}
              />
            </TabsContent>

            <TabsContent value="referrals" className="pt-2">
              <ReferralTab caseId={caseId} />
            </TabsContent>

            <TabsContent value="therapy" className="pt-2">
              <TherapyOversightTab caseId={caseId} />
            </TabsContent>

            <TabsContent value="progress" className="pt-2">
              <ProgressMonitoringTab caseId={caseId} />
            </TabsContent>

            <TabsContent value="reports" className="pt-2">
              <ClinicianCaseReports caseId={caseId} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
