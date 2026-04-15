import type { CaseLabRequestRow } from '../../case/CaseLabRequestsPanel';

export type TherapistCaseFileData = {
  case: {
    _id: string;
    status: string;
    riskLevel: string;
    updatedAt?: string;
  };
  child: {
    firstName: string;
    lastName: string;
    age: number | null;
    gender: string | null;
  };
  parent: {
    firstName: string;
    lastName: string;
    email: string;
    contact: string;
  };
  referral: {
    therapistType: string;
    priority: string;
    notes: string;
    status: string;
    reasonForReferral: string;
  } | null;
  therapyPlan: Record<string, unknown> | null;
  sessions: Array<Record<string, unknown>>;
  assignments: Array<Record<string, unknown>>;
  domainTags: string[];
  progressSummary: {
    sessionsCount: number;
    lastSessionDate: string | null;
    goalsTotal: number;
    domainsCount: number;
  };
  labRequests?: CaseLabRequestRow[];
};
