import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { SessionList, type SessionRow } from '../../session/SessionList';
import type { TherapistCaseFileData } from './caseFileTypes';

type Props = { caseId: string; data: TherapistCaseFileData; onRefresh?: () => void | Promise<void> };

export function SessionsCaseTab({ caseId, data }: Props) {
  const navigate = useNavigate();
  const sessions = (data.sessions || []) as SessionRow[];

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white">
          <CardTitle className="text-base font-semibold text-sky-950">Therapy sessions</CardTitle>
          <CardDescription className="text-slate-600">
            Sessions for this case only. Data supports clinician progress and trend analytics.
          </CardDescription>
          <CardAction>
            <Button
              type="button"
              size="sm"
              className="inline-flex h-9 shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-black shadow-sm hover:bg-slate-50"
              onClick={() => void navigate(`/therapist/sessions/new?caseId=${encodeURIComponent(caseId)}`)}
            >
              <Plus className="mr-1.5 h-4 w-4 shrink-0 text-black" strokeWidth={2.5} />
              Add New Session
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-6">
          <SessionList variant="cards" sessions={sessions} showAddButton={false} />
        </CardContent>
      </Card>
    </div>
  );
}
