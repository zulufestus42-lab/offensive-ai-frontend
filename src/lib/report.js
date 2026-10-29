// report.js — builds a real, multi-page "OFFENSIVE AI" engagement report from
// an actual autopilot run (findings + transcript) and opens it ready to save as PDF.
//
// Usage:  openReport({ domain, findings, score, blocked, bypassed, signatures, feed })
// The browser's print dialog ("Save as PDF") turns it into a downloadable file.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SEV = {
  CRITICAL: '#E5484D', HIGH: '#F5A524', MEDIUM: '#C99A00', LOW: '#8C8C8C',
};
const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function buildReportHtml(d) {
  const domain = d.domain || 'the target';
  const findings = [...(d.findings || [])].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const counts = findings.reduce((m, f) => (m[f.severity] = (m[f.severity] || 0) + 1, m), {});
  const feed = d.feed || [];

  const sevBadge = (s) => `<span class="sev" style="background:${SEV[s] || '#888'}">${esc(s || 'UNRATED')}</span>`;

  const findingSection = (f, i) => `
    <section class="finding">
      <div class="fhead">
        <div class="fnum">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <h3>${esc(f.name)}</h3>
          <div class="fmeta">${sevBadge(f.severity)} <span class="owasp">OWASP ${esc(f.owasp || '—')}</span></div>
        </div>
      </div>
      <table class="kv">
        <tr><th>Endpoint</th><td><code>${esc(f.endpoint)}</code></td></tr>
        <tr><th>Payload</th><td><code>${esc(f.payload)}</code></td></tr>
        <tr><th>What happened</th><td>The payload bypassed the web application firewall and the origin exposed the weakness. The attack was captured and a signature was written, so it is now blocked automatically.</td></tr>
        <tr><th>Firewall action</th><td>${esc(f.hardened || 'signature learned')}</td></tr>
        <tr><th>Remediation</th><td>${esc(f.fix || 'Patch and re-test.')}</td></tr>
      </table>
    </section>`;

  const rows = findings.map((f) => `<tr>
      <td>${sevBadge(f.severity)}</td>
      <td>${esc(f.name)}</td>
      <td class="owasp">${esc(f.owasp || '—')}</td>
      <td><code>${esc(f.endpoint)}</code></td>
    </tr>`).join('');

  const transcript = feed.map((l) => `<div class="tl"><span class="ts">${esc(l.ts || '')}</span> ${esc(l.glyph || '')} ${esc(l.text || '')}</div>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Offensive AI — Engagement Report ${esc(domain)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
  <style>
    :root{--fg:#111;--mut:#666;--line:#e4e4e1;--accent:#D92D20}
    *{box-sizing:border-box}
    body{font-family:'Geist',system-ui,sans-serif;color:var(--fg);margin:0;font-size:12px;line-height:1.55}
    code{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;word-break:break-all}
    .page{padding:54px 56px;max-width:820px;margin:0 auto}
    .cover{min-height:92vh;display:flex;flex-direction:column;justify-content:center;page-break-after:always}
    .brand{font-weight:700;letter-spacing:.18em;font-size:15px}
    .brand b{color:var(--accent)}
    .cover h1{font-size:40px;font-weight:700;letter-spacing:-.02em;margin:22px 0 6px;line-height:1.05}
    .cover .sub{color:var(--mut);font-size:15px}
    .cover .meta{margin-top:40px;font-family:'Geist Mono',monospace;font-size:12px;color:var(--mut);display:flex;flex-direction:column;gap:5px}
    .cover .rule{height:3px;background:var(--accent);width:64px;margin:26px 0}
    h2{font-size:19px;font-weight:700;margin:0 0 4px;letter-spacing:-.01em}
    .eyebrow{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin-bottom:18px}
    section.block{page-break-inside:avoid;margin-bottom:30px}
    .cards{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
    .card{border:1px solid var(--line);border-radius:10px;padding:12px 16px;min-width:120px}
    .card .n{font-size:30px;font-weight:700;letter-spacing:-.02em}
    .card .l{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--mut);margin-top:3px}
    table{border-collapse:collapse;width:100%;font-size:11.5px}
    table.summary th,table.summary td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
    table.summary th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}
    .sev{color:#fff;font-family:'Geist Mono',monospace;font-size:9.5px;font-weight:600;padding:2px 7px;border-radius:5px;letter-spacing:.04em}
    .owasp{font-family:'Geist Mono',monospace;color:var(--mut)}
    .finding{page-break-inside:avoid;border-top:1px solid var(--line);padding-top:18px;margin-top:22px}
    .fhead{display:flex;gap:14px;align-items:flex-start}
    .fnum{font-family:'Geist Mono',monospace;font-size:22px;color:var(--accent);font-weight:600}
    .finding h3{margin:0;font-size:15px}
    .fmeta{margin-top:5px;display:flex;gap:8px;align-items:center}
    table.kv{margin-top:12px}
    table.kv th{text-align:left;width:140px;vertical-align:top;color:var(--mut);font-weight:500;padding:5px 10px 5px 0;font-size:11px}
    table.kv td{padding:5px 0;border-bottom:1px solid var(--line)}
    .tl{font-family:'Geist Mono',monospace;font-size:10px;color:#333;padding:1px 0}
    .tl .ts{color:#aaa}
    .foot{margin-top:30px;padding-top:12px;border-top:1px solid var(--line);color:var(--mut);font-size:10px}
    @media print{.page{padding:34px 40px}.cover{min-height:88vh}}
  </style></head><body>

  <div class="page cover">
    <div class="brand">OFFENSIVE <b>AI</b></div>
    <div class="rule"></div>
    <h1>Red Team Autopilot<br>Engagement Report</h1>
    <div class="sub">Autonomous security assessment &amp; self-hardening firewall</div>
    <div class="meta">
      <span>TARGET&nbsp;&nbsp;&nbsp;${esc(domain)}</span>
      <span>DATE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${esc(dateStr)}</span>
      <span>FINDINGS&nbsp;${findings.length}</span>
      <span>SECURITY SCORE&nbsp;${esc(d.score ?? '—')} / 100</span>
      <span>CLASSIFICATION&nbsp;CONFIDENTIAL</span>
    </div>
  </div>

  <div class="page">
    <div class="eyebrow">01 — Executive summary</div>
    <h2>What we did, and what we found</h2>
    <p>Offensive AI ran an authorized, autonomous penetration test against <b>${esc(domain)}</b>, firing real,
    non-destructive payloads through the target's own web application firewall. Every request was judged from the
    live response. When a payload slipped past the firewall, the system captured the attack and wrote a signature,
    so the same attack is blocked from that moment on — the firewall strengthened itself as it was attacked.</p>
    <div class="cards">
      <div class="card"><div class="n">${findings.length}</div><div class="l">Vulnerabilities</div></div>
      <div class="card"><div class="n" style="color:${SEV.CRITICAL}">${counts.CRITICAL || 0}</div><div class="l">Critical</div></div>
      <div class="card"><div class="n" style="color:${SEV.HIGH}">${counts.HIGH || 0}</div><div class="l">High</div></div>
      <div class="card"><div class="n">${d.signatures ?? 0}</div><div class="l">Signatures learned</div></div>
      <div class="card"><div class="n">${d.score ?? '—'}</div><div class="l">Security score</div></div>
    </div>
    <section class="block">
      <div class="eyebrow">02 — Findings at a glance</div>
      <table class="summary"><thead><tr><th>Severity</th><th>Finding</th><th>OWASP</th><th>Endpoint</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No findings recorded.</td></tr>'}</tbody></table>
    </section>
  </div>

  <div class="page">
    <div class="eyebrow">03 — Methodology</div>
    <h2>Autonomous attack, self-hardening defense</h2>
    <p>The engagement proceeds in OWASP-aligned phases: reconnaissance, injection, broken access control, sensitive
    data exposure, security misconfiguration &amp; vulnerable components, authentication failures, and SSRF / open
    redirect. For each probe the autopilot fires the payload through the inline firewall proxy, reads the real
    response, and classifies it as <b>blocked</b>, <b>bypassed</b>, or <b>safe</b>. On a bypass it records the finding
    and writes a firewall signature; it then re-fires the identical payload to prove the attack is now blocked.
    Where the operator authorized a bypass attempt, the agent evolved an evasion variant and re-tested the new rule.
    No destructive operations were performed.</p>
    <div class="eyebrow" style="margin-top:28px">04 — Detailed findings</div>
    ${findings.map(findingSection).join('')}
  </div>

  <div class="page">
    <div class="eyebrow">05 — Engagement transcript</div>
    <h2>Full operator log</h2>
    <p style="color:var(--mut)">Every action the autopilot took during this engagement, in order.</p>
    <div style="margin-top:12px">${transcript || '<div class="tl">No transcript recorded.</div>'}</div>
    <div class="foot">Generated by Offensive AI · ${esc(dateStr)} · Authorized engagement against ${esc(domain)}. This report documents findings and the firewall signatures learned; no systems were exploited beyond read-only verification.</div>
  </div>

  </body></html>`;
}

export function openReport(data) {
  const html = buildReportHtml(data);
  const w = window.open('', '_blank');
  if (!w) { alert('Allow pop-ups to view and save the report.'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // give fonts a moment, then offer the print / save-as-PDF dialog
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* user can print manually */ } }, 600);
}

export { buildReportHtml };
