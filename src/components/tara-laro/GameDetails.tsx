import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Heart,
  MapPin,
  Share2,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { joinGame } from '@/lib/phase1Api';
import { useAuth } from '@/hooks/useAuth';
import { Game } from '@/types/game';
import { ReportIssueModal } from './ReportIssueModal';

interface GameDetailsProps {
  game: Game;
  onBack: () => void;
  onJoinSuccess?: () => void;
}

export const GameDetails: React.FC<GameDetailsProps> = ({ game, onBack, onJoinSuccess }) => {
  const { accessToken, user } = useAuth();
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [joined, setJoined] = useState(game.joinedStatus === 'pending' || game.joinedStatus === 'approved');
  const [liked, setLiked] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const isBasketball = game.sport === 'basketball';
  const fillPercent = (game.slotsFilled / Math.max(game.slotsTotal, 1)) * 100;
  const accentColor = isBasketball ? '#F4722B' : '#00B4A6';
  const isOrganizerOwner = user?.id && game.organizerUserId ? user.id === game.organizerUserId : false;
  const isGameUnavailable = ['FULL', 'CANCELLED', 'COMPLETED'].includes(game.status);

  const joinLabel = useMemo(() => {
    if (game.joinedStatus === 'approved') {
      return 'You are in this game';
    }

    if (game.joinedStatus === 'pending') {
      return 'Join request pending';
    }

    return 'Join Game';
  }, [game.joinedStatus]);

  const handleJoin = async () => {
    if (!accessToken) {
      setRequestError('Your session expired. Please sign in again.');
      return;
    }

    setRequestError('');
    setIsJoining(true);

    try {
      await joinGame(accessToken, game.id);
      setShowConfirmSheet(false);
      setJoined(true);
      onJoinSuccess?.();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to send your join request.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col max-w-md mx-auto" style={{ backgroundColor: '#0D1B2A' }}>
      <div className="relative h-56 flex-shrink-0">
        <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,27,42,0.5) 0%, rgba(13,27,42,0.95) 100%)' }} />

        <button className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ backgroundColor: 'rgba(13,27,42,0.7)', backdropFilter: 'blur(8px)' }} onClick={onBack}>
          <ArrowLeft size={20} color="#F5EFE0" />
        </button>

        <div className="absolute top-4 right-4 flex gap-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ backgroundColor: 'rgba(13,27,42,0.7)', backdropFilter: 'blur(8px)' }}>
            <Share2 size={18} color="#F5EFE0" />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ backgroundColor: 'rgba(13,27,42,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setLiked(!liked)}>
            <Heart size={18} color={liked ? '#EF4444' : '#F5EFE0'} fill={liked ? '#EF4444' : 'none'} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{isBasketball ? '🏀' : '🏐'}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ backgroundColor: `${accentColor}25`, color: accentColor, border: `1px solid ${accentColor}40`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {isBasketball ? 'Basketball' : 'Volleyball'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            {game.title}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-36">
        <div className="p-5 space-y-5">
          <div className="rounded-2xl border p-4" style={{ backgroundColor: 'rgba(0, 180, 166, 0.08)', borderColor: 'rgba(0, 180, 166, 0.22)' }}>
            <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Protected detail view: join requests, reports, and organizer actions are now tracked through the backend.
            </p>
          </div>

          <p className="text-sm" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            📍 {game.courtName}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.06)', border: '1px solid rgba(245, 239, 224, 0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} color={accentColor} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Date & Time</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{game.date}</p>
              <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{game.time}</p>
            </div>

            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.06)', border: '1px solid rgba(245, 239, 224, 0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={14} color={accentColor} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Location</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{game.barangay}</p>
              <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{game.city}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.06)', border: '1px solid rgba(245, 239, 224, 0.08)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={16} color={accentColor} />
                <span className="text-sm font-bold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Player Slots</span>
              </div>
              <span className="text-lg font-black" style={{ color: accentColor, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {game.slotsFilled}/{game.slotsTotal}
              </span>
            </div>
            <div className="slot-bar mb-2"><div className="slot-bar-fill" style={{ width: `${fillPercent}%`, backgroundColor: accentColor }} /></div>
            <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{Math.max(game.slotsTotal - game.slotsFilled, 0)} slots remaining</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 p-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(244, 114, 43, 0.1)', border: '1px solid rgba(244, 114, 43, 0.2)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Entry Fee</p>
              <p className="text-xl font-black" style={{ color: '#F4722B', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{game.entryFee === null ? 'FREE' : `PHP ${game.entryFee}`}</p>
            </div>
            <div className="flex-1 p-3 rounded-xl text-center" style={{ backgroundColor: game.status === 'OPEN' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${game.status === 'OPEN' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Status</p>
              <p className="text-xl font-black" style={{ color: game.status === 'OPEN' ? '#22C55E' : '#EF4444', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{game.status}</p>
            </div>
          </div>

          {game.description ? (
            <div>
              <h3 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                About this game
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(245, 239, 224, 0.75)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {game.description}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.06)', border: '1px solid rgba(245, 239, 224, 0.08)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ backgroundColor: `${accentColor}30`, color: accentColor }}>
              {game.organizerName[0]}
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Organized by</p>
              <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{game.organizerName}</p>
            </div>
            <div className="ml-auto">
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(244, 114, 43, 0.15)', color: '#F4722B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Verified Host
              </span>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.18)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={() => setShowReportModal(true)}>
            <ShieldAlert size={16} />
            Report this game
          </button>

          {requestError ? (
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.24)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div className="flex items-center gap-2"><AlertTriangle size={16} />{requestError}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-5 py-4" style={{ background: 'linear-gradient(to top, rgba(13,27,42,1) 60%, rgba(13,27,42,0) 100%)' }}>
        {joined ? (
          <div className="w-full py-4 rounded-2xl flex items-center justify-center gap-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22C55E' }}>
            <CheckCircle size={20} color="#22C55E" />
            <span className="font-bold text-base" style={{ color: '#22C55E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {joinLabel}
            </span>
          </div>
        ) : isOrganizerOwner ? (
          <button className="w-full py-4 rounded-2xl font-bold text-base" style={{ backgroundColor: 'rgba(0, 180, 166, 0.18)', border: '1px solid rgba(0, 180, 166, 0.3)', color: '#00B4A6', fontFamily: "'Plus Jakarta Sans', sans-serif" }} disabled>
            You organized this game
          </button>
        ) : isGameUnavailable ? (
          <button className="w-full py-4 rounded-2xl flex items-center justify-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }} disabled>
            <XCircle size={20} color="#EF4444" />
            <span className="font-bold text-base" style={{ color: '#EF4444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Game not available
            </span>
          </button>
        ) : (
          <button className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-transform" style={{ backgroundColor: accentColor, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: `0 8px 24px ${accentColor}40` }} onClick={() => setShowConfirmSheet(true)}>
            Join Game
          </button>
        )}
      </div>

      {showConfirmSheet ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowConfirmSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 rounded-t-3xl p-6" style={{ backgroundColor: '#0D1B2A', border: '1px solid rgba(245, 239, 224, 0.1)' }}>
            <div className="w-12 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: 'rgba(245, 239, 224, 0.2)' }} />
            <h3 className="text-xl font-black mb-2 text-center" style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Confirm Join Request
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Your request will be sent to <strong style={{ color: '#F5EFE0' }}>{game.organizerName}</strong> for review and logged for audit tracking.
            </p>

            <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: 'rgba(244, 114, 43, 0.08)', border: '1px solid rgba(244, 114, 43, 0.2)' }}>
              <p className="font-bold text-sm mb-1" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{game.title}</p>
              <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{game.date} · {game.time} · {game.city}</p>
              {game.entryFee !== null ? <p className="text-xs mt-1 font-semibold" style={{ color: '#F4722B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Entry fee: PHP {game.entryFee}</p> : null}
            </div>

            <div className="flex gap-3">
              <button className="flex-1 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform" style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)', color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={() => setShowConfirmSheet(false)}>
                Cancel
              </button>
              <button className="flex-1 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform" style={{ backgroundColor: accentColor, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: `0 4px 16px ${accentColor}40`, opacity: isJoining ? 0.7 : 1 }} onClick={handleJoin} disabled={isJoining}>
                {isJoining ? 'Sending...' : 'Confirm Join'}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {showReportModal ? <ReportIssueModal game={game} onClose={() => setShowReportModal(false)} /> : null}
    </div>
  );
};
