import { useState, useContext, useEffect } from 'react';
import { Button } from '../ui/button';
import { ThemeToggleButton } from '../ui/ThemeToggleButton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Settings, LogOut, Menu, X, ChevronDown, ChevronRight, Infinity as InfinityIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { cn } from '../ui/utils';

interface NavigationChild {
  id: string;
  label: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
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
  onOpenSettings?: () => void;
  children: React.ReactNode;
  title?: string;
  onOpenNotifications?: () => void;
  /**
   * Optional top-bar cluster (e.g. Messages + NotificationBell). When set, replaces the default bell-only slot.
   */
  communicationCluster?: React.ReactNode;
  /** Clinical: white/slate shell + sky accents (no purple gradients). */
  variant?: DashboardLayoutVariant;
  /** When set, logo + title navigate here (e.g. `/parent-dashboard`). */
  brandHref?: string;
  /** Appended to `<main>` — use to override surface styles (e.g. transparent + custom background). */
  mainClassName?: string;
}

export function DashboardLayout({
  navigation,
  currentSection,
  onSectionChange,
  onLogout,
  onOpenSettings,
  children,
  title = "AutismCare",
  onOpenNotifications,
  communicationCluster,
  variant = 'default',
  brandHref,
  mainClassName,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const location = useLocation();

  // TEMP DEBUG HELPERS: if a stale overlay ever disables clicks, recover immediately.
  useEffect(() => {
    console.log('DashboardLayout mounted');
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
    }
  }, []);

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

  /** Viewport-height shell + overflow hidden so only `<main>` scrolls; sidebar stays in view. */
  const shellClass =
    variant === 'clinical'
      ? 'flex min-h-screen h-[100dvh] min-h-0 flex-col overflow-hidden bg-background'
      : 'flex min-h-screen h-[100dvh] min-h-0 flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-amber-50 dark:bg-background';
  const activeNavClass =
    'border-l-4 border-[var(--accent)] bg-gradient-to-r from-[color-mix(in_srgb,var(--accent)_14%,transparent)] to-transparent font-medium text-primary dark:text-primary-foreground';
  const sidebarActiveClass =
    'rounded-xl border bg-primary/10 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--accent)_38%,transparent)] dark:bg-primary/20';
  const sidebarChildActiveClass =
    'rounded-lg border bg-muted font-medium text-foreground ring-1 ring-[color-mix(in_srgb,var(--accent)_30%,transparent)] dark:bg-primary/15 dark:text-foreground';

  return (
    <div className={shellClass}>
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full shrink-0 border-b bg-card text-foreground shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              {brandHref ? (
                <Link
                  to={brandHref}
                  className="flex items-center gap-2.5 rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${title} home`}
                >
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    aria-hidden
                  >
                    <InfinityIcon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
                </Link>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    aria-hidden
                  >
                    <InfinityIcon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
                </div>
              )}
            </div>

            {/* Right Side */}
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              {communicationCluster ?? (
                <NotificationBell
                  onViewAll={onOpenNotifications}
                  variant={variant === 'clinical' ? 'clinical' : 'default'}
                />
              )}
              <ThemeToggleButton variant={variant === 'clinical' ? 'minimal' : 'default'} />

              <div className="hidden h-8 w-px shrink-0 bg-border sm:block" aria-hidden />

              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary font-medium text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-sm font-medium text-foreground">Welcome back,</p>
                  <p className="truncate text-muted-foreground">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t bg-card pb-3 shadow-lg lg:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isParentActive = hasChildren && item.children!.some((c) => currentSection === c.id);
              const isExpanded = expandedDropdown === item.id;
              if (hasChildren) {
                return (
                  <div key={item.id} className="border-b last:border-b-0">
                    <button
                      onClick={() => setExpandedDropdown(isExpanded ? null : item.id)}
                      className={`flex w-full items-center justify-between gap-3 px-6 py-3 transition-colors ${
                        isParentActive ? activeNavClass : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isParentActive ? item.color : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${isParentActive ? item.color : 'text-foreground'}`}>{item.label}</span>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
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
                          className={`flex w-full items-center gap-3 py-2.5 pl-14 pr-6 text-sm transition-colors ${
                            isChildActive
                              ? `${activeNavClass} font-medium text-primary dark:text-primary-foreground`
                              : 'text-foreground hover:bg-muted'
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
                      isActive ? activeNavClass : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-muted-foreground'}`} />
                    <span className={`font-medium ${isActive ? item.color : 'text-foreground'}`}>{item.label}</span>
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
                  className={`flex w-full items-center gap-3 px-6 py-3 transition-colors ${
                    isActive ? activeNavClass : 'hover:bg-muted'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-muted-foreground'}`} />
                  <span className={`font-medium ${isActive ? item.color : 'text-foreground'}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Sidebar + main: flex-1 keeps row below header; min-h-0 allows inner scroll without layout blowout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar - Desktop (fills row below header; does not scroll away with main) */}
        <aside className="relative hidden min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r bg-card lg:flex">
          <div className="flex h-full min-h-0 flex-col justify-between">
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
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 transition-colors ${
                          isParentActive ? sidebarActiveClass : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Icon className={`h-5 w-5 shrink-0 ${isParentActive ? item.color : 'text-muted-foreground'}`} />
                          <span className={`truncate ${isParentActive ? item.color : 'text-foreground'}`}>{item.label}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="ml-4 space-y-1 border-l-2 pl-4">
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
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                        isActive ? sidebarActiveClass : 'hover:bg-muted'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${isActive ? item.color ?? 'text-primary' : 'text-muted-foreground'}`}
                      />
                      <span
                        className={
                          isActive ? item.color ?? 'font-medium text-primary dark:text-primary-foreground' : 'text-foreground'
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
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                      isActive ? sidebarActiveClass : 'hover:bg-muted'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isActive ? item.color ?? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <span
                      className={
                        isActive ? item.color ?? 'font-medium text-primary dark:text-primary-foreground' : 'text-foreground'
                      }
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="shrink-0 space-y-2 border-t bg-card p-4">
              {onOpenSettings && (
                <Button variant="outline" className="w-full justify-start" onClick={onOpenSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-muted"
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
          className={cn(
            'relative z-0 min-h-0 min-w-0 flex-1 overflow-y-auto scroll-pt-20 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10',
            variant === 'clinical' ? 'bg-background' : 'bg-card backdrop-blur-sm',
            mainClassName,
          )}
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

