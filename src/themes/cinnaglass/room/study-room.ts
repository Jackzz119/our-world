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
            armPatch: [
                { x: 1056, y: 853 },
                { x: 1040, y: 861 },
                { x: 1025, y: 868 },
                { x: 1012, y: 873 },
                { x: 1003, y: 878 },
                { x: 994, y: 880 },
                { x: 980, y: 884 },
                { x: 972, y: 892 },
                { x: 973, y: 903 },
                { x: 982, y: 912 },
                { x: 996, y: 914 },
                { x: 1008, y: 908 },
                { x: 1012, y: 898 },
                { x: 1022, y: 890 },
                { x: 1036, y: 878 },
                { x: 1048, y: 872 },
                { x: 1058, y: 866 }
            ],
            stills: [
                // spindle pin standing on the label (generous: the label
                // around it is flat colour, so a static margin costs nothing)
                [
                    { x: 955, y: 826 },
                    { x: 972, y: 826 },
                    { x: 973, y: 850 },
                    { x: 954, y: 850 }
                ]
            ]
        }
    }
};
