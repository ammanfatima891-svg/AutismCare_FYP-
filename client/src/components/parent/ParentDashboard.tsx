import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layout/DashboardLayout';
import { DashboardHome } from './DashboardHome';
import { ChildManagement } from './ChildManagement';
import { ScreeningSection } from './ScreeningSection';
import { AppointmentsSection } from './AppointmentsSection';
import { ParentLabReports } from './ParentLabReports';
import { ParentScreenings } from './ParentScreenings';
import { ParentHomeAssignments } from './ParentHomeAssignments';
import { ParentTherapyReports } from '../reports/ParentTherapyReports';
import { getParentNavigationItems } from './parentNavigation';

type Section =
  | 'home'
  | 'children'
  | 'home-activities'
  | 'therapy-reports'
  | 'screening'
  | 'total-screenings'
  | 'book-appointment'
  | 'appointments'
  | 'lab-reports';

const VALID_SECTIONS: Section[] = [
  'home',
  'children',
  'home-activities',
  'therapy-reports',
  'screening',
  'total-screenings',
  'book-appointment',
  'appointments',
  'lab-reports',
];

function isSection(s: string): s is Section {
  return VALID_SECTIONS.includes(s as Section);
}

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

export function ParentDashboard({ user, onLogout }: ParentDashboardProps) {
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const s = (location.state as { section?: string } | null)?.section;
    if (s && isSection(s)) {
      setCurrentSection(s);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const navigation = getParentNavigationItems();

  const handleSectionChange = (section: string) => {
    setCurrentSection(section as Section);
  };

  const handleNavigate = (section: string) => {
    if (isSection(section)) setCurrentSection(section);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'home':
        return <DashboardHome onNavigate={handleNavigate} />;
      case 'children':
        return <ChildManagement />;
      case 'home-activities':
        return <ParentHomeAssignments />;
      case 'therapy-reports':
        return <ParentTherapyReports />;
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
      onSectionChange={handleSectionChange}
      onLogout={onLogout}
    >
      {renderSection()}
    </DashboardLayout>
  );
}
