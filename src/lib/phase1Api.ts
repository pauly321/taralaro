import { format, parse, parseISO } from 'date-fns';
import { API_BASE_URL } from '@/lib/api';
import { PolicyDocument, Game, GameJoinRequest, JoinRequestReviewDecision, Notification, ReportCategory } from '@/types/game';
import { CreateGamePayload } from '@/lib/validation/game';

type ApiHeaders = Record<string, string>;

type ApiGame = {
  id: string;
  title: string;
  courtName: string;
  sport: Game['sport'];
  date: string;
  time: string;
  location: string;
  barangay: string;
  city: string;
  slotsTotal: number;
  slotsFilled: number;
  entryFee: number | null;
  status: Game['status'];
  organizerUserId?: string;
  organizerName: string;
  description?: string;
  imageUrl?: string;
  joinedStatus?: Game['joinedStatus'];
};

const authHeaders = (token?: string | null): ApiHeaders => {
  const headers: ApiHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const coerceTime = (value: string) => {
  try {
    return format(parse(value, 'HH:mm:ss', new Date()), 'h:mm a');
  } catch {
    try {
      return format(parse(value, 'HH:mm', new Date()), 'h:mm a');
    } catch {
      return value;
    }
  }
};

const coerceDate = (value: string) => {
  try {
    return format(parseISO(value), 'EEE, MMM d');
  } catch {
    return value;
  }
};

const mapGame = (game: ApiGame): Game => ({
  ...game,
  date: coerceDate(game.date),
  time: coerceTime(game.time),
});

const requestJson = async <T>(path: string, init?: RequestInit, token?: string | null): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...authHeaders(token),
    },
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } & T;

  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed.');
  }

  return payload;
};

export const fetchGames = async (token: string) => {
  const payload = await requestJson<{ games: ApiGame[] }>('/games', undefined, token);
  return payload.games.map(mapGame);
};

export const fetchMyGames = async (token: string) => {
  const payload = await requestJson<{ games: ApiGame[] }>('/games/mine', undefined, token);
  return payload.games.map(mapGame);
};

export const createGame = async (token: string, body: CreateGamePayload) => {
  const payload = await requestJson<{ game: ApiGame }>(
    '/games',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    token
  );

  return mapGame(payload.game);
};

export const joinGame = async (token: string, gameId: string) => {
  return requestJson<{ message: string }>(
    `/games/${gameId}/join`,
    {
      method: 'POST',
    },
    token
  );
};

export const fetchGameJoinRequests = async (token: string, gameId: string) => {
  const payload = await requestJson<{ requests: GameJoinRequest[] }>(`/games/${gameId}/requests`, undefined, token);
  return payload.requests;
};

export const reviewGameJoinRequest = async (
  token: string,
  gameId: string,
  requestId: string,
  decision: JoinRequestReviewDecision
) => {
  const payload = await requestJson<{ message: string; request: { id: string; status: JoinRequestReviewDecision; userId: string; displayName: string }; game: ApiGame }>(
    `/games/${gameId}/requests/${requestId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    },
    token
  );

  return {
    ...payload,
    game: mapGame(payload.game),
  };
};

export const fetchNotifications = async (token: string) => {
  const payload = await requestJson<{ notifications: Notification[] }>('/notifications', undefined, token);
  return payload.notifications;
};

export const fetchPolicies = async () => {
  const payload = await requestJson<{ policies: PolicyDocument[] }>('/policies');
  return payload.policies;
};

export const acceptPolicy = async (token: string, policyId: string) => {
  return requestJson<{ accepted: true }>(
    `/policies/${policyId}/accept`,
    {
      method: 'POST',
    },
    token
  );
};

export const submitReport = async (
  token: string,
  body: { targetType: 'game'; targetId: string; category: ReportCategory; description: string }
) => {
  return requestJson<{ message: string }>(
    '/reports',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    token
  );
};

export const refreshSession = async () => {
  return requestJson<{ user: { id: string; email: string; username: string; displayName: string; role: 'player' | 'organizer' | 'admin'; city: string; barangay: string; preferredSport: 'basketball' | 'volleyball' }; accessToken: string }>(
    '/auth/refresh',
    {
      method: 'POST',
    }
  );
};

export const logoutSession = async (token?: string | null) => {
  return requestJson<{ success: true }>(
    '/auth/logout',
    {
      method: 'POST',
    },
    token
  );
};
