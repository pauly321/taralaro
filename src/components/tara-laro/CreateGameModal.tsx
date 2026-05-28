import React, { useMemo, useState } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createGame as createGameRequest } from '@/lib/phase1Api';
import { CreateGameFormValues, createGameSchema, toCreateGamePayload } from '@/lib/validation/game';
import { Game } from '@/types/game';

interface CreateGameModalProps {
  onClose: () => void;
  onSubmit: (game: Game) => void;
}

type FieldErrorMap = Partial<Record<keyof CreateGameFormValues, string>>;

const initialForm: CreateGameFormValues = {
  title: '',
  courtName: '',
  sport: 'basketball',
  date: '',
  time: '',
  location: '',
  barangay: '',
  city: '',
  slots: '10',
  entryFee: '',
  description: '',
  imageUrl: '',
};

export const CreateGameModal: React.FC<CreateGameModalProps> = ({ onClose, onSubmit }) => {
  const { accessToken, user } = useAuth();
  const [form, setForm] = useState<CreateGameFormValues>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  const inlineError = useMemo(
    () => Object.values(fieldErrors).find(Boolean) || requestError,
    [fieldErrors, requestError]
  );

  const handleChange = <K extends keyof CreateGameFormValues>(field: K, value: CreateGameFormValues[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setRequestError('');
  };

  const handleSubmit = async () => {
    if (!accessToken) {
      setRequestError('Your session expired. Please sign in again.');
      return;
    }

    if (!isOrganizer) {
      setRequestError('Only organizers and admins can post games.');
      return;
    }

    const parsed = createGameSchema.safeParse(form);

    if (!parsed.success) {
      const nextErrors: FieldErrorMap = {};

      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CreateGameFormValues | undefined;
        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      });

      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setRequestError('');
    setIsSubmitting(true);

    try {
      const createdGame = await createGameRequest(accessToken, toCreateGamePayload(form));
      setSubmitted(true);
      setTimeout(() => {
        onSubmit(createdGame);
        onClose();
      }, 1200);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to create the game.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldError = (field: keyof CreateGameFormValues) => {
    if (!fieldErrors[field]) {
      return null;
    }

    return (
      <p className="mt-1 text-xs" style={{ color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {fieldErrors[field]}
      </p>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col max-w-md mx-auto" style={{ backgroundColor: '#0D1B2A' }}>
      <div className="flex items-center justify-between p-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(245, 239, 224, 0.08)' }}>
        <div>
          <h2 className="text-xl font-black" style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Post a Game
          </h2>
          <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Validated organizer-only flow with audit-ready submission.
          </p>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)' }} onClick={onClose}>
          <X size={18} color="#F5EFE0" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'rgba(0, 180, 166, 0.08)', borderColor: 'rgba(0, 180, 166, 0.22)' }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} color="#00B4A6" />
            <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Phase 1 checks role access, required fields, and normalized game data before create.
            </p>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Sport</label>
          <div className="flex gap-3">
            {['basketball', 'volleyball'].map((sport) => (
              <button
                key={sport}
                className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
                style={{
                  backgroundColor: form.sport === sport ? (sport === 'basketball' ? '#F4722B' : '#00B4A6') : 'rgba(245, 239, 224, 0.06)',
                  color: form.sport === sport ? '#fff' : 'rgba(245, 239, 224, 0.5)',
                  border: `1px solid ${form.sport === sport ? 'transparent' : 'rgba(245, 239, 224, 0.12)'}`,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onClick={() => handleChange('sport', sport as CreateGameFormValues['sport'])}
              >
                {sport === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Game Title *</label>
          <input style={inputStyle} placeholder="e.g. Sunday Streetball Showdown" value={form.title} onChange={(e) => handleChange('title', e.target.value)} />
          {renderFieldError('title')}
        </div>

        <div>
          <label style={labelStyle}>Court Name *</label>
          <input style={inputStyle} placeholder="e.g. Barangay 638 Basketball Court" value={form.courtName} onChange={(e) => handleChange('courtName', e.target.value)} />
          {renderFieldError('courtName')}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Date *</label>
            <input style={inputStyle} type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} />
            {renderFieldError('date')}
          </div>
          <div>
            <label style={labelStyle}>Time *</label>
            <input style={inputStyle} type="time" value={form.time} onChange={(e) => handleChange('time', e.target.value)} />
            {renderFieldError('time')}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Location / Landmark *</label>
          <input style={inputStyle} placeholder="e.g. Covered court beside barangay hall" value={form.location} onChange={(e) => handleChange('location', e.target.value)} />
          {renderFieldError('location')}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Barangay *</label>
            <input style={inputStyle} placeholder="e.g. Brgy. 638" value={form.barangay} onChange={(e) => handleChange('barangay', e.target.value)} />
            {renderFieldError('barangay')}
          </div>
          <div>
            <label style={labelStyle}>City *</label>
            <input style={inputStyle} placeholder="e.g. Manila" value={form.city} onChange={(e) => handleChange('city', e.target.value)} />
            {renderFieldError('city')}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Total Player Slots</label>
          <div className="flex gap-2 flex-wrap">
            {['6', '8', '10', '12', '14'].map((slots) => (
              <button
                key={slots}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
                style={{
                  minWidth: '18%',
                  backgroundColor: form.slots === slots ? '#F4722B' : 'rgba(245, 239, 224, 0.06)',
                  color: form.slots === slots ? '#fff' : 'rgba(245, 239, 224, 0.5)',
                  border: `1px solid ${form.slots === slots ? 'transparent' : 'rgba(245, 239, 224, 0.12)'}`,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onClick={() => handleChange('slots', slots)}
              >
                {slots}
              </button>
            ))}
          </div>
          {renderFieldError('slots')}
        </div>

        <div>
          <label style={labelStyle}>Entry Fee (PHP)</label>
          <input style={inputStyle} placeholder="Leave blank for free" type="number" value={form.entryFee} onChange={(e) => handleChange('entryFee', e.target.value)} />
          {renderFieldError('entryFee')}
        </div>

        <div>
          <label style={labelStyle}>Image URL (optional)</label>
          <input style={inputStyle} placeholder="https://example.com/game.jpg" value={form.imageUrl || ''} onChange={(e) => handleChange('imageUrl', e.target.value)} />
          {renderFieldError('imageUrl')}
        </div>

        <div>
          <label style={labelStyle}>Description (optional)</label>
          <textarea style={{ ...inputStyle, resize: 'none', minHeight: 90 }} placeholder="Tell players what to expect..." value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={4} />
          {renderFieldError('description')}
        </div>

        {inlineError ? (
          <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.24)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {inlineError}
          </div>
        ) : null}
      </div>

      <div className="p-5 flex-shrink-0" style={{ borderTop: '1px solid rgba(245, 239, 224, 0.08)' }}>
        {submitted ? (
          <div className="w-full py-4 rounded-2xl flex items-center justify-center gap-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E' }}>
            <Check size={20} color="#22C55E" />
            <span className="font-bold" style={{ color: '#22C55E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Game Posted Securely
            </span>
          </div>
        ) : (
          <button
            className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95"
            style={{
              backgroundColor: isOrganizer ? '#F4722B' : 'rgba(244, 114, 43, 0.3)',
              color: isOrganizer ? '#fff' : 'rgba(255,255,255,0.4)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: isOrganizer ? '0 8px 24px rgba(244, 114, 43, 0.35)' : 'none',
              cursor: isOrganizer ? 'pointer' : 'not-allowed',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onClick={handleSubmit}
            disabled={!isOrganizer || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Post Game'}
          </button>
        )}
      </div>
    </div>
  );
};
