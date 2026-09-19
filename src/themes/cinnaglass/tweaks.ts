// tweaks.ts — user-adjustable theme settings (mood, glass style, weather, chat
// alignment), persisted to localStorage under ow-tweaks-v1.

import { useCallback, useState } from 'react';
import type { RoomMood } from './room/room-types';
import { loadMerged, saveJson } from '@/lib/local-store.ts';

// The user-facing mood setting is the room compositor's mood; one vocabulary.
export type Mood = RoomMood;
export type GlassStyle = 'cloud' | 'sky' | 'twilight';
export type WeatherTweak = 'auto' | 'sun' | 'cloud' | 'rain' | 'snow';
// chat message alignment: 'left' = everyone left-aligned (Discord-style,
// default per user decision 2026-07-12); 'sides' = own messages on the right
export type ChatAlign = 'left' | 'sides';

export type Tweaks = {
    mood: Mood;
    glassStyle: GlassStyle;
    weather: WeatherTweak;
    chatAlign: ChatAlign;
};

const STORE_KEY = 'ow-tweaks-v1';

export const TWEAK_DEFAULTS: Tweaks = {
    mood: 'twilight',
    glassStyle: 'sky',
    weather: 'auto',
    chatAlign: 'left'
};

const loadTweaks = (): Tweaks => loadMerged(STORE_KEY, TWEAK_DEFAULTS);

export type SetTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;

export function useTweaks(): [Tweaks, SetTweak] {
    const [values, setValues] = useState<Tweaks>(loadTweaks);
    const setTweak = useCallback<SetTweak>((key, value) => {
        setValues((prev) => {
            const next = { ...prev, [key]: value };
            saveJson(STORE_KEY, next);
            return next;
        });
    }, []);
    return [values, setTweak];
}