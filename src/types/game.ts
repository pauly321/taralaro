export type Sport = 'basketball' | 'volleyball';
export type GameStatus = 'OPEN' | 'FULL' | 'DRAFT' | 'CANCELLED' | 'COMPLETED';
export type UserRole = 'player' | 'organizer' | 'admin';
export type JoinStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'left_game';
export type NotificationType = 'join_request' | 'accepted' | 'rejected' | 'reminder' | 'system' | 'security';
export type JoinRequestReviewDecision = 'approved' | 'rejected';
export type PolicyType = 'privacy' | 'terms' | 'community_rules';
export type ReportCategory = 'spam' | 'fraud' | 'harassment' | 'unsafe_behavior' | 'impersonation' | 'other';

export interface Game {
  id: string;
  title: string;
  courtName: string;
  sport: Sport;
  date: string;
  time: string;
  endTime: string;
  location: string;
  barangay: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  slotsTotal: number;
  slotsFilled: number;
  entryFee: number | null;
  status: GameStatus;
  organizerUserId?: string;
  organizerName: string;
  organizerAvatar?: string;
  description?: string;
  imageUrl?: string;
  joinedStatus?: JoinStatus | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  gameId: string;
  gameTitle: string;
  read: boolean;
  time: string;
}

export interface GameJoinRequest {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  city: string;
  barangay: string;
  preferredSport: Sport;
  status: JoinStatus;
  requestedAt: string;
}

export interface PolicyDocument {
  id: string;
  policyType: PolicyType;
  versionLabel: string;
  title: string;
  content: string;
  isActive: boolean;
  publishedAt: string;
}
