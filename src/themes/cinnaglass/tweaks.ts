// tweaks.ts — production replacement for the prototype's host-driven useTweaks.
// Drops the omelette postMessage protocol; persists tweak values to localStorage.

import { useCallback, useState } from 'react';

export type Mood = 'golden' | 'twilight' | 'night';
export type GlassStyle = 'cloud' | 'sky' | 'twilight';
export type HudLayout = 'scatter' | 'cluster' | 'topbar';
export type Density = 'minimal' | 'rich';
export type WeatherTweak = 'auto' | 'sun' | 'cloud' | 'rain' | 'snow';
// chat message alignment: 'left' = everyone left-aligned (Discord-style,
// default per user decision 2026-07-12); 'sides' = own messages on the right
export type ChatAlign = 'left' | 'sides';

export type Tweaks = {
    mood: Mood;
    hudLayout: HudLayout;
    glassStyle: GlassStyle;
    density: Density;
    weather: WeatherTweak;
    chatAlign: ChatAlign;
};

const STORE_KEY = 'ow-tweaks-v1';

export const TWEAK_DEFAULTS: Tweaks = {
    mood: 'twilight',
    hudLayout: 'scatter',
    glassStyle: 'sky',
    density: 'rich',
    weather: 'auto',
    chatAlign: 'left'
};

const loadTweaks = (): Tweaks => {
    try {
        const v = localStorage.getItem(STORE_KEY);
        return v ? { ...TWEAK_DEFAULTS, ...JSON.parse(v) } : TWEAK_DEFAULTS;
    } catch {
        return TWEAK_DEFAULTS;
    }
};

export type SetTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;

export function useTweaks(): [Tweaks, SetTweak] {
    const [values, setValues] = useState<Tweaks>(loadTweaks);
    const setTweak = useCallback<SetTweak>((key, value) => {
        setValues((prev) => {
            const next = { ...prev, [key]: value };
            try {
                localStorage.setItem(STORE_KEY, JSON.stringify(next));
            } catch {
                /* ignore */
            }
            return next;
        });
    }, []);
    return [values, setTweak];
}