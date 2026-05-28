import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { logoutSession, refreshSession } from '@/lib/phase1Api';
import {
  AuthSession,
  AuthUser,
  PreferredSport,
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '@/lib/auth';

type RegisterRole = 'player' | 'organizer';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  username: string;
  displayName: string;
  city: string;
  barangay: string;
  preferredSport: PreferredSport;
  role: RegisterRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readJson = async (response: Response) => {
  try {
    return (await response.json()) as { message?: string; user?: AuthUser; accessToken?: string };
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistSession = useCallback((nextSession: AuthSession) => {
    writeStoredSession(nextSession);
    setSession(nextSession);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const authenticate = useCallback(
    async (path: string, body: Record<string, string>) => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await readJson(response);

      if (!response.ok || !payload?.user || !payload?.accessToken) {
        throw new Error(payload?.message || 'Authentication failed. Check the auth server and your credentials.');
      }

      const nextSession: AuthSession = {
        user: payload.user,
        accessToken: payload.accessToken,
      };

      persistSession(nextSession);
      return nextSession;
    },
    [persistSession]
  );

  const login = useCallback(
    async ({ email, password }: LoginPayload) => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password.trim()) {
        throw new Error('Email and password are required.');
      }

      return authenticate('/auth/login', {
        email: normalizedEmail,
        password,
      });
    },
    [authenticate]
  );

  const register = useCallback(
    async ({ email, password, username, displayName, city, barangay, preferredSport, role }: RegisterPayload) => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password.trim()) {
        throw new Error('Email and password are required.');
      }

      return authenticate('/auth/register', {
        email: normalizedEmail,
        password,
        username: username.trim(),
        displayName: displayName.trim(),
        city: city.trim(),
        barangay: barangay.trim(),
        preferredSport,
        role,
      });
    },
    [authenticate]
  );

  const logout = useCallback(async () => {
    try {
      await logoutSession(session?.accessToken || null);
    } catch {
    } finally {
      clearSession();
    }
  }, [clearSession, session?.accessToken]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      try {
        const payload = await refreshSession();

        if (isMounted) {
          persistSession({
            user: payload.user,
            accessToken: payload.accessToken,
          });
        }
      } catch {
        if (isMounted) {
          clearSession();
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [clearSession, persistSession]);

  const value = useMemo(
    () => ({
      user: session?.user || null,
      accessToken: session?.accessToken || null,
      isAuthenticated: Boolean(session?.accessToken && session?.user),
      isBootstrapping,
      login,
      register,
      logout,
    }),
    [isBootstrapping, login, logout, register, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
};
