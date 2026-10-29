import { Moon, Sun } from './Icons.jsx';
import { USER_INITIALS } from '../lib/config.js';

const NAV = [
  { label: 'Overview', route: 'overview' },
  { label: 'Analyst', route: 'analyst' },
  { label: 'Red Team', route: 'redteam' },
];

const STATUS = {
  live: { text: 'LIVE · WS CONNECTED', on: true },
  demo: { text: 'LIVE · DEMO FEED', on: true },
  connecting: { text: 'CONNECTING…', on: false },
  offline: { text: 'OFFLINE · RECONNECTING', on: false },
};

export default function Header({ theme, onToggleTheme, status, route = 'overview' }) {
  const s = STATUS[status] ?? STATUS.connecting;
  const dark = theme === 'dark';
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
      <div className="flex flex-wrap items-center gap-8">
        <a href="#/overview" className="no-underline">
          <span className="text-base font-semibold tracking-[-0.01em]">Offensive AI</span>
        </a>
        <nav aria-label="Main" className="flex flex-wrap gap-1">
          {NAV.map((item) => {
            const active = route === item.route;
            return (
              <a
                key={item.route}
                href={`#/${item.route}`}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3 py-2 text-[13px] no-underline ${active ? 'bg-chip text-fg' : 'text-mute'}`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="mr-1.5 flex items-center gap-2 font-mono text-xs text-fg2" role="status">
          <span className={`live ${s.on ? '' : 'off'}`} />
          {s.text}
        </div>
        <button type="button" className="h-9 rounded-md border border-line2 bg-panel px-3.5 text-[13px] text-fg">
          Last 24 hours
        </button>
        <button type="button" className="ctl" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onToggleTheme}>
          {dark ? <Sun /> : <Moon />}
        </button>
        <button type="button" aria-label="Account" className="h-9 w-9 rounded-full border border-line2 bg-chip text-xs font-semibold text-fg">
          {USER_INITIALS}
        </button>
      </div>
    </header>
  );
}
