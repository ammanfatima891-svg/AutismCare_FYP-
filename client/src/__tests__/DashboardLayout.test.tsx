import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthContext } from '../context/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';

vi.mock('../components/notifications/NotificationBell', () => ({
  NotificationBell: ({ onViewAll }: { onViewAll?: () => void }) => (
    <button type="button" onClick={onViewAll}>Notifications</button>
  ),
}));

describe('DashboardLayout', () => {
  it('renders title, navigation, and logout callback context', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <MemoryRouter>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthContext.Provider
          value={{
            user: {
              firstName: 'Rabia',
              lastName: 'Babar',
              role: 'therapist',
            },
            login: vi.fn(),
            logout: onLogout,
          }}
        >
          <DashboardLayout
            title="Therapist Dashboard"
            navigation={[
              { id: 'home', label: 'Dashboard', icon: () => null, color: 'text-primary' },
              { id: 'sessions', label: 'Sessions', icon: () => null, color: 'text-primary' },
            ]}
            currentSection="home"
            onSectionChange={vi.fn()}
            onLogout={onLogout}
          >
            <div>Dashboard content</div>
          </DashboardLayout>
        </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Therapist Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByText('Rabia Babar')).toBeInTheDocument();

    const notificationButton = screen.getByRole('button', { name: 'Notifications' });
    await user.click(notificationButton);
    expect(notificationButton).toBeInTheDocument();
  });
});
