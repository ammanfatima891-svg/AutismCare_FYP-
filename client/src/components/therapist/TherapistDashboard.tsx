import { useState } from 'react';
import { Home, Users, ClipboardList, Calendar, MessageSquare } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { TherapistHome } from './TherapistHome';
import { TherapistClients } from './TherapistClients';
import { TherapyPlans } from './TherapyPlans';
import { TherapistSessions } from './TherapistSessions';
import { TherapistMessages } from './TherapistMessages';

type Section = 'home' | 'clients' | 'plans' | 'sessions' | 'messages';

interface User {
  _id: string;
  fullName: string;
  primaryRole: 'parent' | 'doctor' | 'therapist' | 'laboratory' | 'admin';
  roles: Array<'parent' | 'doctor' | 'therapist' | 'laboratory' | 'admin'>;
  email: string;
}

interface TherapistDashboardProps {
  user: User;
  onLogout: () => void;
}

const navigation = [
  { id: 'home', label: 'Dashboard', icon: Home, color: 'text-green-600' },
  { id: 'clients', label: 'My Clients', icon: Users, color: 'text-blue-600' },
  { id: 'plans', label: 'Therapy Plans', icon: ClipboardList, color: 'text-purple-600' },
  { id: 'sessions', label: 'Sessions', icon: Calendar, color: 'text-orange-600' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, color: 'text-indigo-600' },
];

export function TherapistDashboard({ user, onLogout }: TherapistDashboardProps) {
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
        return <TherapistHome onNavigate={handleNavigate} />;
      case 'clients':
        return <TherapistClients />;
      case 'plans':
        return <TherapyPlans />;
      case 'sessions':
        return <TherapistSessions />;
      case 'messages':
        return <TherapistMessages />;
      default:
        return <TherapistHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <DashboardLayout
      navigation={navigation}
      currentSection={currentSection}
      onSectionChange={(section: string) => setCurrentSection(section as Section)}
      onLogout={onLogout}
      title="Therapist Dashboard"
    >
      {renderSection()}
    </DashboardLayout>
  );
}
