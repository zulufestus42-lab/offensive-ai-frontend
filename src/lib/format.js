export const num = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US'));

export const pct = (n, digits = 1) => (n === null || n === undefined ? '—' : `${Number(n).toFixed(digits)}%`);

export const clock = (t) => new Date(t).toTimeString().slice(0, 8);

export const hourLabel = (t) => `${String(new Date(t).getHours()).padStart(2, '0')}:00`;

export const latLabel = (lat) => `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
export const lonLabel = (lon) => `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;

/** "Command Injection" -> "Command injection", keeps acronyms like SQL and SSRF. */
export function sentence(s) {
  if (!s) return '—';
  return s
    .split(' ')
    .map((w, i) => (i === 0 || w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(' ');
}

export function deltaVsYesterday(now, prev) {
  if (!prev) return 'first day of data';
  const d = ((now - prev) / prev) * 100;
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}% vs yesterday`;
}
