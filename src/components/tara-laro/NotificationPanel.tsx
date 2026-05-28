import React from 'react';
import { X, CheckCircle, Clock, Users, AlertCircle } from 'lucide-react';
import { Notification } from '@/types/game';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onGameClick: (gameId: string) => void;
}

const notifIcons = {
  accepted: { icon: CheckCircle, color: '#22C55E' },
  rejected: { icon: AlertCircle, color: '#EF4444' },
  reminder: { icon: Clock, color: '#F4722B' },
  join_request: { icon: Users, color: '#00B4A6' },
  system: { icon: AlertCircle, color: '#F5EFE0' },
  security: { icon: AlertCircle, color: '#F4722B' },
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onGameClick,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 fade-in" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-80 z-50 flex flex-col fade-in"
        style={{
          backgroundColor: '#0D1B2A',
          borderLeft: '1px solid rgba(245, 239, 224, 0.1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(245, 239, 224, 0.08)' }}
        >
          <div>
            <h2
              className="text-lg font-black"
              style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Notifications
            </h2>
            {unreadCount > 0 && (
              <p
                className="text-xs"
                style={{ color: 'rgba(245, 239, 224, 0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {unreadCount} unread
              </p>
            )}
          </div>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)' }}
            onClick={onClose}
          >
            <X size={18} color="#F5EFE0" />
          </button>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <span className="text-4xl">🔔</span>
              <p
                className="text-sm"
                style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {notifications.map((notif) => {
                const { icon: Icon, color } = notifIcons[notif.type];
                return (
                  <button
                    key={notif.id}
                    className="w-full flex items-start gap-3 p-4 rounded-xl text-left active:scale-98 transition-all"
                    style={{
                      backgroundColor: notif.read
                        ? 'rgba(245, 239, 224, 0.03)'
                        : 'rgba(244, 114, 43, 0.06)',
                      border: notif.read
                        ? '1px solid rgba(245, 239, 224, 0.06)'
                        : '1px solid rgba(244, 114, 43, 0.15)',
                    }}
                    onClick={() => onGameClick(notif.gameId)}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon size={16} color={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold mb-0.5"
                        style={{
                          color: notif.read ? 'rgba(245, 239, 224, 0.7)' : '#F5EFE0',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {notif.message}
                      </p>
                      <p
                        className="text-xs truncate"
                        style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {notif.gameTitle}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'rgba(245, 239, 224, 0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {notif.time}
                      </p>
                    </div>
                    {!notif.read && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: '#F4722B' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
