import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { Game } from '@/types/game';

interface HeroBannerProps {
  game: Game;
  onCTAClick: (game: Game) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ game, onCTAClick }) => {
  const isBasketball = game.sport === 'basketball';

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative cursor-pointer" style={{ minHeight: 180 }}
      onClick={() => onCTAClick(game)}>
      {/* Background image */}
      <img
        src={game.imageUrl}
        alt={game.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: isBasketball
            ? 'linear-gradient(135deg, rgba(13,27,42,0.88) 0%, rgba(244,114,43,0.55) 100%)'
            : 'linear-gradient(135deg, rgba(13,27,42,0.88) 0%, rgba(0,180,166,0.55) 100%)',
        }}
      />
      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-5">
        {/* Top: Sport icon + Countdown */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isBasketball ? '🏀' : '🏐'}</span>
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#F5EFE0',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                backdropFilter: 'blur(4px)',
              }}
            >
              {isBasketball ? 'Basketball' : 'Volleyball'}
            </span>
          </div>
          {/* Countdown chip */}
          <div
            className="flex items-center gap-1 px-3 py-1 rounded-full"
            style={{
              backgroundColor: 'rgba(244, 114, 43, 0.9)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Clock size={11} color="#fff" />
            <span
              className="text-xs font-bold text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Starts in 2h
            </span>
          </div>
        </div>

        {/* Game title */}
        <h2
          className="font-black text-xl leading-tight mb-1"
          style={{
            color: '#F5EFE0',
            fontFamily: "'Bricolage Grotesque', sans-serif",
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {game.title}
        </h2>
        <p
          className="text-sm mb-4"
          style={{
            color: 'rgba(245, 239, 224, 0.75)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {game.date} · {game.time} · {game.city}
        </p>

        {/* CTA Button */}
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm active:scale-95 transition-transform"
          style={{
            backgroundColor: '#F4722B',
            color: '#fff',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxShadow: '0 4px 14px rgba(244, 114, 43, 0.4)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onCTAClick(game);
          }}
        >
          View Game
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
