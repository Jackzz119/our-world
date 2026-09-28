// study-table.ts — the across-the-table study (first iteration of the third
// product iteration, ai/features/study-room/study-room.md). Every number that
// places art is pasted from arts/rooms/study/table-manifest.json, written by
// scripts/build-study-table.py, except the seat, which the partner's rig build
// measures (arts/characters/ayu/build/assemble.json); window panes come from the frame-edge
// measurement on the plates, hotspots are generous tap areas over the painted
// objects. Adjust here, never inside the layer modules.

import type { AvatarRig, TableRoomTemplate } from '@/themes/cinnaglass/room/room-types';

const T = '/rooms/study';

export const STUDY_TABLE: TableRoomTemplate = {
    id: 'study',
    base: { w: 1536, h: 1024 },
    plates: {
        // clear night by default; the painted-rain pair takes over while it rains
        night: {
            on: `${T}/plate-night-on-dry.webp`,
            off: `${T}/plate-night-off-dry.webp`,
            rain: { on: `${T}/plate-night-on.webp`, off: `${T}/plate-night-off.webp` }
        },
        twilight: { on: `${T}/plate-twilight-on.webp`, off: `${T}/plate-twilight-off.webp` },
        // the lamp barely matters against the sunset, so golden has no unlit plate yet
        golden: { on: `${T}/plate-golden-on.webp` }
    },
    moodFallback: { golden: 'golden', twilight: 'twilight', night: 'night' },
    window: {
        // frame edges at x≈317 / 970–998 / 1322, sill at y≈496–505. The chair
        // back (x 457–1030 from y≈420) and the record player's lid stand in
        // front of the lower glass, so the lower panes stop beside them
        panes: [
            { x: 322, y: 6, w: 644, h: 410 },
            { x: 1002, y: 6, w: 316, h: 410 },
            { x: 322, y: 416, w: 130, h: 78 },
            { x: 1036, y: 416, w: 146, h: 78 }
        ],
        glow: { x: 300, y: 0, w: 1040, h: 520 }
    },
    seat: {
        // SIFT registration of reading-open onto master-night (marionette assemble stage):
        // scale 0.57417, rotation 0.4° (ignored), residual median 1.7px / p90 2.5px
        origin: { x: 346.02, y: 92.83 },
        scale: 0.57417,
        // pose-canvas px (the trimmed canvas shared by every pose)
        head: { x: 394, y: 40, w: 485, h: 410 },
        body: { x: 30, y: 450, w: 1320, h: 560 },
        // the torso disappears behind the table's far edge (plate y≈650)
        pivot: { x: 677, y: 970 },
        // eye level (plate y≈305), 12 plate px outside the widest hair at that
        // height over every pose (poked reaches plate x 885, patted 589); the
        // face's skin ends near plate x 812 (820 leaves the glance pose room);
        // the tag drops to the hood's shoulder line (plate y≈430)
        beside: { left: { x: 402, y: 370 }, right: { x: 960, y: 370 }, faceRight: 820, shoulder: 587 }
    },
    foreground: {
        xiaoman: { src: `${T}/fg-xiaoman.webp`, box: { x: 307, y: 724, w: 907, h: 300 } }
    },
    traces: {
        mug: { src: `${T}/mug-ayu.webp`, box: { x: 942, y: 582, w: 134, h: 126 } },
        jacket: { ayu: { src: `${T}/jacket-ayu.webp`, box: { x: 451, y: 366, w: 604, h: 290 } } }
    },
    // rims measured on the parts' alpha: the partner's mug body spans x 944–1049
    // from y 586; the viewer's rim ellipse opens from y 727 and is ~170 wide
    steam: {
        partner: { rim: { x: 996, y: 592 }, width: 100 },
        viewer: { rim: { x: 757, y: 748 }, width: 170 }
    },
    lamp: {
        chain: { src: `${T}/lamp-chain.webp`, box: { x: 229, y: 479, w: 27, h: 80 } },
        pivot: { x: 242.5, y: 479 }
    },
    // x: the partner's face. top: 12 px above the highest hair over every pose
    // (patted, plate y 96), so wide screens spend their rows on table and hands
    crop: { x: 735, top: 84 },
    hotspots: [
        { id: 'lamp', rect: { x: 70, y: 285, w: 230, h: 285 } }, // shade and pull chain
        { id: 'timeline', rect: { x: 118, y: 660, w: 265, h: 130 } }, // the books → our diary
        { id: 'music', rect: { x: 1075, y: 440, w: 340, h: 340 } }, // record player
        { id: 'photos', rect: { x: 1062, y: 782, w: 172, h: 88 } } // the polaroid
    ]
};

/**
 * 阿屿's rig, built from arts/characters/ayu/rig.json with
 * `python ai/jaSkills/marionette/scripts/rig.py all --config arts/characters/ayu/rig.json`.
 * Which poses blink and which pairs morph is whatever that run shipped; nothing is listed here.
 */
export const AYU_RIG: AvatarRig = { manifest: '/characters/ayu/rig.json' };
