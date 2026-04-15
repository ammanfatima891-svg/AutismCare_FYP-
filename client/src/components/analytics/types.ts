export type DomainTrend = 'improving' | 'stable' | 'declining';

export type GoalProgressRow = {
  goalId: string;
  goalName: string;
  domain: string;
  progressPercent: number;
  status: string;
};

export type DomainProgressRow = {
  domain: string;
  progressPercent: number;
  trend: DomainTrend;
};

export type SessionTrendPoint = {
  date: string;
  childResponse: number | null;
};

export type ActivityEffectivenessRow = {
  activityName: string;
  avgChildResponse: number | null;
  usageCount: number;
};

export type AssignmentStats = {
  total: number;
  pending: number;
  submitted: number;
  completed: number;
  percentages: {
    pending: number;
    submitted: number;
    completed: number;
  };
};

export type ReviewAlert = {
  reviewRequired: boolean;
  message: string;
};

export type StakeholderKpis = {
  goalsTracked: number;
  goalsMastered: number;
  goalsImproving: number;
  goalsDeclining: number;
  goalsStalled: number;
  goalsLowData: number;
  attendance: {
    completed: number;
    missed: number;
    rescheduled: number;
    attendanceRatePercent: number | null;
  };
  homeProgram: {
    onTimeSubmissions: number;
    submittedOrReviewed: number;
    onTimeSubmissionRatePercent: number | null;
  };
};

export type GoalKpiRow = {
  goalKey: string;
  goalName: string;
  domain: string;
  planStatus: string;
  dataPoints: number;
  recentPerformance: number | null;
  overallAvg: number | null;
  trend: string;
  trendSlope: number;
  mastery: { mastered: boolean; reason?: string; windowAvg?: number };
  stalled: boolean;
  declining: boolean;
  measurementType: string;
};

export type DomainKpiRow = {
  domain: string;
  recentAvgPercent: number | null;
  trend: string;
  goalsWithData: number;
};

export type ClinicalDomainRow = {
  name: string;
  score: number;
  status: string;
};

export type ProgressEngineGoalRow = {
  goalId: string;
  domain: string;
  baseline: number | null;
  current: number | null;
  target: number | null;
  trend: string;
  masteryStatus: string;
  goalName?: string;
  measurementType?: string;
  dataPoints?: number;
};

export type ProgressEngineWeeklyPoint = {
  week: string;
  score: number;
  x: string;
  y: number;
};

export type ProgressEnginePayload = {
  engineVersion?: number;
  overallScore: number;
  improvementRate: number;
  consistency: number;
  activityCompletionRate?: number | null;
  domains: ClinicalDomainRow[];
  goals: ProgressEngineGoalRow[];
  weeklyTrend: ProgressEngineWeeklyPoint[];
  weakAreas: Array<{ type?: string; goalId?: string; reason?: string } | string>;
  smartAlerts?: Array<{ severity?: string; code?: string; message?: string }>;
  sessionInsights?: Array<{
    sessionId: string;
    sessionDate: string;
    goalsImpacted: Array<
      | string
      | { goalId?: string; goalName?: string; scoreChange?: number; score?: number }
    >;
    notePreview?: string;
  }>;
  _meta?: Record<string, unknown>;
};

export type CaseAnalyticsPayload = {
  schemaVersion?: number;
  overallProgress: number;
  goalProgress: GoalProgressRow[];
  domainProgress: DomainProgressRow[];
  sessionTrend: SessionTrendPoint[];
  activityEffectiveness: ActivityEffectivenessRow[];
  assignmentStats: AssignmentStats;
  reviewAlert: ReviewAlert;
  kpis?: StakeholderKpis;
  goalKpis?: GoalKpiRow[];
  domainKpis?: DomainKpiRow[];
  alerts?: string[];
  planMeta?: {
    planVersion?: number;
    planDocumentStatus?: string;
    approval?: { status?: string; requestedAt?: string | null; approvedAt?: string | null };
    lastPlanUpdate?: string | null;
  };
  reviewAlertV2?: { reviewRequired: boolean; message: string };
  /** Unified progress engine snapshot (same service as /api/progress-engine). */
  progressEngine?: ProgressEnginePayload;
};
