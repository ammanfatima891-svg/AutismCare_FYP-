import { Home, Baby, ClipboardList, Calendar, FlaskConical, FileText, FolderOpen, ListChecks, Stethoscope } from 'lucide-react';
import type { NavigationItem } from '../layout/DashboardLayout';

/** Shared parent sidebar — Child Case links to entry route `/parent/case` (redirects to /parent/case/:caseId). */
export function getParentNavigationItems(): NavigationItem[] {
  return [
    { id: 'home', label: 'Home', icon: Home, color: 'text-blue-600' },
    { id: 'children', label: 'My Children', icon: Baby, color: 'text-pink-600' },
    {
      id: 'child-case',
      label: 'Child Case',
      icon: FolderOpen,
      color: 'text-sky-700',
      to: '/parent/case',
      activePathPrefix: '/parent/case',
    },
    { id: 'home-activities', label: 'Home Activities', icon: ListChecks, color: 'text-sky-700' },
    { id: 'therapy-reports', label: 'Therapy Reports', icon: Stethoscope, color: 'text-sky-700' },
    { id: 'screening', label: 'Screening', icon: ClipboardList, color: 'text-purple-600' },
    { id: 'total-screenings', label: 'Total Screenings', icon: FileText, color: 'text-indigo-600' },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: Calendar,
      color: 'text-orange-600',
      children: [
        { id: 'book-appointment', label: 'Book Appointment' },
        { id: 'appointments', label: 'Total Appointments' },
      ],
    },
    { id: 'lab-reports', label: 'Lab Reports', icon: FlaskConical, color: 'text-teal-600' },
  ];
}
