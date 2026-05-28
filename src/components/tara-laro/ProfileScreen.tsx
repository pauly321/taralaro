import React from 'react';
import { Settings, Star, Users, Trophy, ChevronRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PolicyModal } from '@/components/policy/PolicyModal';
import { PolicyType } from '@/types/game';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activePolicy, setActivePolicy] = React.useState<PolicyType | null>(null);

  const stats = [
    { label: 'Games Joined', value: '14', icon: '🏀' },
    { label: 'Win Rate', value: '68%', icon: '🏆' },
    { label: 'Teams', value: '3', icon: '👥' },
  ];

  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'organizer' ? 'Organizer' : 'Player';
  const sportLabel = user?.preferredSport === 'volleyball' ? '🏐 Volleyball' : '🏀 Basketball';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const menuItems = [
    { icon: Star, label: 'Favorite Courts', color: '#F4722B' },
    { icon: Users, label: 'Friends', color: '#00B4A6' },
    { icon: Trophy, label: 'Achievements', color: '#F4722B' },
    { icon: Settings, label: 'Settings', color: 'rgba(245, 239, 224, 0.5)' },
  ];

  const policyItems: Array<{ type: PolicyType; label: string; description: string }> = [
    { type: 'privacy', label: 'Privacy Notice', description: 'Review what account and activity data is stored.' },
    { type: 'terms', label: 'Terms of Use', description: 'See the rules for platform use and organizer conduct.' },
    { type: 'community_rules', label: 'Community Safety', description: 'View reporting and acceptable behavior expectations.' },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Profile header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(13,27,42,1) 0%, rgba(244,114,43,0.15) 100%)',
        }}
      >
        {/* Decorative circle */}
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ backgroundColor: '#F4722B' }}
        />
        <div className="relative z-10 px-5 pt-8 pb-6">
          {/* Avatar */}
          <div className="flex items-start justify-between mb-5">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black"
              style={{
                background: 'linear-gradient(135deg, #F4722B, #ff8c00)',
                boxShadow: '0 8px 24px rgba(244, 114, 43, 0.35)',
              }}
            >
              🏀
            </div>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)', border: '1px solid rgba(245, 239, 224, 0.12)' }}
            >
              <Settings size={18} color="rgba(245, 239, 224, 0.6)" />
            </button>
          </div>

          {/* Name */}
          <h2
            className="text-2xl font-black mb-1"
            style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            {user?.displayName || 'Juan dela Cruz'}
          </h2>
          <p className="text-sm mb-1" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            @{user?.username || 'juandc'} · {user?.barangay || 'Sampaloc'}, {user?.city || 'Manila'}
          </p>
          <p className="text-sm mb-2" style={{ color: 'rgba(245, 239, 224, 0.38)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {user?.email || 'juan@example.com'}
          </p>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22C55E',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {roleLabel}
            </span>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                backgroundColor: 'rgba(244, 114, 43, 0.12)',
                color: '#F4722B',
                border: '1px solid rgba(244, 114, 43, 0.2)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {sportLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 py-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-3 rounded-xl text-center"
            style={{
              backgroundColor: 'rgba(245, 239, 224, 0.05)',
              border: '1px solid rgba(245, 239, 224, 0.08)',
            }}
          >
            <span className="text-xl block mb-1">{stat.icon}</span>
            <p
              className="text-xl font-black"
              style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {stat.value}
            </p>
            <p
              className="text-[10px] leading-tight mt-0.5"
              style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Menu items */}
      <div className="px-4 space-y-2">
        {menuItems.map(({ icon: Icon, label, color }) => (
          <button
            key={label}
            className="w-full flex items-center gap-4 p-4 rounded-xl active:scale-98 transition-transform"
            style={{
              backgroundColor: 'rgba(245, 239, 224, 0.04)',
              border: '1px solid rgba(245, 239, 224, 0.07)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon size={18} color={color} />
            </div>
            <span
              className="flex-1 text-sm font-medium text-left"
              style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {label}
            </span>
            <ChevronRight size={16} color="rgba(245, 239, 224, 0.25)" />
          </button>
        ))}

        <div className="pt-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(245, 239, 224, 0.35)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Compliance Center
          </p>
          <div className="space-y-2">
            {policyItems.map((item) => (
              <button
                key={item.type}
                className="w-full rounded-2xl border p-4 text-left"
                style={{ backgroundColor: 'rgba(0, 180, 166, 0.06)', borderColor: 'rgba(0, 180, 166, 0.16)' }}
                onClick={() => setActivePolicy(item.type)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-5" style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight size={16} color="#00B4A6" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          className="w-full flex items-center gap-4 p-4 rounded-xl mt-4 active:scale-98 transition-transform"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
          }}
          onClick={handleLogout}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}>
            <LogOut size={18} color="#EF4444" />
          </div>
          <span className="text-sm font-medium" style={{ color: '#EF4444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Log Out
          </span>
        </button>
      </div>

      {activePolicy ? <PolicyModal initialType={activePolicy} onClose={() => setActivePolicy(null)} /> : null}
    </div>
  );
};
