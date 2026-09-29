// The low-motion mode. Settings stores a preference ('system' | 'full' |
// 'reduced'); this module resolves it against the OS setting and publishes the
// result as html[data-motion="full|reduced"], so every stylesheet (motion.css
// tokens) and the Pixi room read one answer. 'system' keeps following the OS
// switch live. The frozen diary still reads the OS setting directly.
import { useEffect } from 'react';
import { loadJson } from '@/lib/local-store';
import type { MotionPref } from '@/themes/cinnaglass/tweaks';

const QUERY = '(prefers-reduced-motion: reduce)';

// Resolve a stored preference to what the page should do right now.
export const resolveMotion = (pref: MotionPref): 'full' | 'reduced' =>
    pref === 'system' ? (matchMedia(QUERY).matches ? 'reduced' : 'full') : pref;

// Publish the resolved mode; with 'system' keep listening to the OS switch. Returns the unsubscribe.
export function applyMotion(pref: MotionPref): () => void {
    const root = document.documentElement;
    const publish = () => {
        root.dataset.motion = resolveMotion(pref);
    };
    publish();
    if (pref !== 'system') return () => {};
    const query = matchMedia(QUERY);
    query.addEventListener('change', publish);
    return () => query.removeEventListener('change', publish);
}

// Before the first render (login and lobby have no tweaks state yet): read the stored choice.
export function applyStoredMotion(): () => void {
    const stored = loadJson<{ motion?: unknown } | null>('ow-tweaks-v1', null)?.motion;
    return applyMotion(stored === 'full' || stored === 'reduced' ? stored : 'system');
}

// WorldPage keeps html[data-motion] in step with the live setting.
export function useMotionPreference(pref: MotionPref) {
    useEffect(() => applyMotion(pref), [pref]);
}

// Imperative readers (the Pixi room, particle bursts) ask the published answer.
export const motionReduced = (): boolean =>
    document.documentElement.dataset.motion
        ? document.documentElement.dataset.motion === 'reduced'
        : matchMedia(QUERY).matches;
