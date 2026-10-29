// admin.js — client for the boss/admin review dashboard.
// The admin key is your DASHBOARD_TOKEN (or ADMIN_TOKEN on the backend).
// It's held in sessionStorage so it clears when the tab closes.

import { API_URL } from './pentest';

const KEY = 'oai_admin_key';

export function getAdminKey() {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function setAdminKey(k) {
  try { sessionStorage.setItem(KEY, k || ''); } catch { /* storage blocked */ }
}
export function clearAdminKey() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

function headers(json = false) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  const k = getAdminKey();
  if (k) h['Authorization'] = `Bearer ${k}`;
  return h;
}

export async function listEngagements() {
  const r = await fetch(`${API_URL}/v1/redteam/admin/engagements`, { headers: headers() });
  if (r.status === 401) throw new Error('unauthorized');
  if (!r.ok) throw new Error(`list failed (${r.status})`);
  return r.json();
}

export async function getEngagementDetail(id) {
  const r = await fetch(`${API_URL}/v1/redteam/admin/engagements/${id}`, { headers: headers() });
  if (!r.ok) throw new Error(`detail failed (${r.status})`);
  return r.json();
}

export async function reviewEngagement(id, decision, note) {
  const r = await fetch(`${API_URL}/v1/redteam/admin/engagements/${id}/review`, {
    method: 'POST', headers: headers(true), body: JSON.stringify({ decision, note }),
  });
  if (!r.ok) throw new Error(`review failed (${r.status})`);
  return r.json();
}

export async function forceVerify(id, note) {
  const r = await fetch(`${API_URL}/v1/redteam/admin/engagements/${id}/force-verify`, {
    method: 'POST', headers: headers(true), body: JSON.stringify({ note: note || 'admin override' }),
  });
  if (!r.ok) throw new Error(`force-verify failed (${r.status})`);
  return r.json();
}

export async function listUsers() {
  const r = await fetch(`${API_URL}/v1/redteam/admin/users`, { headers: headers() });
  if (r.status === 401) throw new Error('unauthorized');
  if (!r.ok) throw new Error(`users failed (${r.status})`);
  return r.json(); // { configured, users }
}

// One-click "Launch attack": prepare a sanctioned target (create-or-reuse +
// force-verify + approve) and get it back ready to run against.
export async function launchTarget(domain, scopeIn) {
  const r = await fetch(`${API_URL}/v1/redteam/admin/targets`, {
    method: 'POST', headers: headers(true), body: JSON.stringify({ domain, scopeIn }),
  });
  if (r.status === 401) throw new Error('unauthorized');
  if (!r.ok) throw new Error(`launch failed (${r.status})`);
  return r.json(); // { id, domain, ownership_verified, review_status }
}

// Tokened URL so an <iframe>/<a> can load the PDF without custom headers.
export function pdfUrl(id) {
  return `${API_URL}/v1/redteam/admin/engagements/${id}/authorization.pdf?t=${encodeURIComponent(getAdminKey())}`;
}
