import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import KpiRow from './components/KpiRow.jsx';
import MapSection from './components/MapSection.jsx';
import { AttackTypes, HourlyChart, Verdicts } from './components/Charts.jsx';
import RequestLog from './components/RequestLog.jsx';
import RedTeam from './components/redteam/RedTeam.jsx';
import Analyst from './components/analyst/Analyst.jsx';
import Admin from './components/admin/Admin.jsx';
import Auth from './components/auth/Auth.jsx';
import { useTheme } from './hooks/useTheme.js';
import { useDashboard } from './hooks/useDashboard.js';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useAuth } from './hooks/useAuth.js';
import { isConfigured } from './lib/supabase.js';
import { DEMO } from './lib/config.js';

export default function App() {
  const { theme, toggle } = useTheme();
  const route = useHashRoute();
  const { user, loading, isAdmin, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const { overview, logs, latest, freshId, status, exportCsv } = useDashboard(query);

  const [selCc, setSelCc] = useState(null);
  const [zoom, setZoom] = useState(1);

  const origins = overview?.origins ?? [];
  const selected = origins.find((o) => o.cc === selCc) ?? origins[0] ?? null;

  const pick = useCallback((cc) => {
    setSelCc(cc);
    setZoom((z) => Math.max(z, 2));
  }, []);

  // Admins land straight on the admin panel on first load (customers never see it).
  useEffect(() => {
    if (isConfigured && user && isAdmin && !window.location.hash) {
      window.location.hash = '#admin';
    }
  }, [user, isAdmin]);

  // Auth gate — only when Supabase env is configured, so the app still runs during setup.
  if (isConfigured && loading) {
    return <div className="min-h-screen bg-bg text-fg flex items-center justify-center font-mono text-sm text-mute">loading…</div>;
  }
  if (isConfigured && !user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="mx-auto box-border flex max-w-[1440px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        <Header theme={theme} onToggleTheme={toggle} status={status} route={route} user={user} isAdmin={isAdmin} onSignOut={signOut} />

        {route === 'redteam' ? (
          <RedTeam />
        ) : route === 'analyst' ? (
          <Analyst />
        ) : route === 'admin' ? (
          <Admin />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="m-0 text-[28px] font-medium tracking-[-0.02em]">Threat overview</h1>
                <p className="mb-0 mt-1.5 text-sm text-mute">Every request to /v1/scan, classified and traced to its origin in real time.</p>
              </div>
              {DEMO && <span className="rounded border border-line2 px-2 py-1 font-mono text-[11px] text-mute">SAMPLE DATA</span>}
            </div>

            <KpiRow kpis={overview?.kpis} />

            <MapSection
              origins={origins}
              selected={selected}
              zoom={zoom}
              latest={latest}
              onPick={pick}
              onZoomIn={() => setZoom((z) => Math.min(4, z + 1))}
              onZoomOut={() => setZoom((z) => Math.max(1, z - 1))}
              onReset={() => setZoom(1)}
            />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
              <HourlyChart hourly={overview?.hourly} />
              <AttackTypes types={overview?.types} />
              <Verdicts verdicts={overview?.verdicts} />
            </div>

            <RequestLog logs={logs} freshId={freshId} onSearch={setQuery} onExport={exportCsv} />
          </>
        )}
      </div>
    </div>
  );
}
