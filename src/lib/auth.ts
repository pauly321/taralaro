export type UserRole = 'player' | 'organizer' | 'admin';
export type PreferredSport = 'basketball' | 'volleyball';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  city: string;
  barangay: string;
  preferredSport: PreferredSport;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string | null;
}

const SESSION_KEY = 'tara-laro-session';

export const readStoredSession = (): AuthSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedValue = window.sessionStorage.getItem(SESSION_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const writeStoredSession = (session: AuthSession) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      user: session.user,
      accessToken: null,
    })
  );
};

export const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(SESSION_KEY);
};
