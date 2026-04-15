import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { sessionAPI } from '../../../api';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { SessionList, type SessionRow } from '../../session/SessionList';
import type { TherapistCaseFileData } from './caseFileTypes';

type Props = { caseId: string; data: TherapistCaseFileData; onRefresh?: () => void | Promise<void> };

export function SessionsCaseTab({ caseId, data, onRefresh }: Props) {
  const navigate = useNavigate();
  const sessions = (data.sessions || []) as SessionRow[];

  const handleSign = async (s: SessionRow) => {
    if (!s._id) return;
    try {
      await sessionAPI.sign(s._id);
      toast.success('Session note signed');
      await onRefresh?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not sign session');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border bg-card shadow-sm">
        <CardHeader className="border-b border bg-card">
          <CardTitle className="text-base font-semibold text-foreground">Therapy sessions</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sessions for this case only. Data supports clinician progress and trend analytics.
          </CardDescription>
          <CardAction>
            <Button
              type="button"
              size="sm"
              className="inline-flex h-9 shrink-0 whitespace-nowrap rounded-lg border bg-card px-4 text-sm font-medium text-black shadow-sm hover:bg-background"
              onClick={() => void navigate(`/therapist/sessions/new?caseId=${encodeURIComponent(caseId)}`)}
            >
              <Plus className="mr-1.5 h-4 w-4 shrink-0 text-black" strokeWidth={2.5} />
              Add New Session
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-6">
          <SessionList
            variant="cards"
            sessions={sessions}
            showAddButton={false}
            onEdit={(s) =>
              void navigate(
                `/therapist/sessions/new?caseId=${encodeURIComponent(caseId)}&sessionId=${encodeURIComponent(String(s._id || ''))}`
              )
            }
            onSign={handleSign}
          />
        </CardContent>
      </Card>
    </div>
  );
}
