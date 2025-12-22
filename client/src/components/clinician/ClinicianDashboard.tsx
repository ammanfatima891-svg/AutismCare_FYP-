import { useState } from 'react';
import { Home, Users, ClipboardList, Calendar, MessageSquare } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { ClinicianHome } from './ClinicianHome';
import { PatientManagement } from './PatientManagement';
import { ScreeningReviews } from './ScreeningReviews';
import { AppointmentsManagement } from './AppointmentsManagement';
import { ClinicianMessages } from './ClinicianMessages';

type Section = 'home' | 'patients' | 'screenings' | 'appointments' | 'messages';

interface ClinicianDashboardProps {
  user?: any;
  onLogout?: () => void;
}

const navigation = [
  { id: 'home', label: 'Dashboard', icon: Home, color: 'text-blue-600' },
  { id: 'patients', label: 'Patients', icon: Users, color: 'text-green-600' },
  { id: 'screenings', label: 'Screening Reviews', icon: ClipboardList, color: 'text-purple-600' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, color: 'text-orange-600' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, color: 'text-indigo-600' },
];

export function ClinicianDashboard({ user, onLogout }: ClinicianDashboardProps) {
  const [currentSection, setCurrentSection] = useState<Section>('home');

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
      case 'appointments':
        return <AppointmentsManagement />;
      case 'messages':
        return <ClinicianMessages />;
      default:
        return <ClinicianHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <DashboardLayout
      navigation={navigation}
      currentSection={currentSection}
      onSectionChange={(section: string) => setCurrentSection(section as Section)}
      onLogout={onLogout}
      title="Clinician Dashboard"
    >
      {renderSection()}
    </DashboardLayout>
  );
}
