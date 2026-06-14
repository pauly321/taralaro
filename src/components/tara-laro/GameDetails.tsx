import React, { useEffect, useMemo, useState } from 'react';
import {MapContainer as LeafletMapContainer,TileLayer as LeafletTileLayer, Marker, useMapEvents,} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { deleteGame as deleteGameRequest } from '../../lib/phase1Api';
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
import { fetchGameJoinRequests, joinGame, reviewGameJoinRequest } from '@/lib/phase1Api';
import { useAuth } from '@/hooks/useAuth';
import { Game, GameJoinRequest, JoinRequestReviewDecision } from '@/types/game';
import { ReportIssueModal } from './ReportIssueModal';
import { CreateGameModal } from './CreateGameModal';

const MapContainer = LeafletMapContainer as any;
const TileLayer = LeafletTileLayer as any;

interface GameDetailsProps {
  game: Game;
  onBack: () => void;
  onGameUpdated?: () => void;
}

export const GameDetails: React.FC<GameDetailsProps> = ({ game, onBack, onGameUpdated }) => {
  const { accessToken, user } = useAuth();
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentGame, setCurrentGame] = useState(game);
  const [joinedStatus, setJoinedStatus] = useState(game.joinedStatus ?? null);
  const [joinRequests, setJoinRequests] = useState<GameJoinRequest[]>([]);
  const [isLoadingJoinRequests, setIsLoadingJoinRequests] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    setCurrentGame(game);
    setJoinedStatus(game.joinedStatus ?? null);
    setJoinError('');
    setReviewError('');
    setShowConfirmSheet(false);
  }, [game]);

  const isBasketball = currentGame.sport === 'basketball';
  const fillPercent = (currentGame.slotsFilled / Math.max(currentGame.slotsTotal, 1)) * 100;
  const accentColor = isBasketball ? '#F4722B' : '#00B4A6';
  const isOrganizerOwner = user?.id && currentGame.organizerUserId ? user.id === currentGame.organizerUserId : false;
  const isGameUnavailable = ['FULL', 'CANCELLED', 'COMPLETED'].includes(currentGame.status);
  const isJoined = joinedStatus === 'pending' || joinedStatus === 'approved';
  const displayDate = (() => {
    const date = new Date(currentGame.date);
  
    if (Number.isNaN(date.getTime())) {
      return currentGame.date;
    }
  
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  })();
  const joinLabel = useMemo(() => {
    if (joinedStatus === 'approved') {
      return 'You are in this game';
    }

    if (joinedStatus === 'pending') {
      return 'Join request pending';
    }

    return 'Join Game';
  }, [joinedStatus]);

  const canEdit =
  user?.role === 'organizer' &&
  user?.id === game.organizerUserId;

  useEffect(() => {
    if (!isOrganizerOwner || !accessToken) {
      setJoinRequests([]);
      setIsLoadingJoinRequests(false);
      return undefined;
    }

    let isMounted = true;

    const loadJoinRequests = async () => {
      setIsLoadingJoinRequests(true);
      setReviewError('');

      try {
        const nextRequests = await fetchGameJoinRequests(accessToken, currentGame.id);

        if (isMounted) {
          setJoinRequests(nextRequests);
        }
      } catch (error) {
        if (isMounted) {
          setReviewError(error instanceof Error ? error.message : 'Unable to load join requests.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingJoinRequests(false);
        }
      }
    };

    loadJoinRequests();

    return () => {
      isMounted = false;
    };
  }, [accessToken, currentGame.id, isOrganizerOwner]);

  const handleJoin = async () => {
    if (!accessToken) {
      setJoinError('Your session expired. Please sign in again.');
      return;
    }

    setJoinError('');
    setIsJoining(true);

    try {
      await joinGame(accessToken, currentGame.id);
      setShowConfirmSheet(false);
      setJoinedStatus('pending');
      onGameUpdated?.();
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Unable to send your join request.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!accessToken) return;
  
    try {
      setIsDeleting(true);
  
      await deleteGameRequest(accessToken, currentGame.id);

      onGameUpdated?.();
      onBack();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to delete the game.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReviewRequest = async (requestId: string, decision: JoinRequestReviewDecision) => {
    if (!accessToken) {
      setReviewError('Your session expired. Please sign in again.');
      return;
    }

    setReviewError('');
    setActiveReviewId(requestId);

    try {
      const payload = await reviewGameJoinRequest(accessToken, currentGame.id, requestId, decision);
      setCurrentGame(payload.game);
      setJoinRequests((current) => current.filter((request) => request.id !== requestId));
      onGameUpdated?.();
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Unable to review this join request.');
    } finally {
      setActiveReviewId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col max-w-md mx-auto" style={{ backgroundColor: '#0D1B2A' }}>
      <div className="relative h-56 flex-shrink-0">
        <img src={currentGame.imageUrl} alt={currentGame.title} className="w-full h-full object-cover" />
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
            {currentGame.title}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-36">
        <div className="p-5 space-y-5">

          <p className="text-sm" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            📍 {currentGame.courtName}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.06)', border: '1px solid rgba(245, 239, 224, 0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} color={accentColor} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Date & Time</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{displayDate}</p>
              <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{currentGame.time} - {currentGame.endTime}</p>
            </div>

            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.06)', border: '1px solid rgba(245, 239, 224, 0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={14} color={accentColor} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Location</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{currentGame.barangay}</p>
              <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{currentGame.city}</p>
            </div>
          </div>
            {currentGame.latitude && currentGame.longitude && (
              <div
              className="relative z-0 rounded-xl overflow-hidden"
            >
                <MapContainer
                  center={[currentGame.latitude, currentGame.longitude] as [number, number]}
                  zoom={16}
                  style={{ height: 250, width: '100%' }}
                >
                  <TileLayer
                    attribution="Tiles © Esri"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />

                  <TileLayer
                    attribution="Esri"
                    url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  />
                  <Marker
                    position={[currentGame.latitude, currentGame.longitude] as [number, number]}
                  />
                </MapContainer>

                <button
                  type="button"
                  onClick={() => setShowDirectionsModal(true)}

                  className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-bold active:scale-95 transition-transform"
                  style={{
                    backgroundColor: 'rgba(244, 114, 43, 0.15)',
                    border: '1px solid rgba(244, 114, 43, 0.3)',
                    color: '#F4722B',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Open in Maps
                </button>
              </div>
            )}
          

          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.06)', border: '1px solid rgba(245, 239, 224, 0.08)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={16} color={accentColor} />
                <span className="text-sm font-bold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Player Slots</span>
              </div>
              <span className="text-lg font-black" style={{ color: accentColor, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {currentGame.slotsFilled}/{currentGame.slotsTotal}
              </span>
            </div>
            <div className="slot-bar mb-2"><div className="slot-bar-fill" style={{ width: `${fillPercent}%`, backgroundColor: accentColor }} /></div>
            <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{Math.max(currentGame.slotsTotal - currentGame.slotsFilled, 0)} slots remaining</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 p-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(244, 114, 43, 0.1)', border: '1px solid rgba(244, 114, 43, 0.2)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Entry Fee</p>
              <p className="text-xl font-black" style={{ color: '#F4722B', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{currentGame.entryFee === null ? 'FREE' : `PHP ${currentGame.entryFee}`}</p>
            </div>
            <div className="flex-1 p-3 rounded-xl text-center" style={{ backgroundColor: currentGame.status === 'OPEN' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${currentGame.status === 'OPEN' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Status</p>
              <p className="text-xl font-black" style={{ color: currentGame.status === 'OPEN' ? '#22C55E' : '#EF4444', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{currentGame.status}</p>
            </div>
          </div>

          {currentGame.description ? (
            <div>
              <h3 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                About this game
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(245, 239, 224, 0.75)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {currentGame.description}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.06)', border: '1px solid rgba(245, 239, 224, 0.08)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ backgroundColor: `${accentColor}30`, color: accentColor }}>
              {currentGame.organizerName[0]}
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Organized by</p>
              <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{currentGame.organizerName}</p>
            </div>
            <div className="ml-auto">
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(244, 114, 43, 0.15)', color: '#F4722B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Verified Host
              </span>
            </div>
          </div>

          {isOrganizerOwner ? (
            <div className="rounded-2xl border p-4" style={{ backgroundColor: 'rgba(0, 180, 166, 0.08)', borderColor: 'rgba(0, 180, 166, 0.2)' }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#00B4A6', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Pending join requests
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Approve players before the game fills up.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(0, 180, 166, 0.14)', color: '#00B4A6', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {joinRequests.length}
                </div>
              </div>

              {isLoadingJoinRequests ? (
                <div className="rounded-xl px-4 py-5 text-sm" style={{ backgroundColor: 'rgba(245, 239, 224, 0.04)', color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Loading join requests...
                </div>
              ) : joinRequests.length === 0 ? (
                <div className="rounded-xl px-4 py-5 text-sm" style={{ backgroundColor: 'rgba(245, 239, 224, 0.04)', color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  No pending players right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map((request) => {
                    const isReviewing = activeReviewId === request.id;
                    const isAnyReviewing = activeReviewId !== null;
                    const sportLabel = request.preferredSport === 'basketball' ? 'Basketball' : 'Volleyball';

                    return (
                      <div
                        key={request.id}
                        className="rounded-xl border p-4"
                        style={{ backgroundColor: 'rgba(13, 27, 42, 0.36)', borderColor: 'rgba(245, 239, 224, 0.08)' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: `${accentColor}25`, color: accentColor, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                            {request.displayName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {request.displayName}
                                </p>
                                <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  @{request.username}
                                </p>
                              </div>
                              <span className="text-[11px] font-bold px-2 py-1 rounded-full uppercase tracking-wide" style={{ backgroundColor: 'rgba(244, 114, 43, 0.14)', color: '#F4722B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {sportLabel}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              <span>{request.barangay}, {request.city}</span>
                              <span>•</span>
                              <span>Requested {request.requestedAt}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                          <button
                            className="flex-1 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.24)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: isAnyReviewing ? 0.6 : 1 }}
                            onClick={() => handleReviewRequest(request.id, 'rejected')}
                            disabled={isAnyReviewing}
                          >
                            {isReviewing ? 'Working...' : 'Decline'}
                          </button>
                          <button
                            className="flex-1 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
                            style={{ backgroundColor: '#22C55E', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 6px 18px rgba(34, 197, 94, 0.3)', opacity: isAnyReviewing ? 0.6 : 1 }}
                            onClick={() => handleReviewRequest(request.id, 'approved')}
                            disabled={isAnyReviewing}
                          >
                            {isReviewing ? 'Working...' : 'Approve'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

{isOrganizerOwner ? (
            <div className="space-y-3">
              <button
                className="w-full py-4 rounded-2xl font-bold text-base"
                style={{
                  backgroundColor: 'rgba(0, 180, 166, 0.18)',
                  border: '1px solid rgba(0, 180, 166, 0.35)',
                  color: '#00B4A6',
                }}
              >
                You organized this game
              </button>

              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="w-full py-4 rounded-2xl font-bold text-base"
                  style={{
                    backgroundColor: 'rgba(0, 180, 166, 0.18)',
                    border: '1px solid rgba(0, 180, 166, 0.35)',
                    color: '#00B4A6',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Edit Game
                </button>
              ) : null}

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="w-full py-4 rounded-2xl font-bold text-base"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#EF4444',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Game'}
              </button>
            </div>
          ) : null}

          <button className="w-full flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.18)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={() => setShowReportModal(true)}>
            <ShieldAlert size={16} />
            Report this game
          </button>

          {joinError ? (
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.24)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div className="flex items-center gap-2"><AlertTriangle size={16} />{joinError}</div>
            </div>
          ) : null}

          {reviewError ? (
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.24)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div className="flex items-center gap-2"><AlertTriangle size={16} />{reviewError}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-5 py-4" style={{ background: 'linear-gradient(to top, rgba(13,27,42,1) 60%, rgba(13,27,42,0) 100%)' }}>
        {isJoined ? (
          <div className="w-full py-4 rounded-2xl flex items-center justify-center gap-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22C55E' }}>
            <CheckCircle size={20} color="#22C55E" />
            <span className="font-bold text-base" style={{ color: '#22C55E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {joinLabel}
            </span>
          </div>
                ) : isOrganizerOwner ? null : isGameUnavailable ? (
          <button className="w-full py-4 rounded-2xl flex items-center justify-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }} disabled>
            <XCircle size={20} color="#EF4444" />
            <span className="font-bold text-base" style={{ color: '#EF4444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Game not available
            </span>
          </button>
        ) : (
          <button className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-transform" style={{ backgroundColor: accentColor, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: `0 8px 24px ${accentColor}40` }} onClick={() => setShowConfirmSheet(true)}>
            {joinLabel}
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
              Your request will be sent to <strong style={{ color: '#F5EFE0' }}>{currentGame.organizerName}</strong> for review and logged for audit tracking.
            </p>

            <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: 'rgba(244, 114, 43, 0.08)', border: '1px solid rgba(244, 114, 43, 0.2)' }}>
              <p className="font-bold text-sm mb-1" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{currentGame.title}</p>
              <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{displayDate} · {currentGame.time} - {currentGame.endTime} · {currentGame.city}</p>
              {currentGame.entryFee !== null ? <p className="text-xs mt-1 font-semibold" style={{ color: '#F4722B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Entry fee: PHP {currentGame.entryFee}</p> : null}
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

      {showReportModal ? <ReportIssueModal game={currentGame} onClose={() => setShowReportModal(false)} /> : null}
      {showDirectionsModal ? (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/60"
            onClick={() => setShowDirectionsModal(false)}
          />

          <div
            className="fixed left-1/2 top-1/2 z-[9999] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-5"
            style={{
              backgroundColor: '#0D1B2A',
              borderColor: 'rgba(245, 239, 224, 0.12)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
            }}
          >
            <h3
              className="text-xl font-black"
              style={{
                color: '#F5EFE0',
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              Open Directions
            </h3>

            <p
              className="mt-2 text-sm"
              style={{
                color: 'rgba(245,239,224,0.6)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Choose your navigation app.
            </p>

            <div className="mt-5 space-y-3">
              <button
                className="w-full rounded-2xl px-4 py-3 text-sm font-bold"
                style={{
                  backgroundColor: '#4285F4',
                  color: '#fff',
                }}
                onClick={() => {
                  window.open(
                    `https://www.google.com/maps?q=${currentGame.latitude},${currentGame.longitude}`,
                    '_blank'
                  );
                  setShowDirectionsModal(false);
                }}
              >
                Google Maps
              </button>

              <button
                className="w-full rounded-2xl px-4 py-3 text-sm font-bold"
                style={{
                  backgroundColor: '#F5EFE0',
                  color: '#08121D',
                }}
                onClick={() => {
                  const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(currentGame.courtName || 'Game Location')}&ll=${currentGame.latitude},${currentGame.longitude}&z=17`;
                
                  window.open(appleMapsUrl, '_blank');
                  setShowDirectionsModal(false);
                }}
              >
                Apple Maps
              </button>

              <button
                className="w-full rounded-2xl border px-4 py-3 text-sm font-bold"
                style={{
                  borderColor: 'rgba(245,239,224,0.12)',
                  color: '#F5EFE0',
                }}
                onClick={() => setShowDirectionsModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      ) : null}

          {showEditModal ? (
        <CreateGameModal
          mode="edit"
          game={currentGame}
          onClose={() => setShowEditModal(false)}
          onUpdated={(updatedGame) => {
            setCurrentGame(updatedGame);
            setShowEditModal(false);
            onGameUpdated?.();
          }}
        />
      ) : null}

      {showDeleteConfirm ? (
  <>
    <div
      className="fixed inset-0 z-[9998] bg-black/60"
      onClick={() => setShowDeleteConfirm(false)}
    />

    <div
      className="fixed left-1/2 top-1/2 z-[9999] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-5"
      style={{
        backgroundColor: '#0D1B2A',
        borderColor: 'rgba(245, 239, 224, 0.12)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
      }}
    >
      <h3
        className="text-xl font-black"
        style={{
          color: '#F5EFE0',
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        Delete this game?
      </h3>

      <p
        className="mt-2 text-sm leading-6"
        style={{
          color: 'rgba(245, 239, 224, 0.65)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        This game will be hidden from the feed and players will no longer be able to join it.
      </p>

      <div className="mt-5 flex gap-3">
        <button
          className="flex-1 rounded-2xl border px-4 py-3 text-sm font-bold"
          style={{
            borderColor: 'rgba(245, 239, 224, 0.12)',
            color: '#F5EFE0',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          onClick={() => setShowDeleteConfirm(false)}
          disabled={isDeleting}
        >
          Cancel
        </button>

        <button
          className="flex-1 rounded-2xl px-4 py-3 text-sm font-bold"
          style={{
            backgroundColor: '#EF4444',
            color: '#fff',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            opacity: isDeleting ? 0.7 : 1,
          }}
          onClick={handleDeleteGame}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </>
) : null}
    </div>
  );
};
