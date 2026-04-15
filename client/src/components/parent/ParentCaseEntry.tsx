import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { parentAPI } from '../../api';

/**
 * /parent/case — redirects to the first case or back to dashboard to add a child.
 */
export function ParentCaseEntry() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await parentAPI.getCases();
        const rows = (res.data?.data || []) as { caseId?: string }[];
        if (cancelled) return;
        if (rows.length > 0 && rows[0].caseId) {
          navigate(`/parent/case/${String(rows[0].caseId)}`, { replace: true });
          return;
        }
        navigate('/parent-dashboard', { replace: true, state: { section: 'children' } });
      } catch {
        if (!cancelled) navigate('/parent-dashboard', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">Opening child case…</p>
    </div>
  );
}
