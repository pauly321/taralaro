import React, { useEffect, useMemo, useState } from 'react';
import { FileCheck2, Shield, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { acceptPolicy, fetchPolicies } from '@/lib/phase1Api';
import { PolicyDocument, PolicyType } from '@/types/game';

interface PolicyModalProps {
  initialType?: PolicyType;
  onClose: () => void;
}

const tabLabels: Record<PolicyType, string> = {
  privacy: 'Privacy',
  terms: 'Terms',
  community_rules: 'Community Rules',
};

export const PolicyModal: React.FC<PolicyModalProps> = ({ initialType = 'privacy', onClose }) => {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [activeType, setActiveType] = useState<PolicyType>(initialType);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetchPolicies()
      .then((items) => {
        if (isMounted) {
          setPolicies(items);
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load policy documents.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activePolicy = useMemo(
    () => policies.find((policy) => policy.policyType === activeType) || policies[0],
    [activeType, policies]
  );

  const handleAcknowledge = async () => {
    if (!accessToken || !activePolicy) {
      return;
    }

    setError('');
    setStatus('Saving acknowledgment...');

    try {
      await acceptPolicy(accessToken, activePolicy.id);
      setStatus(`Acknowledged ${activePolicy.title}.`);
    } catch (ackError) {
      setStatus('');
      setError(ackError instanceof Error ? ackError.message : 'Unable to save acknowledgment.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-2xl rounded-[32px] border" style={{ backgroundColor: '#0D1B2A', borderColor: 'rgba(245, 239, 224, 0.12)' }}>
          <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: 'rgba(245, 239, 224, 0.08)' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Policy Center
              </p>
              <h2 className="mt-2 text-2xl font-black" style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Privacy, terms, and community safety
              </h2>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)' }} onClick={onClose}>
              <X size={18} color="#F5EFE0" />
            </button>
          </div>

          <div className="border-b px-5 py-4" style={{ borderColor: 'rgba(245, 239, 224, 0.08)' }}>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(tabLabels) as PolicyType[]).map((type) => {
                const isActive = activeType === type;
                return (
                  <button
                    key={type}
                    className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide"
                    style={{
                      backgroundColor: isActive ? '#F4722B' : 'rgba(245, 239, 224, 0.06)',
                      border: `1px solid ${isActive ? '#F4722B' : 'rgba(245, 239, 224, 0.12)'}`,
                      color: isActive ? '#fff' : 'rgba(245, 239, 224, 0.6)',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                    onClick={() => setActiveType(type)}
                  >
                    {tabLabels[type]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
            {isLoading ? (
              <p style={{ color: 'rgba(245, 239, 224, 0.55)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading policy documents...</p>
            ) : activePolicy ? (
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(0, 180, 166, 0.15)' }}>
                    <Shield size={20} color="#00B4A6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black" style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                      {activePolicy.title}
                    </h3>
                    <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Version {activePolicy.versionLabel} · Published {activePolicy.publishedAt}
                    </p>
                  </div>
                </div>

                <pre
                  className="whitespace-pre-wrap rounded-3xl border p-5 text-sm leading-7"
                  style={{
                    backgroundColor: 'rgba(245, 239, 224, 0.04)',
                    borderColor: 'rgba(245, 239, 224, 0.08)',
                    color: 'rgba(245, 239, 224, 0.82)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {activePolicy.content}
                </pre>
              </div>
            ) : (
              <p style={{ color: 'rgba(245, 239, 224, 0.55)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No policy documents available yet.</p>
            )}

            {error ? (
              <div className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.24)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {error}
              </div>
            ) : null}
            {status ? (
              <div className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.24)', color: '#86EFAC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {status}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-5 py-4" style={{ borderColor: 'rgba(245, 239, 224, 0.08)' }}>
            <p className="text-xs" style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Phase 1 stores policy acknowledgments for audit review.
            </p>
            <button
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold"
              style={{ backgroundColor: '#00B4A6', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onClick={handleAcknowledge}
              disabled={!accessToken || !activePolicy}
            >
              <FileCheck2 size={16} />
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
