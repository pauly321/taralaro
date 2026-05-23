import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface CreateGameModalProps {
  onClose: () => void;
  onSubmit: () => void;
}

export const CreateGameModal: React.FC<CreateGameModalProps> = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({
    title: '',
    courtName: '',
    sport: 'basketball',
    date: '',
    time: '',
    location: '',
    slots: '10',
    entryFee: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid =
    form.title.trim() &&
    form.courtName.trim() &&
    form.date &&
    form.time &&
    form.location.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    setSubmitted(true);
    setTimeout(() => {
      onSubmit();
      onClose();
    }, 1500);
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'rgba(245, 239, 224, 0.06)',
    border: '1px solid rgba(245, 239, 224, 0.12)',
    color: '#F5EFE0',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 14,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    width: '100%',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    color: 'rgba(245, 239, 224, 0.5)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col max-w-md mx-auto" style={{ backgroundColor: '#0D1B2A' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(245, 239, 224, 0.08)' }}
      >
        <div>
          <h2
            className="text-xl font-black"
            style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Post a Game
          </h2>
          <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Create a new pickup game
          </p>
        </div>
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)' }}
          onClick={onClose}
        >
          <X size={18} color="#F5EFE0" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Sport toggle */}
        <div>
          <label style={labelStyle}>Sport</label>
          <div className="flex gap-3">
            {['basketball', 'volleyball'].map((s) => (
              <button
                key={s}
                className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
                style={{
                  backgroundColor: form.sport === s
                    ? (s === 'basketball' ? '#F4722B' : '#00B4A6')
                    : 'rgba(245, 239, 224, 0.06)',
                  color: form.sport === s ? '#fff' : 'rgba(245, 239, 224, 0.5)',
                  border: `1px solid ${form.sport === s ? 'transparent' : 'rgba(245, 239, 224, 0.12)'}`,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onClick={() => handleChange('sport', s)}
              >
                {s === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
              </button>
            ))}
          </div>
        </div>

        {/* Game title */}
        <div>
          <label style={labelStyle}>Game Title *</label>
          <input
            style={inputStyle}
            placeholder="e.g. Sunday Streetball Showdown"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
          />
        </div>

        {/* Court name */}
        <div>
          <label style={labelStyle}>Court Name *</label>
          <input
            style={inputStyle}
            placeholder="e.g. Barangay 638 Basketball Court"
            value={form.courtName}
            onChange={(e) => handleChange('courtName', e.target.value)}
          />
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Date *</label>
            <input
              style={inputStyle}
              type="date"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Time *</label>
            <input
              style={inputStyle}
              type="time"
              value={form.time}
              onChange={(e) => handleChange('time', e.target.value)}
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label style={labelStyle}>Location / Barangay *</label>
          <input
            style={inputStyle}
            placeholder="e.g. Brgy. 638, Sampaloc, Manila"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
          />
        </div>

        {/* Slots */}
        <div>
          <label style={labelStyle}>Total Player Slots</label>
          <div className="flex gap-2">
            {['6', '8', '10', '12', '14'].map((n) => (
              <button
                key={n}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
                style={{
                  backgroundColor: form.slots === n ? '#F4722B' : 'rgba(245, 239, 224, 0.06)',
                  color: form.slots === n ? '#fff' : 'rgba(245, 239, 224, 0.5)',
                  border: `1px solid ${form.slots === n ? 'transparent' : 'rgba(245, 239, 224, 0.12)'}`,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onClick={() => handleChange('slots', n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Entry fee */}
        <div>
          <label style={labelStyle}>Entry Fee (₱) — leave blank for FREE</label>
          <input
            style={inputStyle}
            placeholder="e.g. 50 (or leave blank for FREE)"
            type="number"
            value={form.entryFee}
            onChange={(e) => handleChange('entryFee', e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description (optional)</label>
          <textarea
            style={{ ...inputStyle, resize: 'none', minHeight: 80 }}
            placeholder="Tell players what to expect..."
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="p-5 flex-shrink-0" style={{ borderTop: '1px solid rgba(245, 239, 224, 0.08)' }}>
        {submitted ? (
          <div
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E' }}
          >
            <Check size={20} color="#22C55E" />
            <span className="font-bold" style={{ color: '#22C55E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Game Posted!
            </span>
          </div>
        ) : (
          <button
            className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95"
            style={{
              backgroundColor: isValid ? '#F4722B' : 'rgba(244, 114, 43, 0.3)',
              color: isValid ? '#fff' : 'rgba(255,255,255,0.4)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: isValid ? '0 8px 24px rgba(244, 114, 43, 0.35)' : 'none',
              cursor: isValid ? 'pointer' : 'not-allowed',
            }}
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Post Game 🏀
          </button>
        )}
      </div>
    </div>
  );
};
