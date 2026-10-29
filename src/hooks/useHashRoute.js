import { useEffect, useState } from 'react';

// Tiny hash router — no dependency. '#/redteam' -> 'redteam', empty -> 'overview'.
const parse = () => {
  const h = (window.location.hash || '').replace(/^#\/?/, '').split('/')[0];
  return h || 'overview';
};

export function useHashRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (route) => {
  window.location.hash = `#/${route}`;
};
