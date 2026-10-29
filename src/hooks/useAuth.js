// useAuth.js — current session, user, admin flag, and sign-out.
import { useState, useEffect } from 'react';
import { supabase, isConfigured, isAdminEmail } from '../lib/supabase.js';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const user = session?.user ?? null;
  return {
    session,
    user,
    loading,
    isAdmin: isAdminEmail(user?.email),
    accessToken: session?.access_token ?? null,
    signOut: () => (isConfigured ? supabase.auth.signOut() : Promise.resolve()),
  };
}
