import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { TopNav } from './TopNav';
import { HeroBanner } from './HeroBanner';
import { FilterBar } from './FilterBar';
import { GameCard } from './GameCard';
import { BottomNav } from './BottomNav';
import { GameDetails } from './GameDetails';
import { NotificationPanel } from './NotificationPanel';
import { CreateGameModal } from './CreateGameModal';
import { MyGamesScreen } from './MyGamesScreen';
import { ProfileScreen } from './ProfileScreen';
import { fetchGames, fetchMyGames, fetchNotifications } from '@/lib/phase1Api';
import { useAuth } from '@/hooks/useAuth';
import { Game, Notification, Sport } from '@/types/game';

type Tab = 'home' | 'explore' | 'mygames' | 'profile';

export const HomeFeed: React.FC = () => {
  const { accessToken, user } = useAuth();
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  const filteredGames = useMemo(() => {
    const sportFiltered = sportFilter === 'all' ? games : games.filter((game) => game.sport === sportFilter);

    if (activeFilters.includes('entry_fee')) {
      return sportFiltered.filter((game) => game.entryFee === null || game.entryFee <= 100);
    }

    return sportFiltered;
  }, [activeFilters, games, sportFilter]);

  const heroGame = filteredGames[0] || games[0] || null;

  const loadPhase1Data = async (showSpinner = true) => {
    if (!accessToken) {
      return;
    }

    if (showSpinner) {
      setIsLoading(true);
    }

    setError('');

    try {
      const [nextGames, nextMyGames, nextNotifications] = await Promise.all([
        fetchGames(accessToken),
        fetchMyGames(accessToken),
        fetchNotifications(accessToken),
      ]);

      setGames(nextGames);
      setMyGames(nextMyGames);
      setNotifications(nextNotifications);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load phase 1 data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPhase1Data();
  }, [accessToken]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPhase1Data(false);
  };

  const handleFilterToggle = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId) ? prev.filter((filter) => filter !== filterId) : [...prev, filterId]
    );
  };

  const handleNotificationGameClick = (gameId: string) => {
    const game = games.find((item) => item.id === gameId) || myGames.find((item) => item.id === gameId);

    if (game) {
      setShowNotifications(false);
      setSelectedGame(game);
    }
  };

  const handleCreatedGame = (createdGame: Game) => {
    setGames((current) => [createdGame, ...current]);
    setMyGames((current) => [createdGame, ...current]);
  };

  if (selectedGame) {
    return <GameDetails game={selectedGame} onBack={() => setSelectedGame(null)} onJoinSuccess={() => loadPhase1Data(false)} />;
  }

  if (showCreateGame) {
    return <CreateGameModal onClose={() => setShowCreateGame(false)} onSubmit={handleCreatedGame} />;
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden" style={{ backgroundColor: '#0D1B2A' }}>
      <TopNav sportFilter={sportFilter} onSportFilter={setSportFilter} unreadCount={unreadCount} onNotificationClick={() => setShowNotifications(true)} />

      <div className="flex-1 overflow-y-auto pb-20" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === 'home' && (
          <>
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Featured Game
              </p>
              <button className={`flex items-center gap-1 text-xs font-semibold active:scale-95 transition-transform ${isRefreshing ? 'opacity-50' : ''}`} style={{ color: '#F4722B', fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={handleRefresh}>
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {heroGame ? <HeroBanner game={heroGame} onCTAClick={setSelectedGame} /> : null}

            <FilterBar activeFilters={activeFilters} onFilterToggle={handleFilterToggle} onMapView={() => {}} />

            <div className="px-4 pb-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {sportFilter === 'all' ? 'All Games' : sportFilter === 'basketball' ? 'Basketball Games' : 'Volleyball Games'}{' '}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'rgba(244, 114, 43, 0.15)', color: '#F4722B' }}>
                    {filteredGames.length}
                  </span>
                </p>
              </div>
            </div>

            {error ? (
              <div className="mx-4 mb-4 rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.22)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {error}
              </div>
            ) : null}

            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-5xl">🔐</span>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Loading protected game data...
                  </p>
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-5xl">😅</span>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    No games found
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Seed sample games or create one as an organizer to populate the secure feed.
                  </p>
                </div>
              ) : (
                filteredGames.map((game, index) => <GameCard key={game.id} game={game} onClick={setSelectedGame} animationDelay={index * 60} />)
              )}
            </div>

            <div className="h-4" />
          </>
        )}

        {activeTab === 'explore' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
            <span className="text-6xl">🗺️</span>
            <h2 className="text-2xl font-black text-center" style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Map View
            </h2>
            <p className="text-sm text-center" style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Google Maps integration for court discovery remains a later phase, but protected data plumbing is now in place.
            </p>
            <div className="w-full max-w-xs p-4 rounded-2xl text-center" style={{ backgroundColor: 'rgba(0, 180, 166, 0.1)', border: '1px solid rgba(0, 180, 166, 0.2)' }}>
              <p className="text-xs font-semibold" style={{ color: '#00B4A6', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Secure feeds and organizer actions are active in Phase 1.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'mygames' && <MyGamesScreen games={myGames} onGameClick={setSelectedGame} />}

        {activeTab === 'profile' && <ProfileScreen />}
      </div>

      {isOrganizer && activeTab === 'home' && (
        <button className="fixed bottom-24 right-4 max-w-md w-auto z-20 flex items-center gap-2 px-5 py-3.5 rounded-full font-bold text-sm active:scale-90 transition-transform" style={{ backgroundColor: '#F4722B', color: '#fff', boxShadow: '0 8px 28px rgba(244, 114, 43, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={() => setShowCreateGame(true)}>
          <Plus size={18} />
          Post Game
        </button>
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {showNotifications ? <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} onGameClick={handleNotificationGameClick} /> : null}
    </div>
  );
};
