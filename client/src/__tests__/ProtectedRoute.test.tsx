import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthContext } from '../context/AuthContext';

function ProtectedContent() {
  return <div>Protected content</div>;
}

function renderGuard(user: { role: string } | null) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <AuthContext.Provider value={{ user, login: vi.fn(), logout: vi.fn(), authReady: true }}>
        <ProtectedRoute roles={['parent']}>
          <ProtectedContent />
        </ProtectedRoute>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects anonymous users to login', () => {
    renderGuard(null);
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects users with disallowed roles to login', () => {
    renderGuard({ role: 'therapist' });
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children for allowed roles', () => {
    renderGuard({ role: 'parent' });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
