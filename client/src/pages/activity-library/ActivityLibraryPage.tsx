import { ActivityLibraryScreen } from '../../components/activity-library/ActivityLibraryScreen';

/** Therapist dashboard: global activity library (assign disabled until user opens a case file). */
export default function ActivityLibraryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-10 pt-2">
      <ActivityLibraryScreen />
    </div>
  );
}
