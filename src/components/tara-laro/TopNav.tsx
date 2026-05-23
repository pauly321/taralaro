import React from 'react';
import { Bell } from 'lucide-react';
import { Sport } from '@/types/game';

interface TopNavProps {
  sportFilter: Sport | 'all';
  onSportFilter: (sport: Sport | 'all') => void;
  unreadCount: number;
  onNotificationClick: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  sportFilter,
  onSportFilter,
  unreadCount,
  onNotificationClick,
}) => {
  const filters: { label: string; value: Sport | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: '🏀 Hoops', value: 'basketball' },
    { label: '🏐 Volleyball', value: 'volleyball' },
  ];

  return (
    <div
      className="sticky top-0 z-30 noise-overlay"
      style={{
        background: 'linear-gradient(180deg, rgba(13,27,42,0.98) 0%, rgba(13,27,42,0.95) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Main nav row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ backgroundColor: '#F4722B' }}
          >
            🏀
          </div>
          <span
            className="text-xl font-black tracking-tight"
            style={{
              color: '#F5EFE0',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              letterSpacing: '-0.02em',
            }}
          >
            TARA LARO
          </span>
        </div>

        {/* Notification bell */}
        <button
          className="relative w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)' }}
          onClick={onNotificationClick}
        >
          <Bell size={20} color="#F5EFE0" />
          {unreadCount > 0 && (
            <div
              className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: '#F4722B' }}
            >
              {unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* Sport filter chips */}
      <div className="flex gap-2 px-4 pb-3">
        {filters.map((f) => {
          const isActive = sportFilter === f.value;
          return (
            <button
              key={f.value}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
              style={{
                backgroundColor: isActive ? '#F4722B' : 'rgba(245, 239, 224, 0.1)',
                color: isActive ? '#fff' : 'rgba(245, 239, 224, 0.65)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                border: isActive ? '1px solid #F4722B' : '1px solid rgba(245, 239, 224, 0.15)',
              }}
              onClick={() => onSportFilter(f.value)}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
