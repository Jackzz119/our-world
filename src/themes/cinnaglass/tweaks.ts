// tweaks.ts — user-adjustable theme settings (mood, glass style, weather, chat
// alignment), persisted to localStorage under ow-tweaks-v1.

import { useCallback, useState } from 'react';
import type { RoomMood } from './room/room-types';
import { loadMerged, saveJson } from '@/lib/local-store.ts';

// Alias of the scene's RoomMood: the panel only overrides an hour the room
// already understands, so the two never drift apart.
export type Mood = RoomMood;
// Which glass tint the shell wears; read back as the data-glass attribute.
export type GlassStyle = 'cloud' | 'sky' | 'twilight';
// The weather setting, including 'auto' — which is a mode (follow the real
// forecast), not a weather.
export type WeatherTweak = 'auto' | 'sun' | 'cloud' | 'rain' | 'snow';
// chat message alignment: 'left' = everyone left-aligned (Discord-style,
// default per user decision 2026-07-12); 'sides' = own messages on the right
export type ChatAlign = 'left' | 'sides';

// Everything the ambience and settings panels can change, stored as one blob.
export type Tweaks = {
    mood: Mood;
    glassStyle: GlassStyle;
    weather: WeatherTweak;
    chatAlign: ChatAlign;
};

// localStorage key; bump the suffix when the stored shape changes incompatibly.
const STORE_KEY = 'ow-tweaks-v1';

// Values for a first visit, and the fallback every stored blob is merged over.
export const TWEAK_DEFAULTS: Tweaks = {
    mood: 'twilight',
    glassStyle: 'sky',
    weather: 'auto',
    chatAlign: 'left'
};

// Stored tweaks merged over the defaults; a missing or unparsable blob falls
// back to the defaults whole.
const loadTweaks = (): Tweaks => loadMerged(STORE_KEY, TWEAK_DEFAULTS);

// Set one tweak by key, keeping the value's type tied to that key.
export type SetTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;

// Tweak state for the session: the current values plus a setter that writes
// through to localStorage on every change.
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