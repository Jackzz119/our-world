import type { EnvName } from '@/types';

export function getEnv(name: EnvName): string {
    const value = import.meta.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
