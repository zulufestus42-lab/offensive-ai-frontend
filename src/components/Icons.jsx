const base = { fill: 'none', stroke: 'currentColor', 'aria-hidden': true };

export const ShieldCheck = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.6" {...base}>
    <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const Sun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.7" {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const Moon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.7" {...base}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </svg>
);

export const Plus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Minus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <path d="M5 12h14" />
  </svg>
);

export const Reset = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.7" {...base}>
    <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />
  </svg>
);
