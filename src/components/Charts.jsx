import { useEffect, useRef, useState } from 'react';
import { hourLabel, num, sentence } from '../lib/format.js';
import { useInView, useCountUp } from '../lib/animate.js';

// Chart accents — the trend line (yellow) and the raw line (gray) live only here,
// so nothing in the global theme changes. Red/critical reuses your --danger token.
const ACC = '#E2B714';
const RAWC = '#6E767C';

const Card = ({ children, className = '' }) => (
  <section className={`flex flex-col rounded-[10px] border border-line bg-panel p-5 ${className}`}>{children}</section>
);

// Catmull-Rom -> cubic bezier for a soft, confident trend curve.
function smoothPath(a, X, Y) {
  if (a.length < 2) return '';
  const p = a.map((v, i) => [X(i), Y(v)]);
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// ===================== Attacks per hour (line) =====================
export function HourlyChart({ hourly = [], blockRate }) {
  const [ref, seen] = useInView();
  const data = hourly.map((h) => Math.max(0, h.blocked || 0));
  const hasData = data.length > 1 && Math.max(...data) > 0;
  const maxV = Math.max(1, ...data);
  const total = data.reduce((a, b) => a + b, 0);
  const peakIdx = data.indexOf(Math.max(...data));
  const peakHour = hourly[peakIdx]?.hour;
  const smooth = data.map((_, i) => {
    let a = 0, c = 0;
    for (let k = -2; k <= 2; k++) { if (data[i + k] != null) { a += data[i + k]; c++; } }
    return c ? a / c : 0;
  });
  // critical = hours running at >= 80% of the peak-hour blocked volume
  const crit = data.map((v, i) => (v >= maxV * 0.8 ? i : -1)).filter((i) => i >= 0).slice(0, 10);

  const hasRate = typeof blockRate === 'number' && isFinite(blockRate);
  const totalAnim = useCountUp(total, seen && hasData);
  const rateAnim = useCountUp(hasRate ? blockRate : 0, seen && hasData, { decimals: 1 });

  const N = Math.max(2, data.length);
  const LW = 760, LH = 210, pl = 30, pr = 30, pt = 12, pb = 24;
  const yMax = maxV * 1.12;
  const X = (i) => pl + i * ((LW - pl - pr) / (N - 1));
  const Y = (v) => pt + (1 - v / yMax) * (LH - pt - pb);
  const rawPts = data.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const trendD = smoothPath(smooth, X, Y);

  const trendRef = useRef(null);
  const [len, setLen] = useState(0);
  useEffect(() => { if (trendRef.current && trendD) setLen(trendRef.current.getTotalLength()); }, [trendD]);
  const tickEvery = Math.max(1, Math.ceil(N / 4));

  return (
    <Card className="gap-4">
      <div ref={ref} className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-medium">Attacks per hour</h2>
        <span className="font-mono text-xs text-mute">{hasData && peakHour != null ? `peak ${hourLabel(peakHour)} · ${num(maxV)}` : 'peak —'}</span>
      </div>

      {!hasData && <div className="text-[13px] text-mute">No blocked traffic yet.</div>}

      {hasData && (
        <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center sm:gap-7">
          {/* stats — left column, fixed width so the plot never reflows while numbers tick */}
          <div className="flex flex-none gap-7 sm:w-[168px] sm:flex-col sm:gap-5">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] leading-none text-mute">blocked · 24h</span>
              <span className="inline-block text-[44px] font-semibold leading-none tracking-[-0.025em] tabular-nums" style={{ color: ACC }}>{Number(totalAnim).toLocaleString()}</span>
            </div>
            {hasRate && (
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] leading-none text-mute">block rate</span>
                <span className="inline-block text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-fg">{rateAnim}%</span>
              </div>
            )}
          </div>

          {/* plot — right, takes the remaining width */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex gap-4 font-mono text-[10.5px] text-fg2">
              <span className="inline-flex items-center gap-1.5"><i style={{ width: 13, height: 0, borderTop: `2px solid ${RAWC}` }} />raw / hr</span>
              <span className="inline-flex items-center gap-1.5"><i style={{ width: 13, height: 0, borderTop: `2px solid ${ACC}` }} />trend</span>
              <span className="inline-flex items-center gap-1.5"><i style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)' }} />critical · ≥80% peak</span>
            </div>

            <svg viewBox={`0 0 ${LW} ${LH}`} className="h-auto w-full overflow-visible" role="img"
              aria-label={`Attacks blocked per hour, total ${num(total)}, peak ${num(maxV)}`}>
              {[0, 1, 2, 3].map((k) => {
                const val = Math.round(yMax * k / 3), yy = Y(val);
                return <text key={k} x={pl - 7} y={yy + 3} textAnchor="end" fontFamily="var(--mono)" fontSize="9" fill="var(--mute)">{val}</text>;
              })}
              {hourly.map((h, i) => (i % tickEvery === 0
                ? <text key={i} x={X(i)} y={LH - 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--mute)">{hourLabel(h.hour)}</text>
                : null))}
              <text x="11" y={LH / 2} transform={`rotate(-90 11 ${LH / 2})`} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--mute)">attacks / hr</text>
              <text x={LW - 8} y={LH / 2} transform={`rotate(90 ${LW - 8} ${LH / 2})`} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--danger)">critical</text>
              <polyline points={rawPts} fill="none" stroke={RAWC} strokeWidth="1.25" opacity="0.8" strokeLinejoin="round" />
              <path ref={trendRef} d={trendD} fill="none" stroke={ACC} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"
                style={{ strokeDasharray: len || 1200, strokeDashoffset: seen ? 0 : (len || 1200), transition: 'stroke-dashoffset 1.3s ease-out' }} />
              {crit.map((i) => (
                <circle key={i} cx={X(i)} cy={Y(data[i])} r="3.4" fill="var(--danger)" stroke="var(--panel)" strokeWidth="1.2" />
              ))}
            </svg>
          </div>
        </div>
      )}
    </Card>
  );
}

// ===================== Attack types (donut) =====================
const DONUT_COLORS = [ACC, 'var(--danger)', 'var(--fg)', 'var(--fg2)', 'var(--mute)', RAWC];

export function AttackTypes({ types = [] }) {
  const [ref, seen] = useInView();
  const C = 2 * Math.PI * 15.915;
  const list = types.slice(0, 6);
  const top = list[0];
  const topPct = useCountUp(top ? top.pct : 0, seen);

  let cum = 0;
  const segs = list.map((t, i) => {
    const len = (t.pct / 100) * C;
    const off = -cum / 100 * C;
    cum += t.pct;
    return { ...t, len, off, color: DONUT_COLORS[i % DONUT_COLORS.length] };
  });

  return (
    <Card className="gap-3.5">
      <div ref={ref} className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-medium">Attack types</h2>
        <span className="font-mono text-xs text-mute">share of blocked</span>
      </div>

      {list.length === 0 && <div className="text-[13px] text-mute">No blocked traffic yet.</div>}

      {list.length > 0 && (
        <div className="flex items-center gap-5">
          <div className="relative flex-none" style={{ width: 140, height: 140 }}>
            <svg viewBox="0 0 42 42" className="h-full w-full">
              <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--line)" strokeWidth="5" />
              {segs.map((s, i) => (
                <circle key={i} cx="21" cy="21" r="15.915" fill="none" stroke={s.color} strokeWidth="5"
                  strokeDasharray={`${s.len} ${C}`}
                  strokeDashoffset={seen ? s.off : s.off + s.len}
                  transform="rotate(-90 21 21)"
                  style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)' }} />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[26px] font-semibold leading-none tabular-nums">{topPct}%</span>
              <span className="mt-1 text-center font-mono text-[9px] text-mute" style={{ maxWidth: 84 }}>{top ? sentence(top.name) : ''}</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {segs.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 text-[12.5px]">
                <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: s.color }} />
                <span className="flex-1 truncate text-fg2">{sentence(s.name)}</span>
                <span className="font-mono text-fg">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ===================== Model verdicts =====================
export function Verdicts({ verdicts }) {
  const [ref, seen] = useInView();
  const v = verdicts ?? { blocked: 0, review: 0, allowed: 0 };
  const rows = [
    { key: 'b', label: 'Blocked · confidence ≥ 70%', value: v.blocked || 0, color: 'var(--danger)' },
    { key: 'r', label: 'Flagged for review · 40–70%', value: v.review || 0, color: ACC },
    { key: 'a', label: 'Allowed · below 40%', value: v.allowed || 0, color: 'var(--fg2)' },
  ];
  const nums = {
    b: useCountUp(v.blocked || 0, seen),
    r: useCountUp(v.review || 0, seen),
    a: useCountUp(v.allowed || 0, seen),
  };

  return (
    <Card className="gap-3.5">
      <div ref={ref} className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-medium">Model verdicts</h2>
      </div>

      <div className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-baseline gap-3">
            <span className="min-w-[70px] text-[28px] font-semibold leading-none tabular-nums" style={{ color: r.color }}>{nums[r.key]}%</span>
            <span className="text-[12.5px] text-fg2">{r.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-1 flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]" role="img"
        aria-label={`Blocked ${v.blocked}%, review ${v.review}%, allowed ${v.allowed}%`}>
        {rows.map((r) => (
          <span key={r.key} style={{ background: r.color, width: seen ? `${r.value}%` : '0%', transition: 'width 1s cubic-bezier(.22,1,.36,1)' }} />
        ))}
      </div>

      <div className="mt-auto border-t border-line pt-3.5 text-xs text-mute">Thresholds are set in Rules.</div>
    </Card>
  );
}
