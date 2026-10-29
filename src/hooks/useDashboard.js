import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, DASHBOARD_TOKEN, DEMO } from '../lib/config.js';
import { fetchLogs, fetchOverview, downloadCsv, saveBlob } from '../lib/api.js';
import { applyEventToOverview, demoInitialLogs, demoOverview, startDemoFeed } from '../lib/demo.js';

const ROWS = 8;

const matches = (e, q) => {
  if (!q) return true;
  const s = q.toLowerCase();
  return [e.ip, e.country, e.attackType, e.signature].some((v) => v && String(v).toLowerCase().includes(s));
};

/**
 * Everything the dashboard shows: the overview aggregates, the latest log rows,
 * the most recent event (drives the "Latest" chip and the fast pulse) and the
 * connection status. Uses the backend + Socket.IO, or the built-in sample feed.
 */
export function useDashboard(query) {
  const [overview, setOverview] = useState(() => (DEMO ? demoOverview() : null));
  const [logs, setLogs] = useState([]);
  const [latest, setLatest] = useState(null);
  const [freshId, setFreshId] = useState(null);
  const [status, setStatus] = useState(DEMO ? 'demo' : 'connecting');

  const queryRef = useRef(query);
  queryRef.current = query;
  const buffer = useRef(DEMO ? demoInitialLogs() : []);
  const refreshTimer = useRef(null);

  // ---- overview -----------------------------------------------------------------
  const refreshOverview = useCallback(() => {
    if (DEMO) return;
    fetchOverview().then(setOverview).catch((e) => console.warn('[overview]', e.message));
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      refreshOverview();
    }, 3000);
  }, [refreshOverview]);

  useEffect(() => {
    if (DEMO) return undefined;
    refreshOverview();
    const t = setInterval(refreshOverview, 30000);
    return () => clearInterval(t);
  }, [refreshOverview]);

  // ---- logs (initial + search) -----------------------------------------------------
  useEffect(() => {
    if (DEMO) {
      const rows = buffer.current.filter((e) => matches(e, query)).slice(0, ROWS);
      setLogs(rows);
      setLatest((l) => l ?? buffer.current[0] ?? null);
      return undefined;
    }
    let cancelled = false;
    fetchLogs(query, ROWS)
      .then((rows) => {
        if (cancelled) return;
        setLogs(rows);
        if (!query) setLatest((l) => l ?? rows[0] ?? null);
      })
      .catch((e) => console.warn('[logs]', e.message));
    return () => {
      cancelled = true;
    };
  }, [query]);

  // ---- live events ---------------------------------------------------------------------
  const onEvent = useCallback(
    (e) => {
      setLatest(e);
      setFreshId(e.id);
      if (matches(e, queryRef.current)) setLogs((rows) => [e, ...rows.filter((r) => r.id !== e.id)].slice(0, ROWS));
      if (DEMO) {
        buffer.current = [e, ...buffer.current].slice(0, 200);
        setOverview((ov) => applyEventToOverview(ov, e));
      } else {
        scheduleRefresh();
      }
    },
    [scheduleRefresh],
  );

  useEffect(() => {
    if (DEMO) return startDemoFeed(onEvent);
    const socket = io(API_URL, { auth: { token: DASHBOARD_TOKEN }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => setStatus('live'));
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));
    socket.on('scan', onEvent);
    return () => socket.close();
  }, [onEvent]);

  const exportCsv = useCallback(async () => {
    if (!DEMO) return downloadCsv(queryRef.current);
    const cols = ['time', 'ip', 'country', 'attackType', 'signature', 'confidence', 'action'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = buffer.current.filter((e) => matches(e, queryRef.current));
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
    saveBlob(new Blob([csv], { type: 'text/csv' }), `offense-ai-logs-${Date.now()}.csv`);
    return undefined;
  }, []);

  return { overview, logs, latest, freshId, status, exportCsv };
}
