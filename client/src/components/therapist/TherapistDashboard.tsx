import React, { useState } from 'react';
import { Home, ClipboardList, Calendar, MessageSquare, TrendingUp, Inbox, LibraryBig, House, FileText, Bell } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { TherapistHome } from './TherapistHome';
import { TherapyPlans } from './TherapyPlans';
import { TherapistMessages } from './TherapistMessages';
import { TherapistProgress } from './TherapistProgress';
import { TherapistAssignedCases } from './TherapistAssignedCases';
import ActivityLibraryPage from '../../pages/activity-library/ActivityLibraryPage';
import TherapistSessionsListPage from '../../pages/sessions/TherapistSessionsListPage';
import TherapistHomeAssignmentsPage from '../../pages/home-assignments/TherapistHomeAssignmentsPage';
import TherapistReportsPage from '../../pages/reports/TherapistReportsPage';
import { TherapistCommunicationTopBar } from './TherapistCommunicationTopBar';
import { TherapistNotificationsPage } from './TherapistNotificationsPage';

type Section =
  | 'home'
  | 'assigned'
  | 'plans'
  | 'sessions'
  | 'activity-library'
  | 'home-assignments'
  | 'progress'
  | 'reports'
  | 'messages'
  | 'notifications';

interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  primaryRole: 'parent' | 'doctor' | 'therapist' | 'laboratory' | 'admin';
  roles: Array<'parent' | 'doctor' | 'therapist' | 'laboratory' | 'admin'>;
  email: string;
}

interface TherapistDashboardProps {
  user?: User; // optional, so we can render dummy for now
  onLogout?: () => void;
}

const navigation = [
  { id: 'home', label: 'Dashboard', icon: Home, color: 'text-sky-700' },
  { id: 'assigned', label: 'Assigned Cases', icon: Inbox, color: 'text-sky-700' },
  { id: 'plans', label: 'Therapy Plans', icon: ClipboardList, color: 'text-sky-700' },
  { id: 'sessions', label: 'Sessions', icon: Calendar, color: 'text-sky-700' },
  { id: 'activity-library', label: 'Activity Library', icon: LibraryBig, color: 'text-sky-700' },
  { id: 'home-assignments', label: 'Home Assignments', icon: House, color: 'text-sky-700' },
  { id: 'progress', label: 'Progress Analytics', icon: TrendingUp, color: 'text-sky-700' },
  { id: 'reports', label: 'Reports', icon: FileText, color: 'text-sky-700' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, color: 'text-sky-700', group: 'communication' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-sky-700', group: 'communication' },
];

export function TherapistDashboard({ user, onLogout }: TherapistDashboardProps) {
  // Safe dummy user if none provided
  const safeUser: User = user ?? {
    _id: '1',
    firstName: 'Rabia',
    lastName: 'Babar',
    email: 'rabiababar@example.com',
    primaryRole: 'therapist',
    roles: ['therapist'],
  };

  const [currentSection, setCurrentSection] = useState<Section>('home');

  // Generate fullName and initials safely
  const fullName = `${safeUser.firstName || ''} ${safeUser.lastName || ''}`.trim();
  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'JD';

  const handleNavigate = (section: string) => {
    setCurrentSection(section as Section);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'home':
        return <TherapistHome onNavigate={handleNavigate} />;
      case 'assigned':
        return <TherapistAssignedCases />;
      case 'plans':
        return <TherapyPlans />;
      case 'sessions':
        return <TherapistSessionsListPage embedded />;
      case 'activity-library':
        return <ActivityLibraryPage />;
      case 'home-assignments':
        return <TherapistHomeAssignmentsPage embedded />;
      case 'progress':
        return <TherapistProgress />;
      case 'reports':
        return <TherapistReportsPage />;
      case 'messages':
        return <TherapistMessages />;
      case 'notifications':
        return <TherapistNotificationsPage />;
      default:
        return <TherapistHome onNavigate={handleNavigate} />;
    }

  };

  return (
    <DashboardLayout
      variant="clinical"
      navigation={navigation}
      currentSection={currentSection}
      onSectionChange={(section: string) => setCurrentSection(section as Section)}
      onLogout={onLogout}
      title="Therapist Dashboard"
      onOpenNotifications={() => setCurrentSection('notifications')}
      communicationCluster={
        <TherapistCommunicationTopBar
          variant="clinical"
          onOpenMessages={() => setCurrentSection('messages')}
          onOpenNotifications={() => setCurrentSection('notifications')}
        />
      }
    >
      {renderSection()}
    </DashboardLayout>
  );
}
