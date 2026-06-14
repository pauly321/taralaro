import React, { useEffect, useMemo, useState } from 'react';
import {MapContainer as LeafletMapContainer,TileLayer as LeafletTileLayer, Marker, useMapEvents, useMap} from 'react-leaflet';
import { Check, ShieldCheck, X, Calendar, Clock3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  createGame as createGameRequest,
  updateGame as updateGameRequest,
} from '@/lib/phase1Api';
import { CreateGameFormValues, createGameSchema, toCreateGamePayload } from '@/lib/validation/game';
import { Game } from '@/types/game';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';


const MapContainer = LeafletMapContainer as any;
const TileLayer = LeafletTileLayer as any;

interface CreateGameModalProps {
  onClose: () => void;
  onSubmit?: (game: Game) => void;
  mode?: 'create' | 'edit';
  game?: Game;
  onUpdated?: (game: Game) => void;
}

type FieldErrorMap = Partial<Record<keyof CreateGameFormValues, string>>;

const initialForm: CreateGameFormValues = {
  title: '',
  courtName: '',
  sport: 'basketball',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  barangay: '',
  city: '',
  latitude: '',
  longitude: '',
  slots: '10',
  entryFee: '',
  description: '',
  imageUrl: '',
};

function LocationPicker({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      setPosition([lat, lng]);
      onPick(lat, lng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);

  return null;
}

  export const CreateGameModal: React.FC<CreateGameModalProps> = ({
      onClose,
      onSubmit,
      mode = 'create',
      game,
      onUpdated,
    }) => {

  const { accessToken, user } = useAuth();
  const [form, setForm] = useState<CreateGameFormValues>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([14.676, 121.0437]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);


  useEffect(() => {
    if (mode !== 'edit' || !game) return;
  
    const nextForm: CreateGameFormValues = {
      title: game.title,
      courtName: game.courtName,
      sport: game.sport,
      date: '',
      startTime: game.time,
      endTime: game.endTime,
      location: game.location,
      barangay: game.barangay,
      city: game.city,
      latitude: String(game.latitude ?? ''),
      longitude: String(game.longitude ?? ''),
      slots: String(game.slotsTotal),
      entryFee: game.entryFee === null ? '' : String(game.entryFee),
      description: game.description ?? '',
      imageUrl: game.imageUrl ?? '',
    };
  
    setForm(nextForm);
  
    if (game.latitude && game.longitude) {
      setMapCenter([game.latitude, game.longitude]);
    }
  
    if (game.date) {
      setSelectedDate(new Date(game.date));
    }
  }, [mode, game]);

  useEffect(() => {
  if (mode === 'edit') return;

  navigator.geolocation?.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
  
        setMapCenter(coords);
        handleChange('latitude', String(coords[0]));
        handleChange('longitude', String(coords[1]));
      },
      () => {
        setMapCenter([14.676, 121.0437]);
      }
    );
  }, []);

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
      setRequestError(
        mode === 'edit'
          ? 'Only organizers and admins can edit games.'
          : 'Only organizers and admins can post games.'
      );
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
      const payload = toCreateGamePayload(form);
    
      if (mode === 'edit') {
        if (!game) {
          setRequestError('No game selected for editing.');
          setIsSubmitting(false);
          return;
        }
    
        const updatedGame = await updateGameRequest(
          accessToken,
          game.id,
          payload
        );
    
        setSubmitted(true);
    
        setTimeout(() => {
          if (onUpdated) {
            onUpdated(updatedGame);
          }
    
          onClose();
        }, 1200);
      } else {
        const createdGame = await createGameRequest(
          accessToken,
          payload
        );
    
        setSubmitted(true);
    
        setTimeout(() => {
          if (onSubmit) {
            onSubmit(createdGame);
          }
    
          onClose();
        }, 1200);
      }
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
          {mode === 'edit' ? 'Edit Game' : 'Post a Game'}
          </h2>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)' }} onClick={onClose}>
          <X size={18} color="#F5EFE0" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-5">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'rgba(0, 180, 166, 0.08)', borderColor: 'rgba(0, 180, 166, 0.22)' }}>
          <div className="flex items-center gap-2">
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

        <div className="space-y-4">
  {/* Date */}
  <div className="space-y-4">
  <div>
    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-[#F5EFE0]/60">
      Date *
    </label>

    <div className="relative w-full">
  <DatePicker
    selected={selectedDate}
    onChange={(date) => {
      setSelectedDate(date);

      if (date) {
        const formatted = date.toISOString().split('T')[0];
        handleChange('date', formatted);
      }
    }}
    dateFormat="MMMM d, yyyy"
    placeholderText="Select game date"
    wrapperClassName="w-full"
    className="w-full rounded-3xl border border-white/10 bg-white/5 px-5 py-4 pr-12 text-[#F5EFE0]"
  />

  <Calendar
    size={18}
    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#CDAA7D]"
  />
</div>

    {renderFieldError('date')}
  </div>

  <div>
    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-[#F5EFE0]/60">
      Game Schedule *
    </label>

    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <input
          type="time"
          value={form.startTime}
          onChange={(e) => handleChange('startTime', e.target.value)}
          className="w-full rounded-3xl border border-white/10 bg-white/5 px-5 py-4 pr-12 text-[#F5EFE0]"
        />

        <Clock3
          size={18}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#CDAA7D]"
        />
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#CDAA7D]">
        →
      </div>

      <div className="relative flex-1">
        <input
          type="time"
          value={form.endTime}
          onChange={(e) => handleChange('endTime', e.target.value)}
          className="w-full rounded-3xl border border-white/10 bg-white/5 px-5 py-4 pr-12 text-[#F5EFE0]"
        />

        <Clock3
          size={18}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#CDAA7D]"
        />
      </div>
    </div>

    <div className="mt-2 flex justify-between text-xs text-[#F5EFE0]/50">
      <span>Start Time</span>
      <span>End Time</span>
    </div>

    {renderFieldError('startTime')}
    {renderFieldError('endTime')}
  </div>
</div>
</div>

        <div>
          <label style={labelStyle}>Location / Landmark *</label>
          <input style={inputStyle} placeholder="e.g. Covered court beside barangay hall" value={form.location} onChange={(e) => handleChange('location', e.target.value)} />
          {renderFieldError('location')}
        </div>

        <div>
  <label style={labelStyle}>Pin Court Location *</label>

  <MapContainer
  center={mapCenter}
  zoom={13}
  style={{ height: 250, width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}
>
<RecenterMap center={mapCenter}/>

<TileLayer
  attribution="Tiles © Esri"
  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
/>

<TileLayer
  attribution="Esri"
  url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
/>

    <LocationPicker
      onPick={(lat, lng) => {
        handleChange('latitude', String(lat));
        handleChange('longitude', String(lng));
      }}
    />
  </MapContainer>

  {form.latitude && form.longitude && (
    <p className="mt-2 text-xs" style={{ color: 'rgba(245,239,224,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      Selected: {form.latitude}, {form.longitude}
    </p>
  )}

  {renderFieldError('latitude')}
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

          <input
            type="number"
            min="6"
            max="50"
            value={form.slots}
            onChange={(e) => handleChange('slots', e.target.value)}
            placeholder="Enter total slots"
            style={inputStyle}
          />

          <p
            className="mt-2 text-xs"
            style={{
              color: 'rgba(245, 239, 224, 0.4)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Minimum 6 players • Maximum 50 players
          </p>

          {renderFieldError('slots')}
        </div>

        <div>
          <label style={labelStyle}>Entry Fee (PHP)</label>
          <input style={inputStyle} placeholder="Leave blank for free" type="number" value={form.entryFee} onChange={(e) => handleChange('entryFee', e.target.value)} />
          {renderFieldError('entryFee')}
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
              <div
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid #22C55E',
                }}
              >
                <Check size={20} color="#22C55E" />
                <span
                  className="font-bold"
                  style={{
                    color: '#22C55E',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {mode === 'edit' ? 'Game Updated' : 'Game Posted Securely'}
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
            {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Post Game'}
          </button>
        )}
      </div>
    </div>
  );
};
