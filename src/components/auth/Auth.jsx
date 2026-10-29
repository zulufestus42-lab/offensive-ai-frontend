import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

// Palette from your saved auth-screen design: dark brand panel + white form, Geist, #D92D20.
const C = {
  dark: '#0B0C0E', darkFg: '#F4F5F7', darkMute: '#8A8F99',
  bg: '#FFFFFF', fg: '#0B0C0E', fg2: '#5A6170', mute: '#9AA1AD',
  line: '#E6E8EC', line2: '#D7DBE2', panel: '#F6F7F9',
  acc: '#D92D20', accHover: '#B91C13',
};

const strength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s; // 0..4
};
const STR_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export default function Auth() {
  const [view, setView] = useState('signin'); // signin | signup | forgot | sent | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // If the user arrives from a password-reset email, Supabase fires PASSWORD_RECOVERY.
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setView('reset'); setErr(''); setMsg(''); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const go = (v) => { setView(v); setErr(''); setMsg(''); };

  async function google() {
    setErr('');
    if (!supabase) return setErr('Auth is not configured yet — add your Supabase URL + key to .env.');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) setErr(error.message);
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setErr(''); setMsg('');
    if (!supabase) return setErr('Auth is not configured yet — add your Supabase URL + key to .env.');
    setBusy(true);
    try {
      if (view === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // success → useAuth picks up the session and App swaps to the app.
      } else if (view === 'signup') {
        if (strength(password) < 2) throw new Error('Choose a stronger password.');
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setMsg('check');
        go('sent');
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg('reset');
        go('sent');
      } else if (view === 'reset') {
        if (password !== confirm) throw new Error('Passwords do not match.');
        if (strength(password) < 2) throw new Error('Choose a stronger password.');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMsg('done'); go('signin');
      }
    } catch (e2) {
      setErr(e2.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const field = { width: '100%', boxSizing: 'border-box', height: 46, background: '#fff', border: `1px solid ${C.line2}`, borderRadius: 10, color: C.fg, padding: '0 14px', fontFamily: "'Geist',system-ui,sans-serif", fontSize: 14.5, outline: 'none' };
  const label = { fontSize: 12.5, fontWeight: 500, color: C.fg2, marginBottom: 6, display: 'block' };
  const primary = { width: '100%', height: 48, border: 'none', borderRadius: 10, background: C.acc, color: '#fff', fontFamily: "'Geist',system-ui,sans-serif", fontWeight: 600, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 };
  const link = { color: C.acc, textDecoration: 'none', fontWeight: 600, cursor: 'pointer' };

  const st = strength(password);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Geist',system-ui,sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      {/* left brand panel */}
      <div style={{ flex: '1 1 0', minWidth: 0, background: C.dark, color: C.darkFg, padding: '56px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundImage: `radial-gradient(${C.darkMute}22 1px, transparent 1px)`, backgroundSize: '22px 22px' }} className="auth-brand">
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '.14em' }}>OFFENSIVE AI</div>
        <div>
          <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', maxWidth: 420 }}>Every attack.<br />Seen, blocked<br />and proven.</div>
          <p style={{ color: C.darkMute, fontSize: 15, lineHeight: 1.6, maxWidth: 400, marginTop: 18 }}>The AI firewall that pentests itself. Sign in to run engagements, review authorizations, and watch your defenses harden in real time.</p>
        </div>
        <div style={{ color: C.darkMute, fontSize: 12.5, fontFamily: "'Geist Mono',ui-monospace,monospace" }}>SOC · Red Team · Autopilot</div>
      </div>

      {/* right form */}
      <div style={{ flex: '1 1 0', minWidth: 0, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {view === 'signin' && (
            <form onSubmit={submit}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, color: C.fg }}>Sign in</h1>
              <p style={{ margin: '8px 0 24px', color: C.fg2, fontSize: 14 }}>Welcome back. Access your Offensive AI console.</p>
              <GoogleButton onClick={google} />
              <Divider />
              <label style={label} htmlFor="e">Email</label>
              <input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={field} placeholder="you@company.com" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 6px' }}>
                <label style={{ ...label, margin: 0 }} htmlFor="p">Password</label>
                <span onClick={() => go('forgot')} style={{ ...link, fontSize: 12.5 }}>Forgot?</span>
              </div>
              <PasswordInput id="p" value={password} onChange={setPassword} show={show} setShow={setShow} field={field} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 20px', fontSize: 13, color: C.fg2, cursor: 'pointer' }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: C.acc, width: 16, height: 16 }} />
                Remember me
              </label>
              {err && <ErrText t={err} />}
              <button type="submit" style={primary} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: C.fg2 }}>New here? <span onClick={() => go('signup')} style={link}>Create an account</span></p>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={submit}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, color: C.fg }}>Create account</h1>
              <p style={{ margin: '8px 0 24px', color: C.fg2, fontSize: 14 }}>Start protecting and testing your sites.</p>
              <GoogleButton onClick={google} label="Sign up with Google" />
              <Divider />
              <label style={label} htmlFor="e2">Email</label>
              <input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={field} placeholder="you@company.com" />
              <label style={{ ...label, marginTop: 16 }} htmlFor="p2">Password</label>
              <PasswordInput id="p2" value={password} onChange={setPassword} show={show} setShow={setShow} field={field} />
              {password && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4].map((i) => (<div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= st ? (st <= 1 ? C.acc : st === 2 ? '#C98A1A' : '#2FA36B') : C.line2 }} />))}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.mute, marginTop: 5 }}>{STR_LABEL[st] || 'Too short'}</div>
                </div>
              )}
              {err && <ErrText t={err} />}
              <button type="submit" style={{ ...primary, marginTop: 20 }} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: C.fg2 }}>Already have an account? <span onClick={() => go('signin')} style={link}>Sign in</span></p>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={submit}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, color: C.fg }}>Forgot password</h1>
              <p style={{ margin: '8px 0 24px', color: C.fg2, fontSize: 14 }}>Enter your email and we'll send a reset link.</p>
              <label style={label} htmlFor="e3">Email</label>
              <input id="e3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={field} placeholder="you@company.com" />
              {err && <ErrText t={err} />}
              <button type="submit" style={{ ...primary, marginTop: 20 }} disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: C.fg2 }}><span onClick={() => go('signin')} style={link}>← Back to sign in</span></p>
            </form>
          )}

          {view === 'sent' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 999, background: C.panel, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 22 }} aria-hidden="true">✉</div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.fg }}>Check your email</h1>
              <p style={{ margin: '10px 0 24px', color: C.fg2, fontSize: 14, lineHeight: 1.6 }}>We sent a link to <b style={{ color: C.fg }}>{email || 'your inbox'}</b>. {msg === 'reset' ? 'Click it to set a new password.' : 'Click it to confirm your account, then sign in.'}</p>
              <button onClick={() => go('signin')} style={primary}>Back to sign in</button>
            </div>
          )}

          {view === 'reset' && (
            <form onSubmit={submit}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, color: C.fg }}>Set a new password</h1>
              <p style={{ margin: '8px 0 24px', color: C.fg2, fontSize: 14 }}>Choose a strong password for your account.</p>
              <label style={label} htmlFor="p3">New password</label>
              <PasswordInput id="p3" value={password} onChange={setPassword} show={show} setShow={setShow} field={field} />
              {password && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 4 }}>{[1, 2, 3, 4].map((i) => (<div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= st ? (st <= 1 ? C.acc : st === 2 ? '#C98A1A' : '#2FA36B') : C.line2 }} />))}</div>
                  <div style={{ fontSize: 11.5, color: C.mute, marginTop: 5 }}>{STR_LABEL[st] || 'Too short'}</div>
                </div>
              )}
              <label style={{ ...label, marginTop: 16 }} htmlFor="p4">Confirm password</label>
              <PasswordInput id="p4" value={confirm} onChange={setConfirm} show={show} setShow={setShow} field={field} />
              {confirm && (
                <div style={{ fontSize: 12, marginTop: 8, color: password === confirm ? '#2FA36B' : C.acc }}>{password === confirm ? '✓ Passwords match' : '✕ Passwords do not match'}</div>
              )}
              {err && <ErrText t={err} />}
              <button type="submit" style={{ ...primary, marginTop: 20 }} disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
            </form>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 820px){ .auth-brand{ display:none !important } }`}</style>
    </div>
  );
}

function GoogleButton({ onClick, label = 'Continue with Google' }) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', height: 46, border: `1px solid ${C.line2}`, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: "'Geist',system-ui,sans-serif", fontSize: 14, fontWeight: 500, color: C.fg, cursor: 'pointer' }}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.9 6.2C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-17z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.1-5.5c-2 1.3-4.5 2.1-7.9 2.1-6.3 0-11.7-3.7-13.5-9l-7.9 6.2C6.4 42.6 14.6 48 24 48z"/></svg>
      {label}
    </button>
  );
}
function Divider() {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}><span style={{ flex: 1, height: 1, background: C.line }} /><span style={{ fontSize: 12, color: C.mute }}>or</span><span style={{ flex: 1, height: 1, background: C.line }} /></div>;
}
function PasswordInput({ id, value, onChange, show, setShow, field }) {
  return (
    <div style={{ position: 'relative' }}>
      <input id={id} type={show ? 'text' : 'password'} required value={value} onChange={(e) => onChange(e.target.value)} style={{ ...field, paddingRight: 64 }} placeholder="••••••••" />
      <button type="button" onClick={() => setShow((s) => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: C.fg2, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Geist',system-ui,sans-serif" }}>{show ? 'Hide' : 'Show'}</button>
    </div>
  );
}
function ErrText({ t }) {
  return <div style={{ color: C.acc, fontSize: 13, margin: '14px 0 0', lineHeight: 1.4 }}>{t}</div>;
}
