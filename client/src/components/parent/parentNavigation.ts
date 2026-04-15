import {
  Home,
  Baby,
  ClipboardList,
  Calendar,
  FlaskConical,
  FileText,
  FolderOpen,
  ListChecks,
  Stethoscope,
  MessageSquare,
} from 'lucide-react';
import type { NavigationItem } from '../layout/DashboardLayout';

/**
 * Parent sidebar order: care path first (children → case → day-to-day care),
 * then scheduling, dual screening entry (questionnaires + facial), history, labs.
 */
export function getParentNavigationItems(): NavigationItem[] {
  return [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'children', label: 'My Children', icon: Baby },
    {
      id: 'child-case',
      label: 'Child Case',
      icon: FolderOpen,
      to: '/parent/case',
      activePathPrefix: '/parent/case',
    },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'home-activities', label: 'Home Activities', icon: ListChecks },
    { id: 'therapy-reports', label: 'Therapy Reports', icon: Stethoscope },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: Calendar,
      children: [
        { id: 'book-appointment', label: 'Book appointment' },
        { id: 'appointments', label: 'Appointment status' },
      ],
    },
    {
      id: 'screening',
      label: 'Screening',
      icon: ClipboardList,
      children: [
        { id: 'screening-questionnaires', label: 'Questionnaires (M-CHAT / ASQ)' },
        { id: 'facial-screening', label: 'Facial screening' },
      ],
    },
    { id: 'total-screenings', label: 'Screening history', icon: FileText },
    { id: 'lab-reports', label: 'Lab Reports', icon: FlaskConical },
  ];
}
