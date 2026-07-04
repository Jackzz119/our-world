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