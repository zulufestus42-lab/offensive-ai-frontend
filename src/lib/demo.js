// Built-in sample data, used when no backend is configured (VITE_DEMO=true or no VITE_API_URL).
// IPs are from the reserved documentation ranges (RFC 5737). Signatures are descriptions only.

const ORIGINS = [
  { cc: 'RUS', name: 'Russia', lat: 55.7, lon: 37.6, blocked: 1084, uniqueIps: 212, topAttack: 'Command Injection' },
  { cc: 'CHN', name: 'China', lat: 39.9, lon: 116.4, blocked: 862, uniqueIps: 188, topAttack: 'SQL Injection' },
  { cc: 'USA', name: 'United States of America', lat: 39.0, lon: -77.5, blocked: 611, uniqueIps: 143, topAttack: 'SQL Injection' },
  { cc: 'NLD', name: 'Netherlands', lat: 52.4, lon: 4.9, blocked: 402, uniqueIps: 71, topAttack: 'Cross-site scripting' },
  { cc: 'BRA', name: 'Brazil', lat: -23.5, lon: -46.6, blocked: 318, uniqueIps: 96, topAttack: 'Path Traversal' },
  { cc: 'NGA', name: 'Nigeria', lat: 6.5, lon: 3.4, blocked: 240, uniqueIps: 64, topAttack: 'SSRF' },
  { cc: 'VNM', name: 'Vietnam', lat: 21.0, lon: 105.8, blocked: 198, uniqueIps: 52, topAttack: 'SQL Injection' },
  { cc: 'IND', name: 'India', lat: 19.1, lon: 72.9, blocked: 121, uniqueIps: 40, topAttack: 'Cross-site scripting' },
  { cc: 'ROU', name: 'Romania', lat: 44.4, lon: 26.1, blocked: 83, uniqueIps: 19, topAttack: 'Command Injection' },
];

const POOL = [
  { ip: '203.0.113.24', cc: 'RUS', attackType: 'Command Injection', signature: 'shell separator in parameter', confidence: 74.0, action: 'BLOCK' },
  { ip: '198.51.100.7', cc: 'CHN', attackType: 'SQL Injection', signature: 'tautology in login field', confidence: 98.6, action: 'BLOCK' },
  { ip: '192.0.2.181', cc: 'NLD', attackType: 'Cross-site scripting', signature: 'event handler attribute', confidence: 96.1, action: 'BLOCK' },
  { ip: '203.0.113.92', cc: 'BRA', attackType: 'Path Traversal', signature: 'parent directory sequence', confidence: 93.4, action: 'BLOCK' },
  { ip: '198.51.100.44', cc: 'USA', attackType: 'Benign', signature: 'JSON form post', confidence: 12.3, action: 'ALLOW' },
  { ip: '192.0.2.66', cc: 'NGA', attackType: 'SSRF', signature: 'internal address in URL', confidence: 89.7, action: 'BLOCK' },
  { ip: '203.0.113.150', cc: 'VNM', attackType: 'SQL Injection', signature: 'UNION keyword in query', confidence: 97.2, action: 'BLOCK' },
  { ip: '198.51.100.201', cc: 'ROU', attackType: 'Command Injection', signature: 'shell separator in header', confidence: 91.8, action: 'BLOCK' },
  { ip: '192.0.2.12', cc: 'IND', attackType: 'Cross-site scripting', signature: 'image error handler', confidence: 88.5, action: 'BLOCK' },
];

const HOURLY = [120, 311, 240, 180, 96, 70, 64, 82, 140, 188, 206, 232, 198, 176, 214, 260, 244, 205, 190, 226, 248, 270, 236, 212];

let seq = 0;
function toEvent(p, time) {
  const o = ORIGINS.find((x) => x.cc === p.cc);
  return { id: `demo-${++seq}`, time, ip: p.ip, countryCode: p.cc, country: o.name, city: null, lat: o.lat, lon: o.lon, attackType: p.attackType, signature: p.signature, confidence: p.confidence, action: p.action };
}

export function demoInitialLogs() {
  const now = Date.now();
  return POOL.concat(POOL, POOL).map((p, i) => toEvent(p, new Date(now - i * 9000).toISOString()));
}

export function demoOverview() {
  const top = new Date();
  top.setMinutes(0, 0, 0);
  return {
    kpis: { requests: 128402, requestsPrev: 118671, blocked: 3917, uniqueIps: 1204, newIps: 214, medianConfidence: 91.2 },
    hourly: HOURLY.map((blocked, i) => ({ hour: new Date(top.getTime() - (23 - i) * 3600e3).toISOString(), blocked })),
    types: [
      { name: 'Command Injection', pct: 34 },
      { name: 'SQL Injection', pct: 27 },
      { name: 'Cross-site scripting', pct: 18 },
      { name: 'Path Traversal', pct: 11 },
      { name: 'SSRF', pct: 6 },
    ],
    verdicts: { blocked: 82, review: 11, allowed: 7 },
    origins: ORIGINS.map((o) => ({ ...o, lastSeen: new Date(Date.now() - 40e3).toISOString() })),
  };
}

/** Emits one sample event every ~2.8s. Returns a stop function. */
export function startDemoFeed(onEvent) {
  let n = 0;
  const t = setInterval(() => {
    n += 1;
    onEvent(toEvent(POOL[(n + 7) % POOL.length], new Date().toISOString()));
  }, 2800);
  return () => clearInterval(t);
}

/** Fold one event into an overview so demo numbers move like the real ones. */
export function applyEventToOverview(ov, e) {
  const blocked = e.action === 'BLOCK';
  const hourly = ov.hourly.slice();
  if (blocked) hourly[hourly.length - 1] = { ...hourly[hourly.length - 1], blocked: hourly[hourly.length - 1].blocked + 1 };
  return {
    ...ov,
    kpis: { ...ov.kpis, requests: ov.kpis.requests + 1, blocked: ov.kpis.blocked + (blocked ? 1 : 0) },
    hourly,
    origins: ov.origins
      .map((o) => (blocked && o.cc === e.countryCode ? { ...o, blocked: o.blocked + 1, lastSeen: e.time } : o))
      .sort((a, b) => b.blocked - a.blocked),
  };
}
