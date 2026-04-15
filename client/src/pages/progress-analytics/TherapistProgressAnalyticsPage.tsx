import { Link } from 'react-router-dom';
import { TherapistProgressHub } from '../../components/analytics/TherapistProgressHub';

/** Optional full-page entry; same experience as dashboard → Progress Analytics. */
export default function TherapistProgressAnalyticsPage() {
  return (
    <div className="min-h-screen bg-muted/80 p-4 md:p-6">
      <div className="mx-auto mb-6 max-w-6xl">
        <Link
          to="/therapist-dashboard"
          className="text-sm font-medium text-blue-800 underline-offset-4 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
      <TherapistProgressHub />
    </div>
  );
}
