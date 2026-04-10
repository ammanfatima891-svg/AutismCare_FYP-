import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { therapistAPI } from '../../api';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { TherapistCaseFileData } from './case-tabs/caseFileTypes';
import { OverviewTab } from './case-tabs/OverviewTab';
import { TherapyPlansCaseTab } from './case-tabs/TherapyPlansCaseTab';
import { SessionsCaseTab } from './case-tabs/SessionsCaseTab';
import { AssignedActivityCaseTab } from './case-tabs/AssignedActivityCaseTab';
import { HomeAssignmentsCaseTab } from './case-tabs/HomeAssignmentsCaseTab';
import { ProgressCaseTab } from './case-tabs/ProgressCaseTab';
import { ReportsCaseTab } from './case-tabs/ReportsCaseTab';
import { ScheduleCaseTab } from '../schedule/ScheduleCaseTab';

const CASE_FILE_TABS = ['overview', 'plans', 'sessions', 'schedule', 'library', 'assignments', 'progress', 'reports'] as const;

export function TherapistCaseFile() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const t = searchParams.get('tab');
    if (t && CASE_FILE_TABS.includes(t as (typeof CASE_FILE_TABS)[number])) return t;
    return 'overview';
  }, [searchParams]);

  const onTabChange = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === 'overview') next.delete('tab');
          else next.set('tab', value);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TherapistCaseFileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      setError(null);
      const { data: res } = await therapistAPI.getCaseFile(caseId);
      setData(res?.data || null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to load therapy case file');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const childName = data
    ? `${data.child.firstName || ''} ${data.child.lastName || ''}`.trim() || 'Child'
    : '…';
  const ageLabel = data?.child.age != null ? `${data.child.age} yrs` : '—';
  const caseStatus = data?.case.status ?? '—';

  return (
    <div className="min-h-screen bg-slate-50/80">
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button variant="outline" size="sm" className="mb-3" onClick={() => navigate('/therapist-dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
            <h1 className="text-2xl font-bold text-sky-900">Child therapy case file</h1>
            <p className="text-sm text-slate-600">Case ID: {caseId}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
          </div>
        ) : data ? (
          <>
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="flex flex-col gap-2 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{childName}</p>
                  <p className="text-sm text-slate-600">
                    Age <span className="font-medium text-slate-800">{ageLabel}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    Case status{' '}
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
                      {caseStatus}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full gap-4">
              <TabsList className="flex h-auto min-h-10 w-full max-w-full flex-wrap justify-start gap-1 bg-sky-100/60 p-1">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="plans" className="text-xs sm:text-sm">
                  Therapy plans
                </TabsTrigger>
                <TabsTrigger value="sessions" className="text-xs sm:text-sm">
                  Sessions
                </TabsTrigger>
                <TabsTrigger value="schedule" className="text-xs sm:text-sm">
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="library" className="text-xs sm:text-sm">
                  Assigned Activity
                </TabsTrigger>
                <TabsTrigger value="assignments" className="text-xs sm:text-sm">
                  Home assignments
                </TabsTrigger>
                <TabsTrigger value="progress" className="text-xs sm:text-sm">
                  Progress
                </TabsTrigger>
                <TabsTrigger value="reports" className="text-xs sm:text-sm">
                  Reports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <OverviewTab data={data} />
              </TabsContent>
              <TabsContent value="plans" className="mt-4">
                <TherapyPlansCaseTab caseId={caseId} data={data} onRefresh={load} />
              </TabsContent>
              <TabsContent value="sessions" className="mt-4">
                <SessionsCaseTab caseId={caseId} data={data} onRefresh={load} />
              </TabsContent>
              <TabsContent value="schedule" className="mt-4">
                <ScheduleCaseTab caseId={caseId} />
              </TabsContent>
              <TabsContent value="library" className="mt-4">
                <AssignedActivityCaseTab caseId={caseId} data={data} onRefresh={load} />
              </TabsContent>
              <TabsContent value="assignments" className="mt-4">
                <HomeAssignmentsCaseTab caseId={caseId} data={data} onRefresh={load} />
              </TabsContent>
              <TabsContent value="progress" className="mt-4">
                <ProgressCaseTab caseId={caseId} data={data} />
              </TabsContent>
              <TabsContent value="reports" className="mt-4">
                <ReportsCaseTab caseId={caseId} />
              </TabsContent>
            </Tabs>
          </>
        ) : !error ? (
          <p className="text-sm text-slate-600">No data.</p>
        ) : null}
      </div>
    </div>
  );
}
