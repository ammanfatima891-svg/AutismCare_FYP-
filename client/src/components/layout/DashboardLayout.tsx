import { useState, useContext, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';

interface NavigationChild {
  id: string;
  label: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  children?: NavigationChild[];
  group?: string;
  /** If set, sidebar uses React Router navigation instead of onSectionChange */
  to?: string;
  /** Active when pathname.startsWith(this) — use for nested routes e.g. /parent/case/:id */
  activePathPrefix?: string;
}

export type DashboardLayoutVariant = 'default' | 'clinical';

interface DashboardLayoutProps {
  navigation: NavigationItem[];
  currentSection: string;
  onSectionChange: (section: string) => void;
  onLogout?: () => void;
  children: React.ReactNode;
  title?: string;
  onOpenNotifications?: () => void;
  /**
   * Optional top-bar cluster (e.g. Messages + NotificationBell). When set, replaces the default bell-only slot.
   */
  communicationCluster?: React.ReactNode;
  /** Clinical: white/slate shell + sky accents (no purple gradients). */
  variant?: DashboardLayoutVariant;
}

export function DashboardLayout({
  navigation,
  currentSection,
  onSectionChange,
  onLogout,
  children,
  title = "AutismCare",
  onOpenNotifications,
  communicationCluster,
  variant = 'default',
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const linkItemActive = (item: NavigationItem) => {
    if (!item.to) return false;
    if (item.activePathPrefix) return location.pathname.startsWith(item.activePathPrefix);
    return location.pathname === item.to;
  };

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

  const shellClass =
    variant === 'clinical'
      ? 'flex min-h-screen flex-col bg-slate-50'
      : 'flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50';
  const activeNavClass =
    variant === 'clinical'
      ? 'bg-sky-50 border-l-4 border-sky-600 text-sky-900'
      : 'bg-blue-50 border-l-4 border-blue-600';
  const sidebarActiveClass =
    variant === 'clinical'
      ? 'bg-sky-50 shadow-sm border border-sky-100'
      : 'bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm';
  const sidebarChildActiveClass =
    variant === 'clinical'
      ? 'border border-sky-200 bg-sky-50 font-medium text-sky-800'
      : 'bg-gradient-to-r from-blue-50 to-purple-50 font-medium text-blue-700';

  return (
    <div className={shellClass}>
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full shrink-0 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-2">
                <div
                className={
                  variant === 'clinical'
                    ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600'
                    : 'flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600'
                }
              >
                  <span className="text-sm font-bold text-white">AC</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              {communicationCluster ?? (
                <NotificationBell
                  onViewAll={onOpenNotifications}
                  variant={variant === 'clinical' ? 'clinical' : 'default'}
                />
              )}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={[
                  'relative shrink-0 rounded-full p-2 transition-colors',
                  variant === 'clinical' ? 'text-slate-600 hover:bg-slate-100' : 'hover:bg-gray-100',
                ].join(' ')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <div className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />

              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src="" />
                  <AvatarFallback
                    className={
                      variant === 'clinical'
                        ? 'bg-sky-600 font-medium text-white'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 font-medium text-white'
                    }
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-sm font-medium text-slate-900">Welcome back,</p>
                  <p className="truncate text-slate-600">
                    {user?.firstName} {user?.lastName}
                  </p>
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
                        isParentActive ? activeNavClass : 'hover:bg-gray-50'
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
                            isChildActive
                              ? `${activeNavClass} font-medium ${variant === 'clinical' ? 'text-sky-800' : 'text-blue-600'}`
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                );
              }
              const isActive = item.to ? linkItemActive(item) : currentSection === item.id;
              if (item.to) {
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex w-full items-center gap-3 px-6 py-3 transition-colors ${
                      isActive ? activeNavClass : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-gray-600'}`} />
                    <span className={`font-medium ${isActive ? item.color : 'text-gray-700'}`}>{item.label}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                    isActive ? activeNavClass : 'hover:bg-gray-50'
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

      {/* Sidebar + main: flex-1 keeps row below header; min-h-0 allows inner scroll without layout blowout */}
      <div className="flex min-h-0 flex-1 overflow-x-hidden">
        {/* Sidebar - Desktop */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-64 shrink-0 overflow-hidden border-r border-slate-200 bg-white lg:block">
          <div className="h-full flex flex-col justify-between">
            <nav className="flex-1 space-y-2 overflow-y-auto p-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const hasChildren = item.children && item.children.length > 0;
                const isParentActive = hasChildren && item.children!.some((c) => currentSection === c.id);
                const isExpanded = expandedDropdown === item.id;
                if (hasChildren) {
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setExpandedDropdown(isExpanded ? null : item.id)}
                        className={`w-full flex items-center justify-between gap-2 rounded-lg px-4 py-3 transition-colors ${
                          isParentActive ? sidebarActiveClass : 'hover:bg-gray-50'
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
                                type="button"
                                key={child.id}
                                onClick={() => onSectionChange(child.id)}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                  isChildActive
                                    ? sidebarChildActiveClass
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
                const isActive = item.to ? linkItemActive(item) : currentSection === item.id;
                if (item.to) {
                  return (
                      <Link
                      key={item.id}
                      to={item.to}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                        isActive ? sidebarActiveClass : 'hover:bg-gray-50'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isActive ? (variant === 'clinical' ? 'text-sky-700' : item.color) : 'text-gray-600'}`}
                      />
                      <span
                        className={
                          isActive
                            ? variant === 'clinical'
                              ? 'font-medium text-sky-900'
                              : item.color
                            : 'text-gray-700'
                        }
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSectionChange(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                      isActive ? sidebarActiveClass : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isActive ? (variant === 'clinical' ? 'text-sky-700' : item.color) : 'text-gray-600'}`}
                    />
                    <span
                      className={
                        isActive
                          ? variant === 'clinical'
                            ? 'font-medium text-sky-900'
                            : item.color
                          : 'text-gray-700'
                      }
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 space-y-2 border-t border-slate-200 bg-white shrink-0">
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
          </div>
        </aside>

        {/* Main: scroll container so page content never paints under the sticky header */}
        <main
          className={`relative z-0 min-h-0 min-w-0 flex-1 overflow-y-auto scroll-pt-20 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10 ${
            variant === 'clinical' ? 'bg-slate-50' : 'bg-white/50 backdrop-blur-sm'
          }`}
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
