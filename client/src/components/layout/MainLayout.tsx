import { motion } from 'framer-motion';
import { Infinity as InfinityIcon, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../ui/utils';

interface MainLayoutProps {
  title?: string;
  brandHref?: string;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  headerActions?: React.ReactNode;
  sidebar: React.ReactNode;
  mobileSidebar: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export function MainLayout({
  title = 'AutismCare',
  brandHref,
  mobileMenuOpen,
  onToggleMobileMenu,
  headerActions,
  sidebar,
  mobileSidebar,
  children,
  contentClassName,
}: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {brandHref ? (
              <Link
                to={brandHref}
                className="flex items-center gap-2.5 rounded-xl px-1 py-1 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={`${title} home`}
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-sm">
                  <InfinityIcon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="text-lg font-semibold tracking-tight text-slate-900">{title}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5 px-1 py-1">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-sm">
                  <InfinityIcon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="text-lg font-semibold tracking-tight text-slate-900">{title}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">{headerActions}</div>
        </div>
        {mobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-slate-200 bg-white px-3 pb-3 pt-2 shadow-sm lg:hidden"
          >
            {mobileSidebar}
          </motion.div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/95 shadow-sm lg:block">
          <div className="h-full overflow-y-auto p-4">{sidebar}</div>
        </aside>
        <main className={cn('min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8', contentClassName)}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mx-auto w-full max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
