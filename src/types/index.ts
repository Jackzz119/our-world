// Whitelist of env var names the app may read (see .env.example) — keeps the
// getEnv* helpers from resolving a typo to undefined.
export type EnvName = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_DEV' | 'VITE_DEV_EMAIL' | 'VITE_DEV_PASSWORD' | 'VITE_AUTO_ENTER';
