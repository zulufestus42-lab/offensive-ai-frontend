const env = import.meta.env;

export const API_URL = (env.VITE_API_URL ?? '').replace(/\/$/, '');
export const DASHBOARD_TOKEN = env.VITE_DASHBOARD_TOKEN ?? '';
export const DEMO = env.VITE_DEMO === 'true' || !API_URL;

export const PROTECTED = {
  label: env.VITE_PROTECTED_LABEL ?? 'Lusaka, Zambia',
  lat: Number(env.VITE_PROTECTED_LAT ?? -15.42),
  lon: Number(env.VITE_PROTECTED_LON ?? 28.28),
};

export const USER_INITIALS = env.VITE_USER_INITIALS ?? 'FZ';
