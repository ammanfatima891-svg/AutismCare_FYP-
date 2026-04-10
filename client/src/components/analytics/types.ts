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

export type CaseAnalyticsPayload = {
  overallProgress: number;
  goalProgress: GoalProgressRow[];
  domainProgress: DomainProgressRow[];
  sessionTrend: SessionTrendPoint[];
  activityEffectiveness: ActivityEffectivenessRow[];
  assignmentStats: AssignmentStats;
  reviewAlert: ReviewAlert;
};
