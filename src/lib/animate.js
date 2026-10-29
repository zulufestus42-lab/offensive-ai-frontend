import { createElement, useEffect, useRef, useState } from 'react';

// Fire once when the element scrolls into view.
export function useInView(threshold = 0.3) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// Count from 0 to target (ease-out). Starts only when `active` becomes true.
export function useCountUp(target, active, { duration = 1200, decimals = 0 } = {}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    let raf;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      setVal(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, decimals]);
  return decimals ? Number(val.toFixed(decimals)) : Math.round(val);
}

// Convenience: a number that counts up when scrolled into view.
// Use in KpiRow etc:  <Count to={1284} />   <Count to={97.4} decimals={1} suffix="%" />
export function Count({ to = 0, decimals = 0, prefix = '', suffix = '', format, className, style }) {
  const [ref, inView] = useInView();
  const v = useCountUp(to, inView, { decimals });
  const text = format ? format(v) : Number(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return createElement('span', { ref, className, style }, `${prefix}${text}${suffix}`);
}
