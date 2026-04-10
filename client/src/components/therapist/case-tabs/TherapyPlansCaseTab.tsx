import { useMemo } from 'react';
import { TherapyPlanBuilder } from '../../therapy-plan/TherapyPlanBuilder';
import type { TherapistCaseFileData } from './caseFileTypes';

type Props = {
  caseId: string;
  data: TherapistCaseFileData;
  onRefresh: () => void | Promise<void>;
};

export function TherapyPlansCaseTab({ caseId, data, onRefresh }: Props) {
  /** Stable reference when underlying therapyPlan object is unchanged — avoids TherapyPlanBuilder sync loops. */
  const plan = useMemo(
    () => (data.therapyPlan as Record<string, unknown> | null) ?? null,
    [data.therapyPlan]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Build or update the therapy plan for this case. Short-term goals include <strong>domain</strong> and{' '}
        <strong>status</strong> for clinician progress analytics.
      </p>
      <TherapyPlanBuilder caseId={caseId} plan={plan} onSaved={() => void onRefresh()} />
    </div>
  );
}
