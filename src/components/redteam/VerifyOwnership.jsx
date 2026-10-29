import { useState } from 'react';
import { verifyOwnership } from '../../lib/redteam.js';

function Copy({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-line2 bg-panel text-fg2 hover:text-fg"
      aria-label="Copy"
    >
      {done ? '✓' : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      )}
    </button>
  );
}

export default function VerifyOwnership({ engagement, onChange }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');

  const record = engagement.verification?.record || `_offai-verify.${engagement.domain}`;
  const value =
    engagement.verification?.value ||
    (engagement.verify_token ? `offai-site-verification=${engagement.verify_token}` : 'offai-site-verification=…');

  async function check() {
    setBusy(true);
    setHint('');
    try {
      const r = await verifyOwnership(engagement.id);
      if (r.ownership_verified) onChange({ ...engagement, ownership_verified: true });
      else setHint(r.hint || 'TXT record not found yet — DNS can take a few minutes to propagate.');
    } catch (e) {
      setHint(e.message || 'Verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="rounded-2xl border border-line bg-panel p-7">
        <div className="mb-4 font-mono text-[12px] tracking-wider text-danger">OWNERSHIP CHECK</div>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">Verify you control this target</h1>
        <p className="mt-2 text-sm text-fg2">
          Prove ownership of <span className="font-mono text-fg">{engagement.domain}</span> before red-team testing can be
          enabled. Add this DNS <span className="font-mono">TXT</span> record, then verify.
        </p>

        <div className="mt-5 text-[12.5px] text-mute">Record name</div>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line2 bg-bg p-2 pl-3">
          <span className="flex-1 break-all font-mono text-[13px] text-fg">{record}</span>
          <Copy text={record} />
        </div>

        <div className="mt-4 text-[12.5px] text-mute">Value</div>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line2 bg-bg p-2 pl-3">
          <span className="flex-1 break-all font-mono text-[13px] text-fg">{value}</span>
          <Copy text={value} />
        </div>

        {hint && (
          <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-line2 bg-chip px-3.5 py-3 text-[13px] text-fg2">
            <span className="h-[7px] w-[7px] flex-none rounded-full bg-mute" />
            {hint}
          </div>
        )}

        <div className="mt-6 flex items-center gap-2.5">
          <button
            type="button"
            onClick={check}
            disabled={busy}
            className="h-11 rounded-lg bg-danger px-5 text-[14.5px] font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Verify ownership'}
          </button>
        </div>

        <p className="mt-5 text-[11px] text-mute">
          For a sanctioned practice target you own (e.g. your own Juice Shop instance), an admin can confirm ownership
          directly instead of DNS. This check is logged against the engagement.
        </p>
      </div>
    </div>
  );
}
