import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Layers, FolderOpen } from 'lucide-react';
import { DashboardLayout, type NavigationItem } from '../layout/DashboardLayout';
import { ScreeningReviews } from './ScreeningReviews';
import { AppointmentsManagement } from './AppointmentsManagement';
import { ClinicianMessages } from './ClinicianMessages';
import { ClinicianLabReports } from './ClinicianLabReports';
import { ChildCaseList } from '../case/ChildCaseList';
import { ChildCaseDetail, type ChildCaseDetailTab } from '../case/ChildCaseDetail';
import { ClinicianNotificationsPage } from '../notifications/ClinicianNotificationsPage';
import { ClinicalOverview } from './ClinicalOverview';
import { ClinicianActiveCases } from './ClinicianActiveCases';
import { useClinicianCaseloadEngines } from './useClinicianCaseloadEngines';

type Section =
  | 'clinical-overview'
  | 'active-cases'
  | 'cases'
  | 'screenings'
  | 'appointments'
  | 'messages'
  | 'lab-reports'
  | 'notifications';

interface ClinicianDashboardProps {
  user?: unknown;
  onLogout?: () => void;
}

const navigation: NavigationItem[] = [
  {
    id: 'clinical-primary',
    label: 'Clinical',
    icon: Activity,
    children: [
      { id: 'clinical-overview', label: 'Clinical overview' },
      { id: 'active-cases', label: 'Active cases' },
    ],
  },
  {
    id: 'clinical-workflows',
    label: 'Workflows',
    icon: FolderOpen,
    children: [
      { id: 'cases', label: 'Case directory' },
      { id: 'screenings', label: 'Screenings' },
    ],
  },
  {
    id: 'clinical-operations',
    label: 'Operations',
    icon: Layers,
    children: [
      { id: 'appointments', label: 'Appointments' },
      { id: 'messages', label: 'Messages' },
      { id: 'lab-reports', label: 'Lab reports' },
      { id: 'notifications', label: 'Notifications' },
    ],
  },
];

export function ClinicianDashboard({ onLogout }: ClinicianDashboardProps) {
  const [currentSection, setCurrentSection] = useState<Section>('clinical-overview');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseDetailTab, setCaseDetailTab] = useState<ChildCaseDetailTab>('overview');
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const caseload = useClinicianCaseloadEngines();

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
    if (currentSection !== 'cases') {
      setActiveCaseId(null);
      setCaseDetailTab('overview');
    }
  }, [currentSection]);

  const handleSectionChange = (section: string) => {
    setCurrentSection(section as Section);
  };

  const openCase = useCallback((caseId: string, tab: ChildCaseDetailTab = 'overview') => {
    setCaseDetailTab(tab);
    setActiveCaseId(caseId);
    setCurrentSection('cases');
  }, []);

  const clearOpenConversation = useCallback(() => setOpenConversationId(null), []);

  const renderSection = () => {
    switch (currentSection) {
      case 'clinical-overview':
        return (
          <ClinicalOverview
            entries={caseload.entries}
            health={caseload.health}
            loading={caseload.loading}
            error={caseload.error}
            onReload={caseload.reload}
            onOpenCase={(id) => openCase(id, 'overview')}
            onViewProgress={(id) => openCase(id, 'progress')}
            onStartInterventionReview={(id) => openCase(id, 'therapy')}
            onScheduleReassessment={(id) => openCase(id, 'evaluation')}
          />
        );
      case 'active-cases':
        return (
          <ClinicianActiveCases
            entries={caseload.entries}
            loading={caseload.loading}
            error={caseload.error}
            onOpenCase={(id) => openCase(id, 'overview')}
          />
        );
      case 'screenings':
        return <ScreeningReviews />;
      case 'cases':
        if (activeCaseId) {
          return (
            <ChildCaseDetail
              caseId={activeCaseId}
              initialTab={caseDetailTab}
              onBack={() => {
                setActiveCaseId(null);
                setCaseDetailTab('overview');
              }}
            />
          );
        }
        return <ChildCaseList onOpenCase={(id) => openCase(id, 'overview')} />;
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
        return (
          <ClinicalOverview
            entries={caseload.entries}
            health={caseload.health}
            loading={caseload.loading}
            error={caseload.error}
            onReload={caseload.reload}
            onOpenCase={(id) => openCase(id, 'overview')}
            onViewProgress={(id) => openCase(id, 'progress')}
            onStartInterventionReview={(id) => openCase(id, 'therapy')}
            onScheduleReassessment={(id) => openCase(id, 'evaluation')}
          />
        );
    }
  };

  return (
    <DashboardLayout
      navigation={navigation}
      currentSection={currentSection}
      onSectionChange={(section: string) => handleSectionChange(section)}
      onOpenNotifications={() => setCurrentSection('notifications')}
      onLogout={onLogout}
      title="Clinical cockpit"
      variant="clinical"
    >
      {renderSection()}
    </DashboardLayout>
  );
}
