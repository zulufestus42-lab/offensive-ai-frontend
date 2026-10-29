import { deltaVsYesterday, num, pct } from '../lib/format.js';

export default function KpiRow({ kpis }) {
  const k = kpis ?? {};
  const items = [
    { label: 'Requests scanned', value: num(k.requests), delta: kpis ? deltaVsYesterday(k.requests, k.requestsPrev) : '—' },
    { label: 'Threats blocked', value: num(k.blocked), delta: k.requests ? `${((k.blocked / k.requests) * 100).toFixed(2)}% of traffic` : '—' },
    { label: 'Unique source IPs', value: num(k.uniqueIps), delta: kpis ? `${num(k.newIps)} new today` : '—' },
    { label: 'Median confidence', value: pct(k.medianConfidence), delta: 'model v1 · /v1/scan' },
  ];
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-px overflow-hidden rounded-[10px] border border-line bg-line">
      {items.map((it) => (
        <div key={it.label} className="bg-panel p-5">
          <div className="text-xs text-mute">{it.label}</div>
          <div className="mt-2.5 text-[32px] font-medium tracking-[-0.02em] tabular-nums">{it.value}</div>
          <div className="mt-1.5 font-mono text-xs text-fg2">{it.delta}</div>
        </div>
      ))}
    </div>
  );
}
