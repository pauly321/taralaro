import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

const useAuthMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Home screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });

  it('renders protected content for authenticated users', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Home screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home screen')).toBeInTheDocument();
  });
});
