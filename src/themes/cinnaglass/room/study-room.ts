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
    // clean twilight art, refined in-browser like everything else here.
    // `outline` = hand-traced silhouette for the golden hint stroke.
    hotspots: [
        {
            id: 'timeline', // open diary on the desk
            rect: { x: 790, y: 480, w: 260, h: 130 },
            outline: [
                { x: 806, y: 560 },
                { x: 824, y: 512 },
                { x: 920, y: 488 },
                { x: 1010, y: 500 },
                { x: 1042, y: 540 },
                { x: 1024, y: 588 },
                { x: 920, y: 612 },
                { x: 836, y: 598 }
            ]
        },
        {
            id: 'photos', // photo frames on the shelf
            rect: { x: 930, y: 35, w: 250, h: 165 },
            outline: [
                { x: 952, y: 168 },
                { x: 956, y: 58 },
                { x: 1078, y: 42 },
                { x: 1086, y: 96 },
                { x: 1158, y: 92 },
                { x: 1166, y: 186 },
                { x: 1060, y: 196 }
            ]
        },
        {
            id: 'clock', // round wall clock — circle synthesized below
            rect: { x: 1290, y: 42, w: 190, h: 190 }
        },
        {
            id: 'music', // turntable case on the low table
            rect: { x: 840, y: 740, w: 260, h: 175 },
            outline: [
                { x: 880, y: 798 },
                { x: 930, y: 704 },
                { x: 1080, y: 670 },
                { x: 1096, y: 746 },
                { x: 1102, y: 848 },
                { x: 996, y: 900 },
                { x: 890, y: 866 }
            ]
        },
        {
            id: 'wishlist', // star jar
            rect: { x: 1225, y: 405, w: 150, h: 245 },
            outline: [
                { x: 1286, y: 606 },
                { x: 1270, y: 540 },
                { x: 1272, y: 470 },
                { x: 1292, y: 432 },
                { x: 1296, y: 408 },
                { x: 1382, y: 406 },
                { x: 1388, y: 430 },
                { x: 1408, y: 468 },
                { x: 1412, y: 545 },
                { x: 1396, y: 608 },
                { x: 1340, y: 622 }
            ]
        }
    ]
};
