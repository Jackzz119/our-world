// local-store.ts — the theme's persisted slices (tweaks, profile, dates, alarms,
// wishes) live in localStorage under stable `ow-*-v1` keys. Reads never throw:
// missing or corrupt JSON falls back to the caller's default so a bad blob can
// not blank the app. Writes are best-effort (quota / private mode are ignored).

// Parse a stored JSON value or return the fallback untouched.
export function loadJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

// Like loadJson, but overlays the stored object on the defaults so keys added
// in newer versions get their default instead of `undefined`.
export function loadMerged<T extends object>(key: string, defaults: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<T>) } : defaults;
    } catch {
        return defaults;
    }
}

// Persist a value as JSON; storage failures are swallowed on purpose.
export function saveJson<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* ignore */
    }
}
