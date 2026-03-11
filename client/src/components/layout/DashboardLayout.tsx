import { useState, useContext, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

interface NavigationChild {
  id: string;
  label: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  children?: NavigationChild[];
}

interface DashboardLayoutProps {
  navigation: NavigationItem[];
  currentSection: string;
  onSectionChange: (section: string) => void;
  onLogout?: () => void;
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({
  navigation,
  currentSection,
  onSectionChange,
  onLogout,
  children,
  title = "AutismCare"
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const parent = navigation.find((item) =>
      item.children?.some((c) => c.id === currentSection)
    );
    if (parent) setExpandedDropdown(parent.id);
  }, [currentSection, navigation]);

  // Extract user initials for avatar
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AC</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-gray-600" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>

              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">Welcome back,</p>
                  <p className="text-gray-600">{user?.firstName} {user?.lastName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 pb-3 bg-white shadow-lg">
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isParentActive = hasChildren && item.children!.some((c) => currentSection === c.id);
              const isExpanded = expandedDropdown === item.id;
              if (hasChildren) {
                return (
                  <div key={item.id} className="border-b border-gray-100 last:border-b-0">
                    <button
                      onClick={() => setExpandedDropdown(isExpanded ? null : item.id)}
                      className={`w-full flex items-center justify-between gap-3 px-6 py-3 transition-colors ${
                        isParentActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isParentActive ? item.color : 'text-gray-600'}`} />
                        <span className={`font-medium ${isParentActive ? item.color : 'text-gray-700'}`}>{item.label}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {isExpanded && item.children!.map((child) => {
                      const isChildActive = currentSection === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => {
                            onSectionChange(child.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 pl-14 pr-6 py-2.5 text-sm transition-colors ${
                            isChildActive ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-600 font-medium' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                );
              }
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                    isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-gray-600'}`} />
                  <span className={`font-medium ${isActive ? item.color : 'text-gray-700'}`}>{item.label}</span>
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
              const hasChildren = item.children && item.children.length > 0;
              const isParentActive = hasChildren && item.children!.some((c) => currentSection === c.id);
              const isExpanded = expandedDropdown === item.id;
              if (hasChildren) {
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => setExpandedDropdown(isExpanded ? null : item.id)}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg transition-colors ${
                        isParentActive
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-5 h-5 shrink-0 ${isParentActive ? item.color : 'text-gray-600'}`} />
                        <span className={`truncate ${isParentActive ? item.color : 'text-gray-700'}`}>{item.label}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-1">
                        {item.children!.map((child) => {
                          const isChildActive = currentSection === child.id;
                          return (
                            <button
                              key={child.id}
                              onClick={() => onSectionChange(child.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                                isChildActive
                                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {child.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-gray-600'}`} />
                  <span className={isActive ? item.color : 'text-gray-700'}>{item.label}</span>
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
              onClick={onLogout || (() => {})}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Section */}
        <main className="flex-1 p-6 lg:p-8 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
