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
import {
  fetchGames,
  fetchMyGames,
  fetchNotifications,
  fetchGameById,
} from '@/lib/phase1Api';
import { useAuth } from '@/hooks/useAuth';
import { Game, Notification, Sport } from '@/types/game';
import {MapContainer as LeafletMapContainer, TileLayer as LeafletTileLayer, Marker, Popup, useMap,} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';


const MapContainer = LeafletMapContainer as any;
const TileLayer = LeafletTileLayer as any;
const MarkerCluster = MarkerClusterGroup as any;

type Tab = 'home' | 'explore' | 'mygames' | 'profile';

const distanceInMiles = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) => {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapTheme, setMapTheme] = useState<
  'satellite' | 'dark' | 'standard'
>('satellite');
  const [radiusMiles, setRadiusMiles] = useState(5);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';
  const filteredGames = useMemo(() => {
    const sportFiltered = sportFilter === 'all' ? games : games.filter((game) => game.sport === sportFilter);
    

    if (activeFilters.includes('entry_fee')) {
      return sportFiltered.filter((game) => game.entryFee === null || game.entryFee <= 100);
    }

    return sportFiltered;
  }, [activeFilters, games, sportFilter]);

  const nearbyPinnedGames = useMemo(() => {
    if (!userLocation) return [];
  
    return filteredGames.filter((game) => {
      if (game.latitude == null || game.longitude == null) return false;
  
      return (
        distanceInMiles(
          userLocation[0],
          userLocation[1],
          game.latitude,
          game.longitude
        ) <= radiusMiles
      );
    });
  }, [filteredGames, userLocation, radiusMiles]);

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
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude,
        ]);
      },
      () => {
        setUserLocation([14.676, 121.0437]);
      }
    );
  }, []);

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

  const handleNotificationGameClick = async (
    gameId: string,
    notificationId?: string
  ) => {
    if (notificationId) {
      setNotifications((current) =>
        current.map((notif) =>
          notif.id === notificationId
            ? { ...notif, read: true }
            : notif
        )
      );
    }
  
    if (!gameId) {
      alert('This notification is not linked to a game.');
      return;
    }
  
    const cachedGame =
      games.find((item) => item.id === gameId) ||
      myGames.find((item) => item.id === gameId);
  
    if (cachedGame) {
      setShowNotifications(false);
      setActiveTab('home');
      setSelectedGame(cachedGame);
      return;
    }
  
    if (!accessToken) {
      alert('Your session expired. Please sign in again.');
      return;
    }
  
    try {
      const loadedGame = await fetchGameById(accessToken, gameId);
  
      setGames((current) =>
        current.some((game) => game.id === loadedGame.id)
          ? current
          : [loadedGame, ...current]
      );
  
      setShowNotifications(false);
      setActiveTab('home');
      setSelectedGame(loadedGame);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'This game is no longer available or has been removed.'
      );
    }
  };

  const handleCreatedGame = (createdGame: Game) => {
    setGames((current) => [createdGame, ...current]);
    setMyGames((current) => [createdGame, ...current]);
  };

  if (selectedGame) {
    return <GameDetails game={selectedGame} onBack={() => setSelectedGame(null)} onGameUpdated={() => loadPhase1Data(false)} />;
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
              <div className="h-full px-4 pt-4 pb-6">
                <div className="mb-4">
                  <h2
                    className="text-2xl font-black"
                    style={{
                      color: '#F5EFE0',
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                    }}
                  >
                    Nearby Games
                  </h2>

                  <div
                      className="flex mb-4 p-1 rounded-2xl"
                      style={{
                        backgroundColor: 'rgba(13,27,42,0.75)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(245,239,224,0.08)',
                      }}
                    >
                    {[
                      { id: 'satellite', label: 'Satellite' },
                      { id: 'dark', label: 'Night' },
                      { id: 'standard', label: 'Default' },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setMapTheme(theme.id as any)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          backgroundColor:
                            mapTheme === theme.id
                              ? '#F4722B'
                              : 'transparent',

                          boxShadow:
                            mapTheme === theme.id
                              ? '0 6px 18px rgba(244,114,43,0.35)'
                              : 'none',
                          color:
                            mapTheme === theme.id
                              ? '#fff'
                              : 'rgba(245,239,224,0.65)',
                        }}
                      >
                        {theme.label}
                      </button>
                    ))}
                  </div>
                  <div
                        className="mb-4 rounded-2xl p-4"
                        style={{
                          backgroundColor: 'rgba(245,239,224,0.04)',
                          border: '1px solid rgba(245,239,224,0.08)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-sm"
                            style={{
                              color: 'rgba(245,239,224,0.7)',
                            }}
                          >
                            Search Radius
                          </span>

                          <span
                            className="text-sm font-bold"
                            style={{
                              color: '#00D4C7',
                            }}
                          >
                            {radiusMiles} mi
                          </span>
                        </div>

                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="1"
                          value={radiusMiles}
                          onChange={(e) => setRadiusMiles(Number(e.target.value))}
                          style={{
                            width: '100%',
                            accentColor: '#F4722B',
                          }}
                        />
                      </div>
                  <p
                    className="text-sm mt-1"
                    style={{
                      color: 'rgba(245, 239, 224, 0.45)',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    Showing pinned games within {radiusMiles} miles of your current location.
                  </p>
                </div>

                <div
                  className="relative z-0 overflow-hidden rounded-3xl border"
                  style={{
                    height: '68vh',
                    borderColor: 'rgba(245, 239, 224, 0.1)',
                  }}
    >
        {userLocation ? (
              <MapContainer
              center={userLocation}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              {mapTheme === 'satellite' && (
                <>
                  <TileLayer
                    attribution="Tiles © Esri"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />

                  <TileLayer
                    attribution="Esri"
                    url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  />
                </>
              )}

              {mapTheme === 'dark' && (
                <TileLayer
                  attribution="© CARTO"
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
              )}

              {mapTheme === 'standard' && (
                <TileLayer
                  attribution="© OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}
            
              {/* User location stays separate */}
              <Marker position={userLocation}>
                <Popup>You are here</Popup>
              </Marker>
            
              {/* Only game markers are clustered */}
              <MarkerCluster
                chunkedLoading
                showCoverageOnHover={false}
                spiderfyOnMaxZoom
                maxClusterRadius={50}
                disableClusteringAtZoom={17}
              >
                {nearbyPinnedGames.map((game) => (
                  <Marker
                    key={game.id}
                    position={[game.latitude!, game.longitude!] as [number, number]}
                  >
                    <Popup>
                      <div style={{ minWidth: 190 }}>
                        <strong>{game.title}</strong>

                        <p style={{ margin: '6px 0', color: '#F4722B', fontWeight: 700 }}>
                          {game.sport === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
                        </p>

                        <p style={{ margin: '6px 0' }}>
                          📍 {game.courtName}
                        </p>

                        <p style={{ margin: '6px 0' }}>
                          📅 {game.date}
                        </p>

                        <p style={{ margin: '6px 0' }}>
                          🕒 {game.time} – {game.endTime}
                        </p>

                        <p style={{ margin: '6px 0' }}>
                          👤 {game.organizerName}
                        </p>

                        <p style={{ margin: '6px 0', fontWeight: 700 }}>
                          {game.entryFee === null ? 'FREE' : `₱${game.entryFee}`}
                        </p>
            
                        <button
                          type="button"
                          onClick={() => setSelectedGame(game)}
                          style={{
                            marginTop: 8,
                            backgroundColor: '#F4722B',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '8px 12px',
                            width: '100%',
                            fontWeight: 700,
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerCluster>
            </MapContainer>
            ) : (
              
        <div className="flex h-full items-center justify-center text-sm text-[#F5EFE0]/50">
          Loading your location...
        </div>
      )}
    </div>

    <p className="mt-3 text-center text-xs text-[#F5EFE0]/45">
      {nearbyPinnedGames.length} pinned game(s) nearby
    </p>
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
