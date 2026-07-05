import type { EnvName } from '@/types';

export function getEnv(name: EnvName): string {
    const value = import.meta.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

// Optional boolean flag: missing/anything-but-'true' → false. For dev-only
// switches that must not crash the app when absent (unlike getEnv).
export function getEnvFlag(name: EnvName): boolean {
    return import.meta.env[name] === 'true';
}

// Optional string: missing/empty → null. For dev-only values that must not
// crash the app when absent (unlike getEnv).
export function getEnvOptional(name: EnvName): string | null {
    return import.meta.env[name] || null;
}
