import React, { useState } from 'react';
import { AlertTriangle, Send, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { submitReport } from '@/lib/phase1Api';
import { createReportSchema } from '@/lib/validation/game';
import { Game, ReportCategory } from '@/types/game';

interface ReportIssueModalProps {
  game: Game;
  onClose: () => void;
}

const categories: Array<{ value: ReportCategory; label: string }> = [
  { value: 'fraud', label: 'Fraud' },
  { value: 'unsafe_behavior', label: 'Unsafe Behavior' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ game, onClose }) => {
  const { accessToken } = useAuth();
  const [category, setCategory] = useState<ReportCategory>('unsafe_behavior');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!accessToken) {
      setError('You must be signed in to submit a report.');
      return;
    }

    const parsed = createReportSchema.safeParse({ category, description });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please review the report details.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await submitReport(accessToken, {
        targetType: 'game',
        targetId: game.id,
        category,
        description: parsed.data.description,
      });

      setStatus(response.message);
      setTimeout(onClose, 1400);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[32px] border px-5 py-5" style={{ backgroundColor: '#0D1B2A', borderColor: 'rgba(245, 239, 224, 0.12)' }}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert size={18} color="#F4722B" />
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: '#F4722B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Report Issue
              </p>
            </div>
            <h3 className="text-xl font-black" style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Flag this game for review
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'rgba(245, 239, 224, 0.55)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Reports are logged for compliance review and sent to the admin queue.
            </p>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)' }} onClick={onClose}>
            <X size={18} color="#F5EFE0" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border p-4" style={{ backgroundColor: 'rgba(245, 239, 224, 0.04)', borderColor: 'rgba(245, 239, 224, 0.08)' }}>
          <p className="text-sm font-bold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{game.title}</p>
          <p className="mt-1 text-xs" style={{ color: 'rgba(245, 239, 224, 0.48)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{game.date} · {game.time} · {game.city}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(245, 239, 224, 0.48)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Report Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="rounded-2xl border px-3 py-3 text-sm font-bold"
                  style={{
                    backgroundColor: category === item.value ? '#F4722B' : 'rgba(245, 239, 224, 0.04)',
                    borderColor: category === item.value ? '#F4722B' : 'rgba(245, 239, 224, 0.12)',
                    color: category === item.value ? '#fff' : 'rgba(245, 239, 224, 0.68)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                  onClick={() => setCategory(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(245, 239, 224, 0.48)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              What happened?
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ backgroundColor: 'rgba(245, 239, 224, 0.06)', borderColor: 'rgba(245, 239, 224, 0.12)', color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the concern so the admin team can review it quickly."
            />
          </div>

          {error ? (
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.24)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div className="flex items-center gap-2"><AlertTriangle size={16} />{error}</div>
            </div>
          ) : null}
          {status ? (
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.24)', color: '#86EFAC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {status}
            </div>
          ) : null}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold"
            style={{ backgroundColor: '#F4722B', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: isSubmitting ? 0.7 : 1 }}
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <Send size={16} />
            {isSubmitting ? 'Submitting Report...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </>
  );
};
