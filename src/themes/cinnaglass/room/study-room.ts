// study-room.ts — first room template ("study", concept art 01/02 composition).
// All coordinates are eyeballed against the 1586x992 concept art and refined
// in-browser; adjust here, never inside the layer components.

import type { RoomTemplate } from './room-types';

export const STUDY_ROOM: RoomTemplate = {
    id: 'study',
    base: { w: 1586, h: 992 },
    art: {
        golden: '/rooms/study/golden.png',
        twilight: '/rooms/study/twilight.png',
        night: '/rooms/study/night.png'
    },
    moodFallback: {
        golden: 'golden',
        twilight: 'golden',
        night: 'night'
    },
    window: {
        // two glass leaves, inset past the curtains and the center mullion so
        // rain streaks/drops never spill onto the frame or into the room
        panes: [
            { x: 208, y: 38, w: 142, h: 528 },
            { x: 374, y: 38, w: 144, h: 528 }
        ],
        glow: { x: 110, y: 15, w: 585, h: 660 }
    },
    clock: {
        center: { x: 1385, y: 136 },
        radius: 86
    },
    seats: [
        {
            id: 'blue',
            foot: { x: 468, y: 798 },
            height: 400,
            phase: 0,
            headRatio: 0.92 // upright sit — head near the art's top edge
        },
        {
            id: 'pink',
            foot: { x: 1005, y: 634 },
            height: 385,
            phase: 1.7,
            headRatio: 0.86 // leaning over the desk — visual head sits lower
        }
    ],
    // furniture → feature entries (ai/UX.md §2); regions eyeballed on the
    // clean twilight art, refined in-browser like everything else here
    hotspots: [
        { id: 'timeline', rect: { x: 790, y: 480, w: 260, h: 130 } }, // open diary
        { id: 'photos', rect: { x: 930, y: 35, w: 250, h: 165 } }, // frame shelf
        { id: 'clock', rect: { x: 1290, y: 42, w: 190, h: 190 } }, // wall clock
        { id: 'music', rect: { x: 840, y: 740, w: 260, h: 175 } }, // turntable
        { id: 'wishlist', rect: { x: 1225, y: 405, w: 150, h: 245 } } // star jar
    ]
};
