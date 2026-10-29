import { useState, useEffect, useCallback } from 'react';
import { listEngagements, getEngagementDetail, reviewEngagement, forceVerify, launchTarget, pdfUrl, clearAdminKey } from '../../lib/admin.js';
import { fetchOverview } from '../../lib/api.js';
import Autopilot from '../redteam/Autopilot.jsx';

const DEFAULT_TARGET = 'juice-shop-s9ec.onrender.com';

function palette(dark) {
  return dark
    ? { bg:'#0A0B0D', panel:'#121419', panel2:'#0E1014', line:'#22252C', line2:'#30343C', fg:'#F3F4F6', fg2:'#A0A6B0', mute:'#6A7078', acc:'#D92D20', accs:'rgba(217,45,32,0.16)', ok:'#3FB27F', warn:'#E0A33A', ink:'#F3F4F6', inkfg:'#0A0B0D' }
    : { bg:'#F7F8FA', panel:'#FFFFFF', panel2:'#F1F3F6', line:'#E9ECF1', line2:'#D7DBE2', fg:'#0B0C0E', fg2:'#525A66', mute:'#8A929E', acc:'#D92D20', accs:'rgba(217,45,32,0.08)', ok:'#1F9D63', warn:'#B07B16', ink:'#0B0C0E', inkfg:'#FFFFFF' };
}
const fmtAgo = (t) => {
  if (!t) return '';
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const fmt = (t) => { try { return new Date(t).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return t || ''; } };

export default function Admin({ onSignOut }) {
  const [dark, setDark] = useState(true);
  const c = palette(dark);
  const mono = "'Geist Mono',ui-monospace,monospace";
  const sans = "'Geist',system-ui,sans-serif";

  const [list, setList] = useState([]);
  const [overview, setOverview] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Launch attack
  const [attackEngagement, setAttackEngagement] = useState(null); // {id, domain} | null
  const [launchDomain, setLaunchDomain] = useState(DEFAULT_TARGET);
  const [launching, setLaunching] = useState(false);

  const refresh = useCallback(async () => {
    setErr('');
    try {
      const rows = await listEngagements();
      setList(rows);
    } catch (e) {
      if (e.message === 'unauthorized') { clearAdminKey(); window.location.reload(); }
      else setErr(e.message);
    }
    fetchOverview().then(setOverview).catch(() => {});
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function act(fn) {
    if (busy) return; setBusy(true);
    try { await fn(); await refresh(); if (detail) setDetail(await getEngagementDetail(detail.id)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function open(id) { try { setDetail(await getEngagementDetail(id)); } catch (e) { setErr(e.message); } }

  async function prepareAndLaunch(domain) {
    const d = (domain || '').trim();
    if (!d || launching) return;
    setLaunching(true); setErr('');
    try {
      const t = await launchTarget(d);
      setAttackEngagement({ id: t.id, domain: t.domain });
    } catch (e) {
      if (e.message === 'unauthorized') { clearAdminKey(); window.location.reload(); }
      else setErr(e.message);
    } finally { setLaunching(false); }
  }

  const pending = list.filter((e) => e.review_status === 'pending');
  const approved = list.filter((e) => e.review_status === 'approved');
  const filtered = filter === 'all' ? list : list.filter((e) => e.review_status === filter);

  const kpis = [
    { l: 'Pending', n: pending.length },
    { l: 'Approved', n: approved.length },
    { l: 'Engagements', n: list.length },
    { l: 'Blocked', n: overview?.kpis?.blocked != null ? Number(overview.kpis.blocked).toLocaleString() : '—' },
  ];

  const v = overview?.verdicts || { blocked: 82, review: 11, allowed: 7 };
  const verdict = [
    { l: 'Blocked', p: v.blocked, c: c.acc },
    { l: 'Review', p: v.review, c: c.warn },
    { l: 'Allowed', p: v.allowed, c: c.mute },
  ];
  // donut segments (r chosen so circumference ≈ 100 → pct maps 1:1)
  let cum = 0;
  const segs = verdict.map((s) => { const seg = { pct: s.p, color: s.c, off: -cum }; cum += s.p; return seg; });

  const types = (overview?.types || [
    { name: 'SQL injection', pct: 34 }, { name: 'Broken access', pct: 24 }, { name: 'XSS', pct: 18 }, { name: 'SSRF', pct: 8 },
  ]).slice(0, 4);
  const tmax = Math.max(1, ...types.map((t) => t.pct));

  const feed = [...list]
    .sort((a, b) => new Date(b.reviewed_at || b.created_at) - new Date(a.reviewed_at || a.created_at))
    .slice(0, 5)
    .map((e) => e.review_status === 'approved'
      ? { t: `${e.org_name || e.domain} approved`, when: fmtAgo(e.reviewed_at || e.created_at), c: c.ok }
      : e.review_status === 'rejected'
        ? { t: `${e.org_name || e.domain} rejected`, when: fmtAgo(e.reviewed_at || e.created_at), c: c.mute }
        : { t: `New request · ${e.org_name || e.domain}`, when: fmtAgo(e.created_at), c: c.warn });

  const chip = (s) => s === 'pending' ? [c.warn, c.accs] : s === 'approved' ? [c.ok, 'transparent'] : [c.mute, 'transparent'];

  // ---- full-screen attack view — the real Autopilot, pointed at the prepared target ----
  if (attackEngagement) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: c.bg, color: c.fg, fontFamily: sans, WebkitFontSmoothing: 'antialiased' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 28px', borderBottom: `1px solid ${c.line}` }}>
          <button onClick={() => setAttackEngagement(null)} style={{ border: `1px solid ${c.line2}`, background: 'transparent', color: c.fg, borderRadius: 9, padding: '8px 14px', fontFamily: sans, fontSize: 13, cursor: 'pointer' }}>← Back to console</button>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.12em' }}>OFFENSIVE AI</span>
          <span style={{ fontFamily: mono, fontSize: 12, color: c.mute }}>engagement #{attackEngagement.id} · {attackEngagement.domain}</span>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Autopilot engagement={attackEngagement} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: c.bg, color: c.fg, minHeight: '100%', fontFamily: sans, WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${c.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.12em' }}>OFFENSIVE AI</span>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.14em', color: '#fff', background: c.acc, borderRadius: 999, padding: '3px 8px' }}>OPERATOR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setDark((d) => !d)} aria-label="theme" style={{ height: 36, width: 36, border: `1px solid ${c.line2}`, background: 'transparent', color: c.fg2, borderRadius: 10, cursor: 'pointer' }}>{dark ? '☀' : '☾'}</button>
          <button onClick={() => { clearAdminKey(); window.location.reload(); }} style={{ height: 36, padding: '0 12px', border: `1px solid ${c.line2}`, background: 'transparent', color: c.fg2, borderRadius: 10, fontSize: 12.5, cursor: 'pointer', fontFamily: sans }}>Lock</button>
          {onSignOut && <button onClick={onSignOut} style={{ height: 36, padding: '0 12px', border: `1px solid ${c.line2}`, background: 'transparent', color: c.fg2, borderRadius: 10, fontSize: 12.5, cursor: 'pointer', fontFamily: sans }}>Sign out</button>}
        </div>
      </div>

      {err && <div style={{ padding: '10px 28px', color: c.acc, fontSize: 13, borderBottom: `1px solid ${c.line}` }}>{err}</div>}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, flexWrap: 'wrap' }}>
        {/* left: requests */}
        <section style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${c.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 26px 14px', flexWrap: 'wrap', gap: 10 }}>
            <div><h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Authorization requests</h1><p style={{ margin: '4px 0 0', fontSize: 13, color: c.mute }}>From customer organizations</p></div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['pending', 'approved', 'all'].map((t) => (
                <button key={t} onClick={() => setFilter(t)} style={{ fontSize: 12, padding: '6px 11px', borderRadius: 7, cursor: 'pointer', textTransform: 'capitalize', fontFamily: sans, ...(filter === t ? { background: c.ink, color: c.inkfg, fontWeight: 600, border: 'none' } : { background: 'transparent', color: c.fg2, border: `1px solid ${c.line}` }) }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 26px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.length === 0 && <div style={{ color: c.mute, fontSize: 13, padding: 20 }}>No requests here.</div>}
            {filtered.map((e) => {
              const [sc, sb] = chip(e.review_status);
              return (
                <div key={e.id} style={{ border: `1px solid ${c.line}`, background: c.panel, borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 10, background: c.panel2, border: `1px solid ${c.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flex: 'none' }}>{(e.org_name || e.domain || '?').slice(0, 2).toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{e.org_name || 'Internal'}</div><div style={{ fontFamily: mono, fontSize: 12.5, color: c.fg2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.domain}</div></div>
                    <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: sc, background: sb, borderRadius: 999, padding: '4px 10px', textTransform: 'uppercase' }}>{e.review_status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${c.line}`, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12.5, color: c.fg2 }}>Signer <span style={{ color: c.fg }}>{e.signer_name || '—'}</span></span>
                    <span style={{ fontFamily: mono, fontSize: 11.5, color: c.mute }}>{fmtAgo(e.created_at)}</span>
                    {e.has_pdf && <span style={{ fontFamily: mono, fontSize: 11, color: c.fg2, border: `1px solid ${c.line2}`, borderRadius: 6, padding: '2px 7px' }}>◳ pdf</span>}
                    <span style={{ flex: 1 }} />
                    <button onClick={() => open(e.id)} style={{ height: 32, padding: '0 13px', border: `1px solid ${c.line2}`, background: 'transparent', color: c.fg, fontFamily: sans, fontWeight: 600, fontSize: 12, cursor: 'pointer', borderRadius: 8 }}>Open</button>
                    {e.review_status !== 'approved' && <button disabled={busy} onClick={() => act(() => reviewEngagement(e.id, 'approve'))} style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 8, background: c.acc, color: '#fff', fontFamily: sans, fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>Approve</button>}
                    <button disabled={launching} onClick={() => prepareAndLaunch(e.domain)} title="Verify, approve & run the autopilot against this target" style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 8, background: c.ink, color: c.inkfg, fontFamily: sans, fontWeight: 600, fontSize: 12, cursor: launching ? 'default' : 'pointer', opacity: launching ? 0.6 : 1 }}>Launch ▶</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* right rail */}
        <aside style={{ flex: '1 1 360px', minWidth: 0, maxWidth: 420, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* launch attack */}
          <div style={{ border: `1px solid ${c.acc}`, background: c.panel, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.16em', color: c.acc }}>RED TEAM AUTOPILOT</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>Point at a target</div>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: c.fg2, lineHeight: 1.5 }}>Prepare &amp; launch an autonomous attack. Verifies ownership, approves it and logs the authorization, then runs through your firewall.</p>
            <input value={launchDomain} onChange={(e) => setLaunchDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && prepareAndLaunch(launchDomain)} placeholder="target host (e.g. juice-shop-xxxx.onrender.com)"
              style={{ width: '100%', marginTop: 12, border: `1px solid ${c.line2}`, background: c.bg, color: c.fg, borderRadius: 10, padding: '11px 13px', fontFamily: mono, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={() => prepareAndLaunch(launchDomain)} disabled={launching} style={{ width: '100%', marginTop: 10, height: 42, border: 'none', borderRadius: 10, background: c.acc, color: '#fff', fontFamily: sans, fontWeight: 600, fontSize: 13.5, cursor: launching ? 'default' : 'pointer', opacity: launching ? 0.6 : 1 }}>{launching ? 'Preparing…' : 'Prepare & launch'}</button>
            <div style={{ marginTop: 8, fontFamily: mono, fontSize: 10, color: c.mute }}>Operator action · logged to the audit trail</div>
          </div>

          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.16em', color: c.mute }}>OPERATOR PULSE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {kpis.map((k) => (
              <div key={k.l} style={{ border: `1px solid ${c.line}`, background: c.panel, borderRadius: 12, padding: '14px 15px' }}>
                <div style={{ fontSize: 11.5, color: c.mute }}>{k.l}</div>
                <div style={{ fontFamily: mono, fontSize: 23, fontWeight: 600, marginTop: 6 }}>{k.n}</div>
              </div>
            ))}
          </div>

          <div style={{ border: `1px solid ${c.line}`, background: c.panel, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Verdict mix</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <svg viewBox="0 0 42 42" width="96" height="96" aria-hidden="true">
                <circle cx="21" cy="21" r="15.915" fill="none" stroke={c.line} strokeWidth="7" />
                {segs.map((s, i) => (
                  <circle key={i} cx="21" cy="21" r="15.915" fill="none" stroke={s.color} strokeWidth="7" strokeDasharray={`${s.pct} ${100 - s.pct}`} strokeDashoffset={s.off} transform="rotate(-90 21 21)" />
                ))}
                <text x="21" y="22" textAnchor="middle" fontFamily={mono} fontSize="7" fontWeight="600" fill={c.fg}>{v.blocked}%</text>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {verdict.map((vv) => (
                  <div key={vv.l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: vv.c }} /><span style={{ color: c.fg2 }}>{vv.l}</span>
                    <span style={{ fontFamily: mono, marginLeft: 'auto', fontWeight: 600 }}>{vv.p}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ border: `1px solid ${c.line}`, background: c.panel, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Top techniques blocked</div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {types.map((t) => (
                <div key={t.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: c.fg2 }}><span>{t.name}</span><span style={{ fontFamily: mono, color: c.mute }}>{t.pct}%</span></div>
                  <div style={{ marginTop: 5, height: 6, borderRadius: 999, background: c.line }}><div style={{ width: `${Math.round((t.pct / tmax) * 100)}%`, height: '100%', borderRadius: 999, background: c.acc }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: `1px solid ${c.line}`, background: c.panel, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Recent activity</div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 11 }}>
              {feed.length === 0 && <div style={{ color: c.mute, fontSize: 12.5 }}>No activity yet.</div>}
              {feed.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 50, background: f.c, marginTop: 5, flex: 'none' }} />
                  <div><div style={{ color: c.fg }}>{f.t}</div><div style={{ fontFamily: mono, fontSize: 10.5, color: c.mute, marginTop: 1 }}>{f.when}</div></div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* detail slide-over */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 94vw)', height: '100%', background: c.bg, borderLeft: `1px solid ${c.line}`, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{detail.domain}</h2>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: detail.review_status === 'approved' ? c.ok : detail.review_status === 'rejected' ? c.acc : c.warn, textTransform: 'uppercase' }}>{detail.review_status}</span>
                </div>
                <div style={{ fontFamily: mono, fontSize: 12, color: c.mute, marginTop: 5 }}>AUTH-{detail.id} · {fmt(detail.created_at)}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ border: 'none', background: 'transparent', color: c.fg2, fontSize: 20, cursor: 'pointer', lineHeight: 1 }} aria-label="Close">×</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              <button disabled={busy || detail.review_status === 'approved'} onClick={() => act(() => reviewEngagement(detail.id, 'approve'))} style={{ flex: 1, minWidth: 110, height: 42, border: 'none', borderRadius: 10, background: c.acc, color: '#fff', fontFamily: sans, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>Approve</button>
              <button disabled={busy} onClick={() => act(() => reviewEngagement(detail.id, 'reject'))} style={{ height: 42, padding: '0 16px', border: `1px solid ${c.line2}`, background: 'transparent', color: c.fg, fontFamily: sans, fontWeight: 600, fontSize: 13.5, borderRadius: 10, cursor: 'pointer' }}>Reject</button>
              <button disabled={busy} onClick={() => act(async () => { await forceVerify(detail.id); await reviewEngagement(detail.id, 'approve'); })} style={{ height: 42, padding: '0 14px', border: `1px solid ${c.line2}`, background: 'transparent', color: c.fg2, fontFamily: sans, fontWeight: 500, fontSize: 12.5, borderRadius: 10, cursor: 'pointer' }} title="Force-verify & approve (practice targets)">Force-verify</button>
              <button disabled={launching} onClick={() => prepareAndLaunch(detail.domain)} style={{ height: 42, padding: '0 16px', border: 'none', borderRadius: 10, background: c.ink, color: c.inkfg, fontFamily: sans, fontWeight: 600, fontSize: 13.5, cursor: launching ? 'default' : 'pointer', opacity: launching ? 0.6 : 1 }}>Launch ▶</button>
            </div>

            <div style={{ marginTop: 18, border: `1px solid ${c.line}`, background: c.panel, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.14em', color: c.mute }}>SIGNER & SCOPE</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13 }}>
                <Row c={c} k="Name" v={detail.signer_name || '—'} />
                <Row c={c} k="Email" v={detail.signer_email || '—'} mono={mono} />
                <Row c={c} k="Org" v={detail.org_name || 'Internal'} />
                <Row c={c} k="Scope" v={(detail.scope_in && detail.scope_in.length ? detail.scope_in : [detail.domain]).join(', ')} mono={mono} />
                <Row c={c} k="Ownership" v={detail.ownership_verified ? 'verified' : 'not verified'} />
              </div>
            </div>

            <div style={{ marginTop: 14, border: `1px solid ${c.line}`, background: c.panel, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.14em', color: c.mute }}>SIGNED AUTHORIZATION</div>
                {detail.has_pdf && <a href={pdfUrl(detail.id)} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: c.acc, textDecoration: 'none', fontWeight: 600 }}>Open ↗</a>}
              </div>
              {detail.has_pdf
                ? <iframe title="authorization" src={pdfUrl(detail.id)} style={{ marginTop: 12, width: '100%', height: 360, border: `1px solid ${c.line2}`, borderRadius: 8, background: '#fff' }} />
                : <div style={{ marginTop: 12, height: 120, border: `1px dashed ${c.line2}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.mute, fontSize: 12.5 }}>No authorization file uploaded.</div>}
            </div>

            {detail.reviewer_note && (
              <div style={{ marginTop: 14, border: `1px solid ${c.line}`, background: c.panel, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.14em', color: c.mute }}>AUDIT</div>
                <div style={{ fontFamily: mono, fontSize: 11.5, color: c.fg2, marginTop: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.reviewer_note.trim()}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ c, k, v, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: c.fg2 }}>{k}</span>
      <span style={{ fontFamily: mono || 'inherit', fontSize: mono ? 12 : 13, textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
    </div>
  );
}
