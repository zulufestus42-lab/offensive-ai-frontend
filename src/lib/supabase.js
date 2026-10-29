// supabase.js — the auth client (headless; your own screens drive it).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env isn't filled yet, the app still runs (auth gate is skipped) so you can
// keep working during setup. Fill both in frontend/.env to turn auth on.
export const isConfigured = !!(url && key);

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

// Admin is decided by email allowlist on the frontend (routing only); the backend
// still enforces its own admin check on every privileged call.
const adminList = (import.meta.env.VITE_ADMIN_EMAILS || 'zulufestus42@gmail.com')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isAdminEmail = (email) => !!email && adminList.includes(String(email).toLowerCase());
