import React from 'react';
import { Home, Map, Trophy, User } from 'lucide-react';

type Tab = 'home' | 'explore' | 'mygames' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; Icon: React.FC<{ size?: number; color?: string }> }[] = [
  { id: 'home', label: 'Home', Icon: ({ size, color }) => <Home size={size} color={color} /> },
  { id: 'explore', label: 'Explore', Icon: ({ size, color }) => <Map size={size} color={color} /> },
  { id: 'mygames', label: 'My Games', Icon: ({ size, color }) => <Trophy size={size} color={color} /> },
  { id: 'profile', label: 'Profile', Icon: ({ size, color }) => <User size={size} color={color} /> },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-3 max-w-md mx-auto"
      style={{
        background: 'rgba(13, 27, 42, 0.97)',
        borderTop: '1px solid rgba(245, 239, 224, 0.1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            className="flex flex-col items-center gap-1 flex-1 py-1 active:scale-90 transition-transform"
            onClick={() => onTabChange(id)}
          >
            <Icon size={22} color={isActive ? '#F4722B' : 'rgba(245, 239, 224, 0.35)'} />
            <span
              className="text-[10px] font-semibold"
              style={{
                color: isActive ? '#F4722B' : 'rgba(245, 239, 224, 0.35)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
