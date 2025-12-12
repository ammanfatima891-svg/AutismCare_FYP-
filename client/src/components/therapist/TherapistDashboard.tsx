import { useState } from 'react';
import { 
  Home, 
  Users, 
  ClipboardList, 
  Calendar, 
  MessageSquare, 
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  FileText
} from 'lucide-react';
import { Button } from '../ui/button';
import { TherapistHome } from './TherapistHome';
import { TherapistClients } from './TherapistClients';
import { TherapyPlans } from './TherapyPlans';
import { TherapistSessions } from './TherapistSessions';
import { TherapistMessages } from './TherapistMessages';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

  const renderSection = () => {
    switch (currentSection) {
      case 'home':
        return <TherapistHome onNavigate={setCurrentSection} />;
      case 'clients':
        return <TherapistClients />;
      case 'plans':
        return <TherapyPlans />;
      case 'sessions':
        return <TherapistSessions />;
      case 'messages':
        return <TherapistMessages />;
      default:
        return <TherapistHome onNavigate={setCurrentSection} />;
    }
  };

  // Extract user initials for avatar
  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h1 className="text-green-600 font-bold">AutismCare</h1>
                <p className="text-xs text-gray-500">Therapist Portal</p>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-full hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-600" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500">
                    {notificationCount}
                  </Badge>
                )}
              </button>
              
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-green-600 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-gray-600">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 pb-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentSection(item.id as Section);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-6 py-3 ${
                    isActive ? 'bg-green-50 border-l-4 border-green-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-gray-600'}`} />
                  <span className={isActive ? item.color : 'text-gray-700'}>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentSection(item.id as Section)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-green-50 to-blue-50 shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-gray-600'}`} />
                  <span className={isActive ? item.color : 'text-gray-700'}>{item.label}</span>
                  {item.id === 'messages' && notificationCount > 0 && (
                    <Badge className="ml-auto bg-red-500">{notificationCount}</Badge>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="absolute bottom-4 left-4 right-4 space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Section */}
        <main className="flex-1 p-6 lg:p-8">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
