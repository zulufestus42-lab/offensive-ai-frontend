import { API_URL, DASHBOARD_TOKEN } from './config.js';

const headers = () => ({ Authorization: `Bearer ${DASHBOARD_TOKEN}` });

async function get(path) {
  const res = await fetch(`${API_URL}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res;
}

export const fetchOverview = async () => (await get('/api/overview')).json();

export async function askAnalyst(question) {
  const res = await fetch(`${API_URL}/api/analyst`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`analyst → ${res.status}`);
  return res.json();
}

export const fetchLogs = async (q = '', limit = 8) =>
  (await get(`/api/logs?limit=${limit}&q=${encodeURIComponent(q)}`)).json();

export async function downloadCsv(q = '') {
  const blob = await (await get(`/api/logs.csv?q=${encodeURIComponent(q)}`)).blob();
  saveBlob(blob, `offense-ai-logs-${Date.now()}.csv`);
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
