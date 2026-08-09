// profile.ts — default profile + loader (kept out of settings.tsx so that
// component file only exports components, per react-refresh).
import type { Profile } from './model';

export const PROFILE_DEFAULT: Profile = {
    world: '我们的小世界',
    her: '小满',
    me: '知夏',
    anniv: '2025-06-04',
    email: 'us@ourworld.love',
    lock: false,
    status: '在你身边'
};

export const gload = (k: string, fb: Profile): Profile => {
    try {
        const v = localStorage.getItem(k);
        return v ? { ...fb, ...JSON.parse(v) } : fb;
    } catch {
        return fb;
    }
};

// ── relationship date math (world.anniversary / profile.anniv, 'YYYY-MM-DD') ──

// Days together, counting the anniversary itself as day 1.
export const daysSince = (iso: string | null | undefined): number => {
    if (!iso) return 0;
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return 0;
    return Math.max(1, Math.floor((Date.now() - d.getTime()) / 864e5) + 1);
};

// Days until the next yearly recurrence of the anniversary (0 = today).
export const daysUntilAnniversary = (iso: string | null | undefined): number => {
    if (!iso) return 0;
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (next.getTime() < today.getTime()) next.setFullYear(next.getFullYear() + 1);
    return Math.round((next.getTime() - today.getTime()) / 864e5);
};