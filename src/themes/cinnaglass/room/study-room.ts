// study-room.ts — first room template ("study", concept art 01/02 composition).
// All coordinates are eyeballed against the 1586x992 concept art and refined
// in-browser; adjust here, never inside the layer components.

import type { RoomTemplate } from './room-types';

// The study: every anchor below is measured against the 1586x992 base art.
export const STUDY_ROOM: RoomTemplate = {
    id: 'study',
    base: { w: 1586, h: 992 },
    // clean plates: the painting with the tonearm erased (it ships as a
    // living-prop part instead). Untouched originals — the measurement truth
    // for every anchor below — live in arts/rooms/study/source/.
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
    // furniture → feature entries (see ai/design_system/props.md); regions
    // eyeballed on the clean twilight art, refined in-browser like everything
    // else here.
    hotspots: [
        { id: 'timeline', rect: { x: 790, y: 480, w: 260, h: 130 } }, // open diary on the desk
        { id: 'photos', rect: { x: 930, y: 35, w: 250, h: 165 } }, // photo frames on the shelf
        { id: 'clock', rect: { x: 1290, y: 42, w: 190, h: 190 } }, // round wall clock
        { id: 'music', rect: { x: 840, y: 740, w: 260, h: 175 } }, // turntable case on the low table
        { id: 'wishlist', rect: { x: 1225, y: 405, w: 150, h: 245 } } // star jar
    ],
    // living props — geometry MEASURED on the art, not eyeballed: the vinyl
    // rim is a least-squares ellipse over 137 edge samples (rms 0.5px, see
    // scripts/fit-disc-ellipse.py); golden/twilight/night share the
    // composition within ±0.5px, so one spec serves all three moods.
    props: {
        turntable: {
            platter: { cx: 963.6, cy: 844.7, rx: 82.4, ry: 49.9, tilt: 0.128 },
            // label ellipse center (fit the same way); 3.8px above the rim
            // center = the painting's real perspective, not a drawing error
            center: { x: 962.6, y: 841.0 },
            armPivot: { x: 1062.5, y: 844 },
            // layers assembled by scripts/build-turntable-parts.py (v5: the
            // painted record split by symmetry, per mood) — every number
            // below is pasted from its manifest, never eyeballed
            platterArt: {
                golden: '/rooms/study/parts/platter-golden.png',
                twilight: '/rooms/study/parts/platter-twilight.png',
                night: '/rooms/study/parts/platter-night.png'
            },
            platterLight: {
                golden: { add: '/rooms/study/parts/platter-light-add-golden.png', mul: '/rooms/study/parts/platter-light-mul-golden.png' },
                twilight: { add: '/rooms/study/parts/platter-light-add-twilight.png', mul: '/rooms/study/parts/platter-light-mul-twilight.png' },
                night: { add: '/rooms/study/parts/platter-light-add-night.png', mul: '/rooms/study/parts/platter-light-mul-night.png' }
            },
            arm: { src: '/rooms/study/parts/tonearm.png', box: { x: 976, y: 834, w: 102, h: 82 } },
            armTint: { golden: 0xffffff, twilight: 0x808bc0, night: 0x78828a },
            spindle: {
                src: { golden: '/rooms/study/parts/spindle-golden.png', twilight: '/rooms/study/parts/spindle-twilight.png', night: '/rooms/study/parts/spindle-night.png' },
                box: { x: 954, y: 828, w: 18, h: 22 }
            },
            // light from the window (upper left) by day, from the desk lamp at
            // night: the shadow leans further right and longer after dark
            armShadow: {
                golden: { dx: 2, dy: 4 },
                twilight: { dx: 1.5, dy: 4 },
                night: { dx: 3, dy: 5 }
            },
            // no `stills`: the record's own center hole shows the machine's
            // spindle pin through it, nothing else on the platter is static
        }
    }
};
