import React from 'react';
import { MapPin, Clock, Users } from 'lucide-react';
import { Game } from '@/types/game';

interface GameCardProps {
  game: Game;
  onClick: (game: Game) => void;
  animationDelay?: number;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick, animationDelay = 0 }) => {
  const isBasketball = game.sport === 'basketball';
  const fillPercent = (game.slotsFilled / game.slotsTotal) * 100;

  return (
    <div
      className="game-card card-animate cursor-pointer mx-4 mb-3"
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={() => onClick(game)}
    >
      <div
        className="rounded-[12px] overflow-hidden relative"
        style={{
          backgroundColor: '#F5EFE0',
          borderLeft: `4px solid ${isBasketball ? '#F4722B' : '#00B4A6'}`,
          boxShadow: '0 4px 16px rgba(244, 114, 43, 0.12), 0 1px 4px rgba(13, 27, 42, 0.08)',
        }}
      >
        {/* Sport icon top-right */}
        <div
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: isBasketball ? 'rgba(244, 114, 43, 0.12)' : 'rgba(0, 180, 166, 0.12)',
          }}
        >
          {isBasketball ? (
            <span className="text-base">🏀</span>
          ) : (
            <span className="text-base">🏐</span>
          )}
        </div>

        <div className="p-4 pr-12">
          {/* Title */}
          <h3
            className="font-display font-bold text-[15px] leading-snug mb-1 pr-2"
            style={{ color: '#0D1B2A', fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            {game.title}
          </h3>
          <p
            className="text-xs mb-3"
            style={{ color: '#0D1B2A', opacity: 0.55, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {game.courtName}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            <div className="flex items-center gap-1">
              <Clock size={11} style={{ color: '#F4722B' }} />
              <span
                className="text-xs font-medium"
                style={{ color: '#0D1B2A', opacity: 0.7, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {game.date} · {game.time}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={11} style={{ color: '#F4722B' }} />
              <span
                className="text-xs font-medium"
                style={{ color: '#0D1B2A', opacity: 0.7, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {game.barangay}, {game.city}
              </span>
            </div>
          </div>

          {/* Slot bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Users size={11} style={{ color: '#0D1B2A', opacity: 0.5 }} />
                <span
                  className="text-xs"
                  style={{ color: '#0D1B2A', opacity: 0.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {game.slotsFilled} / {game.slotsTotal} players
                </span>
              </div>
              <span
                className="text-xs font-semibold"
                style={{
                  color: fillPercent >= 90 ? '#EF4444' : '#22C55E',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {game.slotsTotal - game.slotsFilled} slots left
              </span>
            </div>
            <div className="slot-bar">
              <div
                className="slot-bar-fill"
                style={{
                  width: `${fillPercent}%`,
                  backgroundColor: isBasketball ? '#F4722B' : '#00B4A6',
                }}
              />
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            {/* Entry fee */}
            <div
              className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{
                backgroundColor: game.entryFee === null ? 'rgba(34, 197, 94, 0.15)' : 'rgba(244, 114, 43, 0.12)',
                color: game.entryFee === null ? '#22C55E' : '#F4722B',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {game.entryFee === null ? 'FREE' : `₱${game.entryFee}`}
            </div>

            {/* Status chip */}
            <div
              className="px-3 py-1 rounded-full text-xs font-bold tracking-wide"
              style={{
                backgroundColor:
                  game.status === 'OPEN' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: game.status === 'OPEN' ? '#22C55E' : '#EF4444',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {game.status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
