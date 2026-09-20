import type { EnvName } from '@/types';

// Every env read goes through this static table. Vite only inlines
// `import.meta.env.X` when X is written out literally; a dynamic
// `import.meta.env[name]` makes it embed the WHOLE env object into the bundle,
// which put the dev login password into `dist/` whenever .env.local had one.
// The two dev credentials are also gated on `import.meta.env.DEV` so a
// production build folds them to `undefined` and never contains their text.
const ENV: Record<EnvName, string | undefined> = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_DEV: import.meta.env.DEV ? import.meta.env.VITE_DEV : undefined,
    VITE_DEV_EMAIL: import.meta.env.DEV ? import.meta.env.VITE_DEV_EMAIL : undefined,
    VITE_DEV_PASSWORD: import.meta.env.DEV ? import.meta.env.VITE_DEV_PASSWORD : undefined,
    VITE_AUTO_ENTER: import.meta.env.VITE_AUTO_ENTER
};

// Required env var: throws at module-eval time when missing, so a misconfigured
// build fails loudly instead of silently talking to nothing.
export function getEnv(name: EnvName): string {
    const value = ENV[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

// Optional boolean flag: missing/anything-but-'true' → false. For dev-only
// switches that must not crash the app when absent (unlike getEnv).
export function getEnvFlag(name: EnvName): boolean {
    return ENV[name] === 'true';
}

// Optional string: missing/empty → null. For dev-only values that must not
// crash the app when absent (unlike getEnv).
export function getEnvOptional(name: EnvName): string | null {
    return ENV[name] || null;
}
