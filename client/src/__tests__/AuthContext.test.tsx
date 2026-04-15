import React, { useContext } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthProvider } from '../context/AuthContext';

const { postMock, navigateMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('../api', () => ({
  default: {
    post: postMock,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function Consumer() {
  const { user, login, logout } = useContext(AuthContext);
  return (
    <div>
      <div>Role: {user?.role || 'none'}</div>
      <button type="button" onClick={() => login('test@example.com', 'Password123!', false)}>
        Login
      </button>
      <button type="button" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    postMock.mockReset();
    navigateMock.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('hydrates user from session storage', async () => {
    sessionStorage.setItem('token', 'token-123');
    sessionStorage.setItem('role', 'parent');
    sessionStorage.setItem('firstName', 'A');
    sessionStorage.setItem('lastName', 'B');
    sessionStorage.setItem('email', 'a@example.com');

    render(
      <MemoryRouter>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Role: parent')).toBeInTheDocument();
    });
  });

  it('stores login data and navigates by role', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      data: {
        token: 'jwt-token',
        role: 'therapist',
        firstName: 'Thera',
        lastName: 'Pist',
        email: 'therapist@example.com',
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(sessionStorage.getItem('token')).toBe('jwt-token');
      expect(sessionStorage.getItem('role')).toBe('therapist');
      expect(navigateMock).toHaveBeenCalledWith('/therapist-dashboard');
    });
  });

  it('clears storage and redirects on logout', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('token', 'token-123');
    sessionStorage.setItem('role', 'parent');

    render(
      <MemoryRouter>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });
});
