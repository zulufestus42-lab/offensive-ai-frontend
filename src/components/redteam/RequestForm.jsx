import { useState } from 'react';
import { createEngagement } from '../../lib/redteam.js';
import { API_URL } from '../../lib/config.js';

const field =
  'w-full box-border h-11 rounded-lg border border-line2 bg-panel px-3.5 text-sm text-fg outline-none transition-colors focus:border-danger';
const area =
  'w-full box-border rounded-lg border border-line2 bg-panel p-3 text-sm text-fg outline-none transition-colors focus:border-danger font-mono leading-relaxed';
const label = 'mb-1.5 block text-[13px] font-medium text-fg2';

function Num({ n }) {
  return (
    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-home text-[13px] font-semibold text-bg">
      {n}
    </span>
  );
}

function Section({ n, title, children, note }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6 sm:p-7">
      <div className="mb-4 flex items-center gap-3">
        <Num n={n} />
        <h2 className="m-0 text-[17px] font-semibold">{title}</h2>
      </div>
      {note && <p className="-mt-1 mb-4 text-[13px] text-mute">{note}</p>}
      {children}
    </div>
  );
}

const INTENSITY = {
  'Safe — passive & light probes': 'safe',
  Standard: 'standard',
  'Aggressive (with sign-off)': 'aggressive',
};

export default function RequestForm({ onCreated }) {
  const [f, setF] = useState({
    orgName: '',
    domain: '',
    scopeIn: '',
    scopeOut: '',
    signerName: '',
    signerRole: 'Chief Information Security Officer',
    signerEmail: '',
    phone: '',
    window: '',
    intensity: 'Safe — passive & light probes',
  });
  const [agree, setAgree] = useState([true, true, true]);
  const [pdf, setPdf] = useState(null); // { name, base64 }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErr('That PDF is larger than 10 MB. Please attach a smaller file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result || '').split(',')[1] || '';
      setPdf({ name: file.name, base64 });
      setErr('');
    };
    reader.readAsDataURL(file);
  }
  const noApi = !API_URL;
  const ready = f.domain.trim() && f.signerName.trim() && f.signerEmail.trim() && agree.every(Boolean) && !noApi;

  async function submit(e) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setErr('');
    try {
      const engagement = await createEngagement({
        orgName: f.orgName.trim() || null,
        domain: f.domain.trim(),
        scopeIn: f.scopeIn.trim() || f.domain.trim(),
        scopeOut: f.scopeOut.trim(),
        signerName: f.signerName.trim(),
        signerRole: f.signerRole,
        signerEmail: f.signerEmail.trim(),
        window: f.window.trim() || null,
        intensity: INTENSITY[f.intensity] || 'safe',
        verifyMethod: 'dns',
        pdfName: pdf?.name || null,
        pdfBase64: pdf?.base64 || null,
      });
      onCreated(engagement);
    } catch (e2) {
      setErr(e2.message || 'Could not submit the request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[780px]">
      <div className="pb-2 pt-1">
        <h1 className="m-0 text-[30px] font-semibold tracking-[-0.02em]">Request authorization to test</h1>
        <p className="mb-0 mt-2.5 max-w-[600px] text-[15px] leading-relaxed text-fg2">
          Active red-team scanning is gated. Complete this request and verify ownership; a human confirms before any
          aggressive testing is enabled against your targets.
        </p>
      </div>

      {noApi && (
        <div className="mt-5 rounded-lg border border-line2 bg-chip px-4 py-3 text-[13px] text-fg2">
          The dashboard isn’t connected to a backend yet (<span className="font-mono">VITE_API_URL</span> is unset), so
          requests can’t be submitted. Set it to enable the Red Team flow.
        </div>
      )}

      <form onSubmit={submit} className="mt-7 flex flex-col gap-[18px]">
        <Section n={1} title="Target scope">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <div>
              <label className={label} htmlFor="org">Organization</label>
              <input id="org" className={field} placeholder="Your Company Ltd" value={f.orgName} onChange={set('orgName')} />
            </div>
            <div>
              <label className={label} htmlFor="dom">Primary domain</label>
              <input id="dom" className={`${field} font-mono`} placeholder="app.yourcompany.com" value={f.domain} onChange={set('domain')} />
            </div>
          </div>
          <div className="mt-4">
            <label className={label} htmlFor="scope">In-scope hosts / IP ranges</label>
            <textarea id="scope" rows={3} className={area} placeholder={'app.yourcompany.com\n203.0.113.0/24'} value={f.scopeIn} onChange={set('scopeIn')} />
          </div>
          <div className="mt-4">
            <label className={label} htmlFor="oos">Explicitly out of scope</label>
            <input id="oos" className={`${field} font-mono`} placeholder="payments.yourcompany.com, third-party vendors" value={f.scopeOut} onChange={set('scopeOut')} />
          </div>
        </Section>

        <Section n={2} title="Authorized signer" note="Must be someone empowered to authorize testing — typically the CISO or Head of Security.">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <div>
              <label className={label} htmlFor="nm">Full name</label>
              <input id="nm" className={field} placeholder="Jane Doe" value={f.signerName} onChange={set('signerName')} />
            </div>
            <div>
              <label className={label} htmlFor="role">Role</label>
              <select id="role" className={field} value={f.signerRole} onChange={set('signerRole')}>
                <option>Chief Information Security Officer</option>
                <option>Head of Security</option>
                <option>VP, Security Engineering</option>
                <option>Authorized security contact</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="eml">Work email</label>
              <input id="eml" className={`${field} font-mono`} placeholder="jane@yourcompany.com" value={f.signerEmail} onChange={set('signerEmail')} />
            </div>
            <div>
              <label className={label} htmlFor="ph">Phone (for verification)</label>
              <input id="ph" className={`${field} font-mono`} placeholder="+260 …" value={f.phone} onChange={set('phone')} />
            </div>
          </div>
        </Section>

        <Section n={3} title="Proof of authorization">
          <label className={label}>Signed authorization letter (PDF)</label>
          <label
            htmlFor="authpdf"
            className="block cursor-pointer rounded-xl border border-dashed border-line2 bg-chip px-5 py-6 text-center text-[13.5px] text-mute transition-colors hover:border-danger"
          >
            {pdf ? (
              <>
                <strong className="text-fg">{pdf.name}</strong>
                <div className="mt-1 text-[11px] text-mute">attached — click to replace</div>
              </>
            ) : (
              <>
                <strong className="text-fg2">Attach your signed authorization</strong>
                <br />
                click to browse · PDF up to 10&nbsp;MB
              </>
            )}
          </label>
          <input id="authpdf" type="file" accept="application/pdf,.pdf" onChange={onFile} className="hidden" />
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-line bg-chip px-3.5 py-3 text-[13px] text-fg2">
            This PDF is emailed to a reviewer for manual approval. Domain ownership is also verified separately before
            testing is enabled.
          </div>
        </Section>

        <Section n={4} title="Rules of engagement">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <div>
              <label className={label} htmlFor="win">Allowed testing window</label>
              <input id="win" className={field} placeholder="02:00–06:00 CAT, weekdays" value={f.window} onChange={set('window')} />
            </div>
            <div>
              <label className={label} htmlFor="int">Intensity</label>
              <select id="int" className={field} value={f.intensity} onChange={set('intensity')}>
                <option>Safe — passive &amp; light probes</option>
                <option>Standard</option>
                <option>Aggressive (with sign-off)</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {[
              'I am authorized to approve penetration testing of the listed targets.',
              'I accept the rules of engagement and that testing may affect availability.',
              'I consent to this authorization being logged and retained as evidence.',
            ].map((t, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-2.5 text-[13.5px] text-fg2">
                <input
                  type="checkbox"
                  checked={agree[i]}
                  onChange={() => setAgree((a) => a.map((v, j) => (j === i ? !v : v)))}
                  className="mt-0.5 h-[17px] w-[17px] flex-none"
                  style={{ accentColor: 'var(--danger)' }}
                />
                {t}
              </label>
            ))}
          </div>
        </Section>

        {err && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-[13px] text-danger">{err}</div>}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3.5">
          <span className="text-[12.5px] text-mute">A reviewer confirms within one business day.</span>
          <button
            type="submit"
            disabled={!ready || busy}
            className="h-12 rounded-lg bg-home px-6 text-[15px] font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Submitting…' : 'Submit authorization request'}
          </button>
        </div>
      </form>
    </div>
  );
}
