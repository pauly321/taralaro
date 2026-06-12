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

interface VerifyOtpPayload {
  challengeId: string;
  otp: string;
}

export interface OtpChallengeResponse {
  requiresOtp: true;
  challengeId: string;
  maskedEmail: string;
  expiresAt: string;
  devOtpPreview?: string;
}

interface AuthApiResponse {
  message?: string;
  user?: AuthUser;
  accessToken?: string;
  requiresOtp?: boolean;
  challengeId?: string;
  maskedEmail?: string;
  expiresAt?: string;
  devOtpPreview?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<OtpChallengeResponse>;
  verifyLoginOtp: (payload: VerifyOtpPayload) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<OtpChallengeResponse>;
  verifyRegisterOtp: (payload: VerifyOtpPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readJson = async (response: Response) => {
  try {
    return (await response.json()) as AuthApiResponse;
  } catch {
    return null;
  }
};

const isOtpChallengeResponse = (payload: AuthApiResponse | null): payload is OtpChallengeResponse =>
  Boolean(payload?.requiresOtp && payload.challengeId && payload.maskedEmail && payload.expiresAt);

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

  const postAuth = useCallback(async (path: string, body: Record<string, string>) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = await readJson(response);

    if (!response.ok) {
      throw new Error(payload?.message || 'Authentication failed.');
    }

    return payload;
  }, []);

  const finalizeSession = useCallback(
    (payload: AuthApiResponse | null) => {
      if (!payload?.user || !payload?.accessToken) {
        throw new Error('Authentication failed. Check the auth server and your credentials.');
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

      const payload = await postAuth('/auth/login', {
        email: normalizedEmail,
        password,
      });

      if (!isOtpChallengeResponse(payload)) {
        throw new Error('Unable to create a login verification request.');
      }

      return payload;
    },
    [postAuth]
  );

  const verifyLoginOtp = useCallback(
    async ({ challengeId, otp }: VerifyOtpPayload) => {
      const payload = await postAuth('/auth/login/verify-otp', {
        challengeId: challengeId.trim(),
        otp: otp.trim(),
      });

      return finalizeSession(payload);
    },
    [finalizeSession, postAuth]
  );

  const register = useCallback(
    async ({ email, password, username, displayName, city, barangay, preferredSport, role }: RegisterPayload) => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password.trim()) {
        throw new Error('Email and password are required.');
      }

      const payload = await postAuth('/auth/register', {
        email: normalizedEmail,
        password,
        username: username.trim(),
        displayName: displayName.trim(),
        city: city.trim(),
        barangay: barangay.trim(),
        preferredSport,
        role,
      });

      if (!isOtpChallengeResponse(payload)) {
        throw new Error('Unable to create a registration verification request.');
      }

      return payload;
    },
    [postAuth]
  );

  const verifyRegisterOtp = useCallback(
    async ({ challengeId, otp }: VerifyOtpPayload) => {
      const payload = await postAuth('/auth/register/verify-otp', {
        challengeId: challengeId.trim(),
        otp: otp.trim(),
      });

      return finalizeSession(payload);
    },
    [finalizeSession, postAuth]
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
      verifyLoginOtp,
      register,
      verifyRegisterOtp,
      logout,
    }),
    [isBootstrapping, login, logout, register, session, verifyLoginOtp, verifyRegisterOtp]
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
