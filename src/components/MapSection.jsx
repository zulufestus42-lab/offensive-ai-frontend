import AttackMap from './AttackMap.jsx';
import OriginPanel from './OriginPanel.jsx';
import { PROTECTED } from '../lib/config.js';

export default function MapSection({ origins, selected, zoom, latest, onPick, onZoomIn, onZoomOut, onReset }) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="m-0 text-[15px] font-medium">Live attack map</h2>
          <div className="mt-1 text-xs text-mute">Origin countries shaded red · pulses fire as blocked requests arrive</div>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-xs text-fg2">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger" />
            Attack origin
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-home" />
            Protected · {PROTECTED.label}
          </span>
          <span className="font-mono text-mute">10° GRID · NATURAL EARTH</span>
        </div>
      </div>
      <div className="flex flex-wrap">
        <AttackMap
          origins={origins}
          selected={selected}
          zoom={zoom}
          latest={latest}
          onPick={onPick}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onReset={onReset}
        />
        <OriginPanel origins={origins} selected={selected} latest={latest} onPick={onPick} />
      </div>
    </section>
  );
}
