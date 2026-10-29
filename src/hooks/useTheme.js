import { useCallback, useEffect, useState } from 'react';

const KEY = 'offense-theme';

function initial() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(initial);

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 't-light' : 't-dark';
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage blocked: theme still works for this visit */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggle };
}
