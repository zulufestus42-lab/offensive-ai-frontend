import { clock, latLabel, lonLabel, num, sentence } from '../lib/format.js';

export default function OriginPanel({ origins, selected, latest, onPick }) {
  const s = selected;
  const seen = !s ? '—' : latest?.countryCode === s.cc ? 'just now' : s.lastSeen ? clock(s.lastSeen) : '—';

  return (
    <div className="box-border flex min-w-0 flex-[1_1_280px] flex-col gap-4 p-4">
      <div className="rounded-lg border border-line p-4">
        {s ? (
          <>
            <div className="flex items-baseline justify-between font-mono text-[11px] text-mute">
              <span>{s.cc} · SELECTED</span>
              <span>
                {latLabel(s.lat)}, {lonLabel(s.lon)}
              </span>
            </div>
            <div className="mt-2 text-xl font-medium tracking-[-0.01em]">{s.name}</div>
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              <Stat label="Blocked · 24h" value={num(s.blocked)} big />
              <Stat label="Top attack" value={sentence(s.topAttack)} />
              <Stat label="Unique IPs" value={num(s.uniqueIps)} big />
              <Stat label="Last seen" value={seen} mono />
            </div>
          </>
        ) : (
          <div className="text-[13px] text-mute">No blocked traffic in the last 24 hours.</div>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="px-2.5 pb-1.5 text-xs text-mute">Origins · last 24h</div>
        {origins.map((o) => (
          <button key={o.cc} type="button" className={`orow ${s?.cc === o.cc ? 'sel' : ''}`} onClick={() => onPick(o.cc)} aria-pressed={s?.cc === o.cc}>
            <span className="font-mono text-[11px] text-mute">{o.cc}</span>
            <span>{o.name}</span>
            <span className="font-mono text-fg2">{num(o.blocked)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, big, mono }) {
  return (
    <div>
      <div className="text-[11px] text-mute">{label}</div>
      <div className={big ? 'mt-1 text-lg tabular-nums' : `mt-1.5 text-sm ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
