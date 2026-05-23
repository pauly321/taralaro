import React from 'react';
import { Calendar, Trophy } from 'lucide-react';
import { Game } from '@/types/game';

interface MyGamesScreenProps {
  games: Game[];
  onGameClick: (game: Game) => void;
}

export const MyGamesScreen: React.FC<MyGamesScreenProps> = ({ games, onGameClick }) => {
  const myGames = games.slice(0, 2);

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1
          className="text-2xl font-black mb-1"
          style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          My Games
        </h1>
        <p className="text-sm" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Your upcoming and past games
        </p>
      </div>

      {/* Upcoming */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} color="#F4722B" />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: '#F4722B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Upcoming
          </span>
        </div>
        {myGames.map((game) => {
          const isBasketball = game.sport === 'basketball';
          return (
            <div
              key={game.id}
              className="mb-3 rounded-xl overflow-hidden cursor-pointer active:scale-98 transition-transform"
              style={{
                backgroundColor: '#F5EFE0',
                borderLeft: `4px solid ${isBasketball ? '#F4722B' : '#00B4A6'}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              }}
              onClick={() => onGameClick(game)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className="font-bold text-sm mb-0.5"
                      style={{ color: '#0D1B2A', fontFamily: "'Bricolage Grotesque', sans-serif" }}
                    >
                      {game.title}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(13,27,42,0.55)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {game.date} · {game.time}
                    </p>
                  </div>
                  <span className="text-xl">{isBasketball ? '🏀' : '🏐'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state for past games */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} color="rgba(245, 239, 224, 0.4)" />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Past Games
          </span>
        </div>
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: 'rgba(245, 239, 224, 0.04)', border: '1px solid rgba(245, 239, 224, 0.08)' }}
        >
          <span className="text-4xl block mb-3">🏆</span>
          <p className="text-sm font-semibold" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            No past games yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(245, 239, 224, 0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Join a game to get started!
          </p>
        </div>
      </div>
    </div>
  );
};
