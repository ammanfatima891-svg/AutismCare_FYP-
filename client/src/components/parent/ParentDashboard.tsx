import { useState } from 'react';
import { Home, Baby, ClipboardList, Calendar, FlaskConical, FileText } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { DashboardHome } from './DashboardHome';
import { ChildManagement } from './ChildManagement';
import { ScreeningSection } from './ScreeningSection';
import { AppointmentsSection } from './AppointmentsSection';
import { ParentLabReports } from './ParentLabReports';
import { ParentScreenings } from './ParentScreenings';

type Section = 'home' | 'children' | 'screening' | 'total-screenings' | 'book-appointment' | 'appointments' | 'lab-reports';

interface AuthUser {
  token: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface ParentDashboardProps {
  user?: AuthUser;
  onLogout?: () => void;
}

const navigation = [
  { id: 'home', label: 'Home', icon: Home, color: 'text-blue-600' },
  { id: 'children', label: 'My Children', icon: Baby, color: 'text-pink-600' },
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

export function ParentDashboard({ user, onLogout }: ParentDashboardProps) {
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
        return <DashboardHome onNavigate={handleNavigate} />;
      case 'children':
        return <ChildManagement />;
      case 'screening':
        return <ScreeningSection />;
      case 'total-screenings':
        return <ParentScreenings />;
      case 'book-appointment':
        return <AppointmentsSection formOnly initialShowBooking />;
      case 'appointments':
        return <AppointmentsSection />;
      case 'lab-reports':
        return <ParentLabReports />;
      default:
        return <DashboardHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <DashboardLayout
      navigation={navigation}
      currentSection={currentSection}
      onSectionChange={(section: string) => setCurrentSection(section as Section)}
      onLogout={onLogout}
    >
      {renderSection()}
    </DashboardLayout>
  );
}

