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
    // per partner: each rig's pose canvas lands on the same chair
    seat: {
        ayu: {
            // SIFT registration of reading-open onto master-night (marionette assemble stage):
            // scale 0.57417, rotation 0.4° (ignored), residual median 1.7px / p90 2.5px
            origin: { x: 319.61, y: 92.83 },
            scale: 0.57417,
            // pose-canvas px: the shared canvas is fixed in arts/characters/ayu/rig.json (canvas.crop,
            // source x 40–1520, y 5–1024: wide enough for dozing off and lifting the mug), so these
            // never move when a pose is regenerated
            head: { x: 440, y: 40, w: 485, h: 410 },
            body: { x: 76, y: 450, w: 1320, h: 560 },
            // the torso disappears behind the table's far edge (plate y≈650)
            pivot: { x: 723, y: 970 },
            // eye level (plate y≈305), 12 plate px outside the widest hair at that
            // height over every pose (measured on the 2026-09-27 frames: poked reaches
            // plate x 885, patted 589; the 2026-09-28 poked and patted heads span plate
            // x 598–831 at eye level, inside both anchors); the
            // face's skin ends near plate x 812 (820 leaves the glance pose room);
            // the tag drops to the hood's shoulder line (plate y≈430)
            beside: { left: { x: 448, y: 370 }, right: { x: 1006, y: 370 }, faceRight: 866, shoulder: 587 }
        },
        xiaoman: {
            // the same chair, placed by arts/characters/xiaoman/rig.json (placement): 阿屿's scale, and
            // raised 10 plate px so her torso cut (source y 987) lands on the table's far edge (plate y 646)
            origin: { x: 382.77, y: 96.52 },
            scale: 0.57417,
            // pose-canvas px: canvas.crop is source x 150–1450, y 30–1024. Measured on the 2026-09-29
            // frames over the awake one-pose poses: the head from the highest hair to the nose line, the
            // hair's extent at eye level (canvas y 301, plate y≈269), 12 plate px outside it
            head: { x: 345, y: 21, w: 508, h: 403 },
            body: { x: 65, y: 424, w: 1170, h: 565 },
            pivot: { x: 626, y: 959 },
            // faceRight: the skin at eye level (ear included); shoulder: the cardigan's shoulder line
            // beside the hair (her shoulder probe, source y 617, plate y≈434)
            beside: { left: { x: 324, y: 301 }, right: { x: 874, y: 301 }, faceRight: 855, shoulder: 587 }
        }
    },
    // per viewer: the hands around the mug in the near foreground
    foreground: {
        xiaoman: { src: `${T}/fg-xiaoman.webp`, box: { x: 307, y: 724, w: 907, h: 300 } },
        ayu: { src: `${T}/fg-ayu.webp`, box: { x: 295, y: 720, w: 909, h: 304 } }
    },
    // per partner: their mug and the jacket over the chair back
    traces: {
        mug: {
            ayu: { src: `${T}/mug-ayu.webp`, box: { x: 942, y: 582, w: 134, h: 126 } },
            xiaoman: { src: `${T}/mug-xiaoman.webp`, box: { x: 944, y: 583, w: 133, h: 125 } }
        },
        jacket: {
            ayu: { src: `${T}/jacket-ayu.webp`, box: { x: 451, y: 366, w: 604, h: 290 } },
            xiaoman: { src: `${T}/jacket-xiaoman.webp`, box: { x: 443, y: 377, w: 620, h: 279 } }
        }
    },
    // rims measured on the parts: the partner's mug body spans x 944–1049 from
    // y 586 (both mugs); the viewer's outer rim ellipse spans plate y 729–772 and
    // x 673–843 in her hands, y 732–770 and x 674–839 in his
    steam: {
        partner: {
            ayu: { rim: { x: 996, y: 592 }, width: 100 },
            xiaoman: { rim: { x: 998, y: 592 }, width: 100 }
        },
        viewer: {
            xiaoman: { rim: { x: 757, y: 748 }, width: 170 },
            ayu: { rim: { x: 756, y: 749 }, width: 166 }
        }
    },
    lamp: {
        chain: { src: `${T}/lamp-chain.webp`, box: { x: 229, y: 479, w: 27, h: 80 } },
        pivot: { x: 242.5, y: 479 }
    },
    // x: the partner's face. top: 12 px above the highest hair over every pose
    // (patted, plate y 96, on the 2026-09-27 frames; the 2026-09-28 patted tops out
    // near plate y 112, so this leaves more room), so wide screens spend their rows
    // on table and hands
    crop: { ayu: { x: 735, top: 84 }, xiaoman: { x: 751, top: 97 } },
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

/** 小满's rig, built the same way from arts/characters/xiaoman/rig.json; she sits on the same chair. */
export const XIAOMAN_RIG: AvatarRig = { manifest: '/characters/xiaoman/rig.json' };

/** The partner's rig per avatar. */
export const PARTNER_RIGS = { ayu: AYU_RIG, xiaoman: XIAOMAN_RIG } as const;
