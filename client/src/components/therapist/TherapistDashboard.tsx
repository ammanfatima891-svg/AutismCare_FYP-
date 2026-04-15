import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Calendar, TrendingUp, Inbox, LibraryBig, House, FileText } from 'lucide-react';
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

/** Weekly clinical loop: caseload → sessions → plans → homework → library → analytics → reporting */
const navigation = [
  { id: 'home', label: 'Dashboard', icon: Home },
  { id: 'assigned', label: 'Assigned Cases', icon: Inbox },
  { id: 'sessions', label: 'Sessions', icon: Calendar },
  { id: 'plans', label: 'Therapy Plans', icon: ClipboardList },
  { id: 'home-assignments', label: 'Home Assignments', icon: House },
  { id: 'activity-library', label: 'Activity Library', icon: LibraryBig },
  { id: 'progress', label: 'Progress Analytics', icon: TrendingUp },
  { id: 'reports', label: 'Reports', icon: FileText },
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
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const st = (location.state || {}) as { section?: string; openConversationId?: string };
    if (!st.openConversationId && st.section !== 'messages') return;
    if (st.openConversationId) {
      setOpenConversationId(st.openConversationId);
    }
    if (st.section === 'messages' || st.openConversationId) {
      setCurrentSection('messages');
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (currentSection !== 'messages') setOpenConversationId(null);
  }, [currentSection]);

  // Generate fullName and initials safely
  const fullName = `${safeUser.firstName || ''} ${safeUser.lastName || ''}`.trim();
  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'JD';

  const handleNavigate = (section: string) => {
    setCurrentSection(section as Section);
  };

  const clearOpenConversation = useCallback(() => setOpenConversationId(null), []);

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
        return (
          <TherapistMessages
            initialConversationId={openConversationId}
            onInitialConversationHandled={clearOpenConversation}
          />
        );
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
