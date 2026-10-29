import { useEffect, useState } from 'react';
import { clock, pct } from '../lib/format.js';

export default function RequestLog({ logs, freshId, onSearch, onExport }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => onSearch(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text, onSearch]);

  const exportCsv = async () => {
    setBusy(true);
    try {
      await onExport();
    } catch (e) {
      console.warn('[export]', e.message);
    } finally {
      setBusy(false);
    }
  };

  // A row is a network-reputation block when the shared intel flagged the actor.
  // We detect it from the attack label (persists in history) or a live flag.
  const isNetwork = (l) => l.networkFlagged === true || /network-flagged/i.test(l.attackType || '');

  return (
    <section className="overflow-hidden rounded-[10px] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="m-0 text-[15px] font-medium">Request log</h2>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="logsearch" className="sr-only">
            Search logs
          </label>
          <input
            id="logsearch"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search IP, country, attack"
            className="h-9 w-60 rounded-md border border-line2 bg-bg px-3 text-[13px] text-fg outline-none focus:border-fg2"
          />
          <button type="button" onClick={exportCsv} disabled={busy} className="h-9 rounded-md border border-line2 bg-panel px-3.5 text-[13px] text-fg disabled:opacity-60">
            {busy ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="logrow py-2.5 font-mono text-[11px] tracking-[.04em] text-mute">
            <span>TIME</span>
            <span>SOURCE IP</span>
            <span>ORIGIN</span>
            <span>ATTACK</span>
            <span>SIGNATURE</span>
            <span>CONFIDENCE</span>
            <span>ACTION</span>
          </div>
          {logs.length === 0 && <div className="border-t border-line px-5 py-6 text-[13px] text-mute">No requests match.</div>}
          {logs.map((l) => (
            <div key={l.id} className={`logrow ${l.id === freshId ? 'new' : ''}`}>
              <span className="font-mono text-fg2">{clock(l.time)}</span>
              <span className="font-mono">{l.ip ?? '—'}</span>
              <span>{l.country ?? 'Unknown'}</span>
              <span>{l.attackType}</span>
              <span className="truncate font-mono text-fg2" title={l.signature ?? ''}>
                {l.signature ?? '—'}
              </span>
              <span className="font-mono">{pct(l.confidence)}</span>
              <span>
                {isNetwork(l) ? (
                  <span
                    title="Blocked by shared network intelligence — this attacker was flagged elsewhere first"
                    style={{
                      display: 'inline-block',
                      background: '#0B7A4C',
                      color: '#E9FBF2',
                      fontFamily: "'Geist Mono', ui-monospace, monospace",
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '.06em',
                      padding: '3px 9px',
                      borderRadius: '6px',
                    }}
                  >
                    NETWORK
                  </span>
                ) : (
                  <span className={`pill ${l.action.toLowerCase()}`}>{l.action}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
