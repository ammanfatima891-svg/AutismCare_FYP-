import { useState } from 'react';
import { 
  Home, 
  Baby, 
  ClipboardList, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  Bell,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { DashboardHome } from './DashboardHome';
import { ChildManagement } from './ChildManagement';
import { ScreeningSection } from './ScreeningSection';
import { EducationSection } from './EducationSection';
import { AppointmentsSection } from './AppointmentsSection';
import { CommunicationSection } from './CommunicationSection';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

type Section = 'home' | 'children' | 'screening' | 'education' | 'appointments' | 'messages';

interface User {
  _id: string;
  fullName: string;
  primaryRole: 'parent' | 'doctor' | 'therapist' | 'laboratory' | 'admin';
  roles: Array<'parent' | 'doctor' | 'therapist' | 'laboratory' | 'admin'>;
  email: string;
}

interface ParentDashboardProps {
  user: User;
  onLogout: () => void;
}

const navigation = [
  { id: 'home', label: 'Home', icon: Home, color: 'text-blue-600' },
  { id: 'children', label: 'My Children', icon: Baby, color: 'text-pink-600' },
  { id: 'screening', label: 'Screening', icon: ClipboardList, color: 'text-purple-600' },
  { id: 'education', label: 'Learning', icon: BookOpen, color: 'text-green-600' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, color: 'text-orange-600' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, color: 'text-indigo-600' },
];

export function ParentDashboard({ user, onLogout }: ParentDashboardProps) {
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

  const renderSection = () => {
    switch (currentSection) {
      case 'home':
        return <DashboardHome onNavigate={setCurrentSection} />;
      case 'children':
        return <ChildManagement />;
      case 'screening':
        return <ScreeningSection />;
      case 'education':
        return <EducationSection />;
      case 'appointments':
        return <AppointmentsSection />;
      case 'messages':
        return <CommunicationSection />;
      default:
        return <DashboardHome onNavigate={setCurrentSection} />;
    }
  };

  // Extract user initials for avatar
  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
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
              <h1 className="text-blue-600">AutismCare</h1>
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
                  <AvatarFallback className="bg-blue-600 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm">Welcome back,</p>
                  <p className="text-gray-600">{user.fullName}</p>
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
                    isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
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
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm'
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
            <Button variant="outline" className="w-full justify-start" onClick={() => {}}>
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
