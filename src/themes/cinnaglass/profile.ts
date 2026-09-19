// profile.ts — default profile + loader (kept out of settings.tsx so that
// component file only exports components, per react-refresh).
import type { Profile } from '@/themes/cinnaglass/model';
import { loadMerged } from '@/lib/local-store';

// Seed profile for a first run, and the fallback the stored blob merges over.
export const PROFILE_DEFAULT: Profile = {
    world: '我们的小世界',
    her: '小满',
    me: '知夏',
    anniv: '2025-06-04',
    email: 'us@ourworld.love',
    lock: false,
    status: '在你身边'
};

// Read the stored profile merged over `fb`; a missing key or a parse failure
// falls back to `fb` whole.
export const gload = (k: string, fb: Profile): Profile => loadMerged(k, fb);

// ── relationship date math (world.anniversary / profile.anniv, 'YYYY-MM-DD') ──
//
// The authoritative anniversary is the DB column worlds.anniversary, with
// PROFILE_DEFAULT.anniv as the offline fallback; WorldPage composes the two and
// hands the result to every surface that shows it. These three helpers are the
// only place that date is turned into numbers — no surface does its own math.

// Parse a 'YYYY-MM-DD' anniversary at local midnight. null = not set, or not a
// date we can read (both mean "show nothing", never "crash").
export const parseAnniv = (iso: string | null | undefined): Date | null => {
    if (!iso) return null;
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
};

// Days together, counting the anniversary itself as day 1.
export const daysSince = (iso: string | null | undefined): number => {
    const d = parseAnniv(iso);
    if (!d) return 0;
    return Math.max(1, Math.floor((Date.now() - d.getTime()) / 864e5) + 1);
};

// Days until the next yearly recurrence of the anniversary (0 = today).
export const daysUntilAnniversary = (iso: string | null | undefined): number => {
    const d = parseAnniv(iso);
    if (!d) return 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (next.getTime() < today.getTime()) next.setFullYear(next.getFullYear() + 1);
    return Math.round((next.getTime() - today.getTime()) / 864e5);
};
