import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Calendar, MessageSquare, FlaskConical, Briefcase } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { ClinicianHome } from './ClinicianHome';
import { ScreeningReviews } from './ScreeningReviews';
import { AppointmentsManagement } from './AppointmentsManagement';
import { ClinicianMessages } from './ClinicianMessages';
import { ClinicianLabReports } from './ClinicianLabReports';
import { ChildCaseList } from '../case/ChildCaseList';
import { ChildCaseDetail } from '../case/ChildCaseDetail';
import { ClinicianNotificationsPage } from '../notifications/ClinicianNotificationsPage';

type Section = 'home' | 'screenings' | 'cases' | 'appointments' | 'messages' | 'lab-reports' | 'notifications';

interface ClinicianDashboardProps {
  user?: any;
  onLogout?: () => void;
}

/** Triage → schedule → case work → records → async comms */
const navigation = [
  { id: 'home', label: 'Dashboard', icon: Home },
  { id: 'screenings', label: 'Screening Reviews', icon: ClipboardList },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'cases', label: 'Child Cases', icon: Briefcase },
  { id: 'lab-reports', label: 'Lab Reports', icon: FlaskConical },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
];

export function ClinicianDashboard({ user, onLogout }: ClinicianDashboardProps) {
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
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

  useEffect(() => {
    if (currentSection !== 'cases') setActiveCaseId(null);
  }, [currentSection]);

  const handleSectionChange = (section: Section) => {
    setCurrentSection(section);
  };

  const handleNavigate = (section: string) => {
    setCurrentSection(section as Section);
  };

  const clearOpenConversation = useCallback(() => setOpenConversationId(null), []);

  const renderSection = () => {
    switch (currentSection) {
      case 'home':
        return <ClinicianHome onNavigate={handleNavigate} />;
      case 'screenings':
        return <ScreeningReviews />;
      case 'cases':
        if (activeCaseId) {
          return (
            <ChildCaseDetail caseId={activeCaseId} onBack={() => setActiveCaseId(null)} />
          );
        }
        return <ChildCaseList onOpenCase={(id) => setActiveCaseId(id)} />;
      case 'lab-reports':
        return <ClinicianLabReports />;
      case 'appointments':
        return <AppointmentsManagement />;
      case 'messages':
        return (
          <ClinicianMessages
            initialConversationId={openConversationId}
            onInitialConversationHandled={clearOpenConversation}
          />
        );
      case 'notifications':
        return <ClinicianNotificationsPage />;
      default:
        return <ClinicianHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <DashboardLayout
      navigation={navigation}
      currentSection={currentSection}
      onSectionChange={(section: string) => setCurrentSection(section as Section)}
      onOpenNotifications={() => setCurrentSection('notifications')}
      onLogout={onLogout}
      title="Clinician Dashboard"
    >
      {renderSection()}
    </DashboardLayout>
  );
}
