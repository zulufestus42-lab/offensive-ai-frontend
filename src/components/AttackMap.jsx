import { useEffect, useMemo, useRef, useState } from 'react';
import { geoCentroid, geoContains, geoDistance, geoGraticule, geoNaturalEarth1, geoPath } from 'd3-geo';
import world from '../data/countries.geo.json';
import { Minus, Plus, Reset } from './Icons.jsx';
import { clock } from '../lib/format.js';
import { PROTECTED } from '../lib/config.js';

// ---- Static geometry: projected once ----------------------------------------------------
// The whole world is shown, rotated so Africa sits in the centre (central meridian 20°E).
const W = 1000;
const H = 500;
const CENTER_LON = 20;
const projection = geoNaturalEarth1()
  .rotate([-CENTER_LON, 0])
  .fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' });
const path = geoPath(projection);
const SPHERE = path({ type: 'Sphere' });
const GRID_MINOR = path(geoGraticule().step([10, 10]).extentMinor([[-180, -80 - 1e-6], [180, 80 + 1e-6]])());
const GRID_MAJOR = path(geoGraticule().step([30, 30]).extentMajor([[-180, -90], [180, 90]]).extentMinor([[-180, -60 - 1e-6], [180, 60 + 1e-6]])());
const EQUATOR = path({ type: 'LineString', coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]] });
const COUNTRIES = world.features.map((f) => ({
  id: f.id,
  name: f.properties.name,
  d: path(f),
  feature: f,
  centroid: geoCentroid(f),
}));

/** Which country a coordinate falls in; nearest centroid if it lands just off a coastline. */
function countryAt(lat, lon) {
  const p = [lon, lat];
  const hit = COUNTRIES.find((c) => geoContains(c.feature, p));
  if (hit) return hit.id;
  let best = null;
  let bestD = Infinity;
  for (const c of COUNTRIES) {
    const d = geoDistance(c.centroid, p);
    if (d < bestD) {
      bestD = d;
      best = c.id;
    }
  }
  return bestD < 0.1 ? best : null;
}

export function toPercent(lat, lon) {
  const [x, y] = projection([lon, lat]);
  return { x: (x / W) * 100, y: (y / H) * 100 };
}

const HOME_ID = countryAt(PROTECTED.lat, PROTECTED.lon);
const HOME_POS = toPercent(PROTECTED.lat, PROTECTED.lon);
const HOME_NAME = (COUNTRIES.find((c) => c.id === HOME_ID)?.name ?? PROTECTED.label).toUpperCase();
const HOME_LABEL = (() => {
  const [x, y] = projection([PROTECTED.lon, PROTECTED.lat]);
  return [x + 20, y + 3];
})();

export default function AttackMap({ origins, selected, zoom, latest, onPick, onZoomIn, onZoomOut, onReset }) {
  const [hover, setHover] = useState(null);

  // Live pings: every incoming attack flashes a bright, expanding pulse at its exact
  // location the instant it arrives — independent of the aggregated origin pins, so it
  // fires on the very first attack and even when the origin is the protected country.
  const [pings, setPings] = useState([]);
  const firstLatest = useRef(true);
  useEffect(() => {
    if (!latest) return undefined;
    if (firstLatest.current) {
      firstLatest.current = false;
      return undefined; // don't ping for the row that was already there on load
    }
    if (!Number.isFinite(latest.lat) || !Number.isFinite(latest.lon)) return undefined;
    const pos = toPercent(latest.lat, latest.lon);
    const id = `${latest.id}:${Date.now()}`;
    setPings((list) => [...list.slice(-6), { id, x: pos.x, y: pos.y, block: latest.action === 'BLOCK' }]);
    const t = setTimeout(() => setPings((list) => list.filter((p) => p.id !== id)), 2300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.id]);

  const hot = useMemo(() => {
    const ids = new Set();
    for (const o of origins) {
      const id = countryAt(o.lat, o.lon);
      if (id && id !== HOME_ID) ids.add(id);
    }
    return ids;
  }, [origins]);

  const pins = useMemo(() => origins.map((o, i) => ({ ...o, pos: toPercent(o.lat, o.lon), delay: `${(i * 0.37).toFixed(2)}s` })), [origins]);

  const selPos = selected ? toPercent(selected.lat, selected.lon) : null;
  const dx = zoom > 1 && selPos ? 50 - selPos.x : 0;
  const dy = zoom > 1 && selPos ? 50 - selPos.y : 0;

  return (
    <div className="relative flex min-w-0 flex-[999_1_620px] items-center overflow-hidden border-r border-line px-2 py-6">
      <div className="mapzoom relative aspect-[2/1] w-full" style={{ transform: `scale(${zoom}) translate(${dx.toFixed(2)}%, ${dy.toFixed(2)}%)` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 block h-full w-full" role="img" aria-label="World map centred on Africa, with attack origin countries shaded">
          <path d={SPHERE} className="map-sphere" />
          <path d={GRID_MINOR} className="map-grid-minor" />
          <path d={GRID_MAJOR} className="map-grid-major" />
          <path d={EQUATOR} className="map-equator" />
          <g onMouseLeave={() => setHover(null)}>
            {COUNTRIES.map((c) => (
              <path
                key={c.id}
                d={c.d}
                className={`map-land ${c.id === HOME_ID ? 'home' : hot.has(c.id) ? 'hot' : ''}`}
                onMouseEnter={() => setHover(c.name)}
              />
            ))}
          </g>
          <path d={SPHERE} className="map-outline" />
          <text x={HOME_LABEL[0]} y={HOME_LABEL[1]} className="map-home-label" style={{ fontSize: `${9 / zoom}px` }}>
            {HOME_NAME}
          </text>
        </svg>
        <span className="home-pin" style={{ left: `${HOME_POS.x}%`, top: `${HOME_POS.y}%`, transform: `scale(${1 / zoom})` }} />
        {pins.map((p) => (
          <button
            key={p.cc}
            type="button"
            className={`pin ${latest?.countryCode === p.cc ? 'hot' : ''} ${selected?.cc === p.cc ? 'sel' : ''}`}
            aria-label={`${p.name}, ${p.blocked.toLocaleString('en-US')} blocked`}
            onClick={() => onPick(p.cc)}
            style={{ left: `${p.pos.x}%`, top: `${p.pos.y}%`, transform: `scale(${(1 / zoom).toFixed(3)})` }}
          >
            <span className="ring" style={{ animationDelay: p.delay }} />
            <span className="core" />
            <span className="tip">
              {p.name} · {p.blocked.toLocaleString('en-US')}
            </span>
          </button>
        ))}
        {pings.map((p) => (
          <span key={p.id} className="ping" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `scale(${(1 / zoom).toFixed(3)})` }} aria-hidden="true">
            <span className="ping-ring" />
            <span className="ping-ring two" />
            <span className="ping-core" />
          </span>
        ))}
      </div>

      {hover && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-line2 bg-glass px-3 py-1.5 text-xs" aria-hidden="true">
          {hover}
        </div>
      )}

      <div className="absolute right-4 top-4 flex flex-col gap-1.5">
        <button type="button" className="ctl" aria-label="Zoom in" onClick={onZoomIn}>
          <Plus />
        </button>
        <button type="button" className="ctl" aria-label="Zoom out" onClick={onZoomOut}>
          <Minus />
        </button>
        <button type="button" className="ctl" aria-label="Reset view" onClick={onReset}>
          <Reset />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 flex max-w-[calc(100%-32px)] flex-wrap items-center gap-2.5 rounded-lg border border-line2 bg-glass px-3.5 py-2.5 text-xs" aria-live="polite">
        <span className="live" />
        <span className="text-mute">Latest</span>
        {latest ? (
          <>
            <span>{latest.attackType}</span>
            <span className="font-mono text-fg2">
              {latest.ip} · {latest.country ?? 'Unknown'} · {clock(latest.time)}
            </span>
          </>
        ) : (
          <span className="text-fg2">Waiting for traffic</span>
        )}
      </div>
    </div>
  );
}
