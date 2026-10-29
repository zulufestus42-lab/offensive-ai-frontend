import { useEffect, useRef, useState } from 'react';
import { getEngagement } from '../../lib/redteam.js';

export default function PendingReview({ engagement, onChange, rejected = false }) {
  const [checking, setChecking] = useState(false);
  const timer = useRef(null);

  async function refresh() {
    setChecking(true);
    try {
      const e = await getEngagement(engagement.id);
      // keep verification/token we stored locally, refresh status fields
      onChange({ ...engagement, ...e });
    } catch {
      /* transient */
    } finally {
      setChecking(false);
    }
  }

  // Poll every 12s while awaiting review.
  useEffect(() => {
    if (rejected) return undefined;
    timer.current = setInterval(refresh, 12000);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejected]);

  if (rejected) {
    return (
      <div className="mx-auto max-w-[520px]">
        <div className="rounded-2xl border border-danger/40 bg-panel p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger text-xl">✕</div>
          <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">Authorization declined</h1>
          <p className="mx-auto mt-2 max-w-[400px] text-sm text-fg2">
            This engagement for <span className="font-mono text-fg">{engagement.domain}</span> was not approved, so
            scanning stays locked. If you believe this is a mistake, submit a new request with corrected details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[520px]">
      <div className="rounded-2xl border border-line bg-panel p-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-line2">
          <span className="live" />
        </div>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">Awaiting human review</h1>
        <p className="mx-auto mt-2 max-w-[420px] text-sm text-fg2">
          Ownership of <span className="font-mono text-fg">{engagement.domain}</span> is verified. A reviewer now
          confirms the authorization before any active scan can run — this is the human-in-the-loop step, within one
          business day.
        </p>

        <div className="mx-auto mt-6 grid max-w-[360px] grid-cols-2 gap-4 text-left">
          <div>
            <div className="text-[11px] text-mute">Ownership</div>
            <div className="mt-1 text-sm text-fg">✓ Verified</div>
          </div>
          <div>
            <div className="text-[11px] text-mute">Review status</div>
            <div className="mt-1 text-sm text-fg capitalize">{engagement.review_status || 'pending'}</div>
          </div>
          {engagement.signer_name && (
            <div>
              <div className="text-[11px] text-mute">Signer</div>
              <div className="mt-1 text-sm text-fg">{engagement.signer_name}</div>
            </div>
          )}
          <div>
            <div className="text-[11px] text-mute">Engagement</div>
            <div className="mt-1 font-mono text-sm text-fg">#{engagement.id}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={checking}
          className="mt-7 h-10 rounded-lg border border-line2 bg-panel px-5 text-[13.5px] font-medium text-fg hover:bg-chip disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Check status now'}
        </button>
        <p className="mt-4 font-mono text-[11px] text-mute">this page checks automatically every few seconds</p>
      </div>
    </div>
  );
}
