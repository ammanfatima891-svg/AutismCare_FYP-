/**
 * Therapy scheduling is case-scoped: use Case file → Schedule tab, or navigate from therapist dashboard.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-white p-6">
      <Card className="mx-auto max-w-lg border-slate-200">
        <CardHeader>
          <CardTitle className="text-sky-950">Therapy schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            Recurring therapy schedules and generated session slots are managed from each child&apos;s{' '}
            <strong>case file</strong> (Schedule tab), not from this standalone page.
          </p>
          <Button asChild className="bg-sky-700 hover:bg-sky-800">
            <Link to="/therapist-dashboard">Back to therapist dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
