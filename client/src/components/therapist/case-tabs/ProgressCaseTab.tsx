import { CaseProgressAnalyticsDashboard } from '../../analytics/CaseProgressAnalyticsDashboard';
import type { TherapistCaseFileData } from './caseFileTypes';

type Props = {
  caseId: string;
  data: TherapistCaseFileData;
};

export function ProgressCaseTab({ caseId, data }: Props) {
  const childLabel =
    `${data.child.firstName || ''} ${data.child.lastName || ''}`.trim() || 'Child';

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Session-based metrics for this case. Goals and domains come from the assigned therapy plan; trends use session
        logs and home assignments.
      </p>
      <CaseProgressAnalyticsDashboard caseId={caseId} childLabel={childLabel} />
    </div>
  );
}
