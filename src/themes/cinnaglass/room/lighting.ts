// lighting.ts — the scene light handed to everything that moves. The plates
// carry their own painted light (dead things keep the painting's light), so
// the only tuned values left are the multiply tint for living layers per hour
// and weather, and the weather grade on the whole world. This is the only
// place they are tuned.

import type { RoomMood, RoomWeather } from '@/themes/cinnaglass/room/room-types';

/**
 * Multiply tint for the partner, props and the viewer's hands per hour and
 * weather: how much of the room's light they take. Past tuning rounds are in
 * arts/archive/v2-companion-house/codex-batches/20260811-044310Z/codex-report.md.
 */
export const ACTOR_TINT: Record<RoomMood, Record<RoomWeather, number>> = {
    golden: { sun: 0xffe8cf, rain: 0xd8dde8 },
    twilight: { sun: 0xf8ddd2, rain: 0xd4d2e4 },
    night: { sun: 0xc2cbe6, rain: 0xb8c0dd }
};

// weather-wide grading applied to the whole world container (art included)
export const WEATHER_GRADE: Record<RoomWeather, { saturation: number; brightness: number }> = {
    sun: { saturation: 1, brightness: 1 },
    rain: { saturation: 0.86, brightness: 0.96 }
};
