import { useState } from 'react';
import { setAdminKey, clearAdminKey, listEngagements } from '../../lib/admin.js';

// Operator unlock — design B (statement left / dark key card). Full-page gate:
// shown to an admin after email login and before any app content. The key is
// verified against the backend; nothing sensitive renders until it passes.
export default function AdminGate({ user, onUnlock, onSignOut }) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (busy || !key) return;
    setBusy(true); setErr('');
    setAdminKey(key);
    try {
      await listEngagements();              // 401 ⇒ wrong key
      onUnlock();
    } catch (e2) {
      clearAdminKey();
      setErr(e2.message === 'unauthorized'
        ? 'That key was rejected. Check it and try again.'
        : 'Could not reach the server — check your connection and try again.');
    } finally { setBusy(false); }
  }

  const mono = "'Geist Mono',ui-monospace,monospace";
  const sans = "'Geist',system-ui,sans-serif";
  const initials = (user?.email || 'FZ').slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap', background: '#09090B', fontFamily: sans, WebkitFontSmoothing: 'antialiased' }}>
      {/* left statement */}
      <div className="opgate-left" style={{ flex: '1.1 1 460px', minWidth: 0, padding: '60px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#F4F5F7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '.14em' }}>OFFENSIVE AI</span>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.14em', color: '#fff', background: '#D92D20', borderRadius: 999, padding: '3px 9px' }}>OPERATOR</span>
        </div>
        <div>
          <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '.18em', color: '#D92D20' }}>RESTRICTED CONSOLE</div>
          <h1 style={{ margin: '16px 0 0', fontSize: 44, fontWeight: 700, letterSpacing: '-.025em', lineHeight: 1.08, maxWidth: 520 }}>One key stands between you and the console.</h1>
          <p style={{ color: '#8A8F99', fontSize: 15.5, lineHeight: 1.65, maxWidth: 460, marginTop: 18 }}>Authorizations, client engagements and the live firewall stay sealed until you verify. Nothing renders behind this screen.</p>
          <div style={{ marginTop: 26, display: 'inline-flex', alignItems: 'center', gap: 10, border: '1px solid #23262B', borderRadius: 999, padding: '8px 14px' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#1A1C20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{initials}</span>
            <span style={{ fontFamily: mono, fontSize: 12.5, color: '#A3AAB6' }}>{user?.email || 'signed in'}</span>
          </div>
        </div>
        <div style={{ fontFamily: mono, color: '#5A6170', fontSize: 12 }}>SESSION-ONLY KEY · CLEARED ON SIGN-OUT</div>
      </div>

      {/* right key card */}
      <div style={{ flex: '.9 1 420px', minWidth: 0, background: '#0E0F13', borderLeft: '1px solid #1C1E24', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 340 }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D92D20" strokeWidth="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          <h2 style={{ margin: '18px 0 6px', fontSize: 22, fontWeight: 700, color: '#F4F5F7' }}>Unlock console</h2>
          <p style={{ margin: '0 0 24px', color: '#8A8F99', fontSize: 14 }}>Enter your operator key to continue.</p>

          <label htmlFor="opkey" style={{ fontSize: 12.5, fontWeight: 500, color: '#8A8F99', display: 'block', marginBottom: 8 }}>Operator key</label>
          <div style={{ position: 'relative' }}>
            <input id="opkey" type={show ? 'text' : 'password'} autoFocus value={key} onChange={(e) => setKey(e.target.value)} placeholder="oai_dash_••••••••"
              style={{ width: '100%', boxSizing: 'border-box', height: 50, background: '#09090B', border: '1px solid #2A2D34', borderRadius: 11, color: '#F4F5F7', padding: '0 62px 0 16px', fontFamily: mono, fontSize: 14, letterSpacing: '.04em', outline: 'none' }} />
            <button type="button" onClick={() => setShow((s) => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#8A8F99', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: sans }}>{show ? 'Hide' : 'Show'}</button>
          </div>

          {err && <div style={{ color: '#F0685E', fontSize: 13, marginTop: 12, lineHeight: 1.4 }}>{err}</div>}

          <button type="submit" disabled={busy || !key} style={{ width: '100%', height: 50, marginTop: 20, border: 'none', borderRadius: 11, background: '#D92D20', color: '#fff', fontFamily: sans, fontWeight: 600, fontSize: 15, cursor: busy || !key ? 'default' : 'pointer', opacity: busy || !key ? 0.6 : 1 }}>{busy ? 'Verifying…' : 'Unlock console'}</button>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #1C1E24', textAlign: 'center' }}>
            <span onClick={onSignOut} style={{ color: '#8A8F99', fontSize: 12.5, cursor: 'pointer' }}>Not you? <span style={{ color: '#D92D20', fontWeight: 600 }}>Sign out</span></span>
          </div>
        </form>
      </div>
      <style>{`@media (max-width: 820px){ .opgate-left{ flex-basis:100% !important; padding:40px 28px !important } }`}</style>
    </div>
  );
}
