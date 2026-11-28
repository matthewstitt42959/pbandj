export const KOFI_URL = 'https://ko-fi.com/matthews26633';

// The arcade listing now lives on the Broken Archive games platform, not inside this app —
// override with VITE_GAMES_HUB_URL in .env.local if it's running on a non-default port.
export const GAMES_HUB_URL =
  import.meta.env.VITE_GAMES_HUB_URL ||
  (import.meta.env.DEV ? 'http://games.localhost:3000' : 'https://games.broken-archive.com');
