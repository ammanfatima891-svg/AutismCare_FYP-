import React from 'react';
import { useEffect, useState } from 'react';
import { Home, Users, ClipboardList, Calendar, MessageSquare, FlaskConical, Briefcase, Bell } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { ClinicianHome } from './ClinicianHome';
import { PatientManagement } from './PatientManagement';
import { ScreeningReviews } from './ScreeningReviews';
import { AppointmentsManagement } from './AppointmentsManagement';
import { ClinicianMessages } from './ClinicianMessages';
import { ClinicianLabReports } from './ClinicianLabReports';
import { ChildCaseList } from '../case/ChildCaseList';
import { ChildCaseDetail } from '../case/ChildCaseDetail';
import { ClinicianNotificationsPage } from '../notifications/ClinicianNotificationsPage';

type Section = 'home' | 'patients' | 'screenings' | 'cases' | 'appointments' | 'messages' | 'lab-reports' | 'notifications';

interface ClinicianDashboardProps {
  user?: any;
  onLogout?: () => void;
}

const navigation = [
  { id: 'home', label: 'Dashboard', icon: Home, color: 'text-blue-600' },
  { id: 'patients', label: 'Patients', icon: Users, color: 'text-green-600' },
  { id: 'screenings', label: 'Screening Reviews', icon: ClipboardList, color: 'text-purple-600' },
  { id: 'cases', label: 'Child Cases', icon: Briefcase, color: 'text-sky-600' },
  { id: 'lab-reports', label: 'Lab Reports', icon: FlaskConical, color: 'text-teal-600' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, color: 'text-orange-600' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, color: 'text-indigo-600' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-rose-600' },
];

export function ClinicianDashboard({ user, onLogout }: ClinicianDashboardProps) {
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (currentSection !== 'cases') setActiveCaseId(null);
  }, [currentSection]);

  const handleSectionChange = (section: Section) => {
    setCurrentSection(section);
  };

  const handleNavigate = (section: string) => {
    setCurrentSection(section as Section);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'home':
        return <ClinicianHome onNavigate={handleNavigate} />;
      case 'patients':
        return <PatientManagement />;
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
        return <ClinicianMessages />;
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
