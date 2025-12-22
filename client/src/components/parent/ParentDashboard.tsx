import { useState } from 'react';
import { Home, Baby, ClipboardList } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { DashboardHome } from './DashboardHome';
import { ChildManagement } from './ChildManagement';
import { ScreeningSection } from './ScreeningSection';

type Section = 'home' | 'children' | 'screening';

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
