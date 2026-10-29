import { useState } from 'react';
import { runScan, generateReport } from '../../lib/redteam.js';
import { renderMarkdown } from './markdown.js';

const sevClass = (s) => {
  const v = String(s || '').toLowerCase();
  if (v === 'critical' || v === 'high') return 'text-danger border-danger/40 bg-danger/10';
  if (v === 'medium') return 'text-amber-500 border-amber-500/40 bg-amber-500/10';
  return 'text-fg2 border-line2 bg-chip';
};

function Findings({ findings }) {
  if (!findings?.length) {
    return (
      <div className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-mute">
        No vulnerabilities detected in this scan. (A clean result is still a result — the report will say so.)
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {findings.map((f, i) => (
        <div key={i} className="border-t border-line first:border-t-0 bg-panel p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase ${sevClass(f.SEVERITY)}`}>
              {f.SEVERITY || 'unrated'}
            </span>
            <span className="text-sm font-semibold">{f.VULNERABILITY_TYPE}</span>
            {f.CONFIDENCE && <span className="font-mono text-[11px] text-mute">· model {f.CONFIDENCE}</span>}
          </div>
          <div className="mt-2 grid gap-1 font-mono text-[12.5px] text-fg2">
            <div><span className="text-mute">{f.METHOD}</span> {f.PATH}</div>
            {f.PARAMETER && <div><span className="text-mute">param:</span> {f.PARAMETER}</div>}
            {f.EVIDENCE && <div className="text-fg2"><span className="text-mute">evidence:</span> {f.EVIDENCE}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ScanConsole({ engagement }) {
  const [target, setTarget] = useState(engagement.domain || '');
  const [c1, setC1] = useState(true);
  const [c2, setC2] = useState(true);
  const [running, setRunning] = useState(false);
  const [scan, setScan] = useState(null); // { scanId, findings: [] }
  const [err, setErr] = useState('');
  const [report, setReport] = useState('');
  const [reporting, setReporting] = useState(false);

  const scopeIn = engagement.scope_in?.length ? engagement.scope_in : [engagement.domain];
  const scopeOut = engagement.scope_out || [];
  const ready = c1 && c2 && target.trim() && !running;

  async function launch() {
    if (!ready) return;
    setRunning(true);
    setErr('');
    setReport('');
    setScan(null);
    try {
      const r = await runScan(engagement.id, target.trim());
      setScan({ scanId: r.scanId, findings: r.raw?.FINDINGS ?? [], raw: r.raw });
    } catch (e) {
      setErr(e.message || 'Scan failed.');
    } finally {
      setRunning(false);
    }
  }

  async function makeReport() {
    if (!scan?.scanId) return;
    setReporting(true);
    setErr('');
    try {
      const r = await generateReport(scan.scanId);
      setReport(r.report || '(the report came back empty)');
    } catch (e) {
      setErr(e.message || 'Report generation failed.');
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[12px] tracking-wider text-danger">RED TEAM</div>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em]">{engagement.domain}</h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 font-mono text-[11px] text-green-500">
          <span className="h-[7px] w-[7px] rounded-full bg-green-500" /> AUTHORIZED · VERIFIED
        </span>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_1.1fr]">
        {/* Scope */}
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="m-0 mb-3 text-[15px] font-semibold">Scope</h2>
          <div className="flex flex-col">
            {scopeIn.map((h) => (
              <div key={`in-${h}`} className="flex items-center gap-3 border-t border-line py-2.5 text-[13px] first:border-t-0">
                <span className="font-mono text-[11px] text-green-500">IN</span>
                <span className="font-mono text-fg2">{h}</span>
              </div>
            ))}
            {scopeOut.map((h) => (
              <div key={`out-${h}`} className="flex items-center gap-3 border-t border-line py-2.5 text-[13px]">
                <span className="font-mono text-[11px] text-danger">OUT</span>
                <span className="font-mono text-fg2">{h}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Launch */}
        <section className="flex flex-col rounded-2xl border border-line bg-panel p-5">
          <h2 className="m-0 mb-1.5 text-[15px] font-semibold">Launch active scan</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-mute">
            Runs the authorized crawler &amp; probe suite against in-scope targets only. The backend re-checks the gate
            on every request.
          </p>
          <label className="mb-1.5 block text-[12.5px] text-fg2">Target</label>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mb-4 box-border h-11 w-full rounded-lg border border-line2 bg-bg px-3.5 font-mono text-sm text-fg outline-none focus:border-danger"
            placeholder="app.yourcompany.com"
          />
          <div className="mb-4 flex flex-col gap-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-fg2">
              <input type="checkbox" checked={c1} onChange={() => setC1((v) => !v)} className="h-[17px] w-[17px]" style={{ accentColor: 'var(--danger)' }} />
              Testing window is open now
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-fg2">
              <input type="checkbox" checked={c2} onChange={() => setC2((v) => !v)} className="h-[17px] w-[17px]" style={{ accentColor: 'var(--danger)' }} />
              I confirm this scan is within the authorized scope
            </label>
          </div>
          <button
            type="button"
            onClick={launch}
            disabled={!ready}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-danger px-7 text-[15px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? 'Scanning…' : '▶ Launch authorized scan'}
          </button>
          <p className="mt-3 text-center font-mono text-[11px] text-mute">every scan is logged against this engagement</p>
        </section>
      </div>

      {err && <div className="mt-5 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-[13px] text-danger">{err}</div>}

      {scan && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-[17px] font-semibold">
              Findings <span className="font-mono text-[13px] text-mute">· scan #{scan.scanId} · {scan.findings.length} issue{scan.findings.length === 1 ? '' : 's'}</span>
            </h2>
            {scan.findings.length > 0 && (
              <button
                type="button"
                onClick={makeReport}
                disabled={reporting}
                className="h-10 rounded-lg bg-home px-5 text-[13.5px] font-semibold text-bg disabled:opacity-50"
              >
                {reporting ? 'Writing report…' : 'Generate AI report & fixes'}
              </button>
            )}
          </div>
          <Findings findings={scan.findings} />
        </div>
      )}

      {report && (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-[17px] font-semibold">AI security report</h2>
            <span className="font-mono text-[11px] text-mute">generated by Groq LLM</span>
          </div>
          <div
            className="rt-report text-sm leading-relaxed text-fg2"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
          />
        </div>
      )}
    </div>
  );
}
