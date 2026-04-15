import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../components/AuthForm', () => ({
  default: () => <div>Auth form</div>,
}));

vi.mock('../components/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../pages/ForgotPassword', () => ({ default: () => <div>Forgot password</div> }));
vi.mock('../pages/ResetPassword', () => ({ default: () => <div>Reset password</div> }));
vi.mock('../pages/VerifyEmail', () => ({ default: () => <div>Verify email</div> }));
vi.mock('../pages/AdminDashboard', () => ({ default: () => <div>Admin dashboard</div> }));
vi.mock('../components/clinician/ClinicianDashboard', () => ({ ClinicianDashboard: () => <div>Clinician dashboard</div> }));
vi.mock('../components/parent/ParentDashboard', () => ({ ParentDashboard: () => <div>Parent dashboard</div> }));
vi.mock('../components/parent/ParentChildCasePage', () => ({ ParentChildCasePage: () => <div>Parent case page</div> }));
vi.mock('../components/parent/ParentCaseEntry', () => ({ ParentCaseEntry: () => <div>Parent case entry</div> }));
vi.mock('../components/lab/LabDashboard', () => ({ LabDashboard: () => <div>Lab dashboard</div> }));
vi.mock('../components/therapist/TherapistDashboard', () => ({ TherapistDashboard: () => <div>Therapist dashboard</div> }));
vi.mock('../components/therapist/TherapistCaseFile', () => ({ TherapistCaseFile: () => <div>Therapist case file</div> }));
vi.mock('../pages/sessions/TherapistSessionsListPage', () => ({ default: () => <div>Therapist sessions</div> }));
vi.mock('../pages/sessions/LogTherapySessionPage', () => ({ default: () => <div>Log therapy session</div> }));
vi.mock('../pages/schedule', () => ({ default: () => <div>Schedule page</div> }));
vi.mock('../pages/progress-analytics/TherapistProgressAnalyticsPage', () => ({ default: () => <div>Progress analytics</div> }));
vi.mock('../components/ScreeningForm', () => ({ default: () => <div>Screening form</div> }));
vi.mock('../components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => {} }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('App routing', () => {
  it('renders auth form on the login route', () => {
    renderAt('/login');
    expect(screen.getByText('Auth form')).toBeInTheDocument();
  });

  it('renders therapist analytics route through lazy load', async () => {
    renderAt('/therapist/progress-analytics');
    expect(await screen.findByText('Progress analytics')).toBeInTheDocument();
  });

  it('renders screening route', async () => {
    renderAt('/screening');
    expect(await screen.findByText('Screening form')).toBeInTheDocument();
  });
});
