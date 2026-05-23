import React, { useState, useMemo } from 'react';
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
import { mockGames, heroGame, mockNotifications } from '@/data/mockData';
import { Game, Sport } from '@/types/game';

type Tab = 'home' | 'explore' | 'mygames' | 'profile';

const isOrganizer = true; // Demo: show FAB

export const HomeFeed: React.FC = () => {
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  const filteredGames = useMemo(() => {
    if (sportFilter === 'all') return mockGames;
    return mockGames.filter((g) => g.sport === sportFilter);
  }, [sportFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleFilterToggle = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId) ? prev.filter((f) => f !== filterId) : [...prev, filterId]
    );
  };

  const handleNotificationGameClick = (gameId: string) => {
    const game = mockGames.find((g) => g.id === gameId);
    if (game) {
      setShowNotifications(false);
      setSelectedGame(game);
    }
  };

  // If a game is selected, show details
  if (selectedGame) {
    return (
      <GameDetails
        game={selectedGame}
        onBack={() => setSelectedGame(null)}
      />
    );
  }

  // If create game modal
  if (showCreateGame) {
    return (
      <CreateGameModal
        onClose={() => setShowCreateGame(false)}
        onSubmit={() => setShowCreateGame(false)}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden"
      style={{ backgroundColor: '#0D1B2A' }}
    >
      {/* Top Nav (sticky) */}
      <TopNav
        sportFilter={sportFilter}
        onSportFilter={setSportFilter}
        unreadCount={unreadCount}
        onNotificationClick={() => setShowNotifications(true)}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-20" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === 'home' && (
          <>
            {/* Section label */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Featured Game
              </p>
              <button
                className={`flex items-center gap-1 text-xs font-semibold active:scale-95 transition-transform ${isRefreshing ? 'opacity-50' : ''}`}
                style={{ color: '#F4722B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onClick={handleRefresh}
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {/* Hero banner */}
            <HeroBanner game={heroGame} onCTAClick={setSelectedGame} />

            {/* Filter bar */}
            <FilterBar
              activeFilters={activeFilters}
              onFilterToggle={handleFilterToggle}
              onMapView={() => {}}
            />

            {/* Section label */}
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between">
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {sportFilter === 'all'
                    ? `All Games`
                    : sportFilter === 'basketball'
                    ? '🏀 Basketball Games'
                    : '🏐 Volleyball Games'}
                  &nbsp;
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: 'rgba(244, 114, 43, 0.15)',
                      color: '#F4722B',
                    }}
                  >
                    {filteredGames.length}
                  </span>
                </p>
              </div>
            </div>

            {/* Game cards */}
            <div key={refreshKey}>
              {filteredGames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-5xl">😅</span>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    No games found
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(245, 239, 224, 0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Try a different filter or check back later
                  </p>
                </div>
              ) : (
                filteredGames.map((game, index) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onClick={setSelectedGame}
                    animationDelay={index * 60}
                  />
                ))
              )}
            </div>

            {/* Bottom spacer */}
            <div className="h-4" />
          </>
        )}

        {activeTab === 'explore' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
            <span className="text-6xl">🗺️</span>
            <h2
              className="text-2xl font-black text-center"
              style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Map View
            </h2>
            <p
              className="text-sm text-center"
              style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Google Maps integration for court discovery — coming soon
            </p>
            <div
              className="w-full max-w-xs p-4 rounded-2xl text-center"
              style={{ backgroundColor: 'rgba(0, 180, 166, 0.1)', border: '1px solid rgba(0, 180, 166, 0.2)' }}
            >
              <p className="text-xs font-semibold" style={{ color: '#00B4A6', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Find courts near you with live game pins
              </p>
            </div>
          </div>
        )}

        {activeTab === 'mygames' && (
          <MyGamesScreen
            games={mockGames}
            onGameClick={setSelectedGame}
          />
        )}

        {activeTab === 'profile' && <ProfileScreen />}
      </div>

      {/* FAB — Organizer only */}
      {isOrganizer && activeTab === 'home' && (
        <button
          className="fixed bottom-24 right-4 max-w-md w-auto z-20 flex items-center gap-2 px-5 py-3.5 rounded-full font-bold text-sm active:scale-90 transition-transform"
          style={{
            backgroundColor: '#F4722B',
            color: '#fff',
            boxShadow: '0 8px 28px rgba(244, 114, 43, 0.5)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          onClick={() => setShowCreateGame(true)}
        >
          <Plus size={18} />
          Post Game
        </button>
      )}

      {/* Bottom nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Notification panel */}
      {showNotifications && (
        <NotificationPanel
          notifications={mockNotifications}
          onClose={() => setShowNotifications(false)}
          onGameClick={handleNotificationGameClick}
        />
      )}
    </div>
  );
};
