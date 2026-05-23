export type Sport = 'basketball' | 'volleyball';
export type GameStatus = 'OPEN' | 'FULL';
export type UserRole = 'player' | 'organizer';

export interface Game {
  id: string;
  title: string;
  courtName: string;
  sport: Sport;
  date: string;
  time: string;
  location: string;
  barangay: string;
  city: string;
  slotsTotal: number;
  slotsFilled: number;
  entryFee: number | null;
  status: GameStatus;
  organizerName: string;
  organizerAvatar?: string;
  description?: string;
  imageUrl?: string;
}

export interface Notification {
  id: string;
  type: 'join_request' | 'accepted' | 'rejected' | 'reminder';
  message: string;
  gameId: string;
  gameTitle: string;
  read: boolean;
  time: string;
}
