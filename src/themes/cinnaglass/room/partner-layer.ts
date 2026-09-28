// partner-layer.ts — the partner across the table: one mesh per pose on a
// shared canvas, cross-faded in place, blinking on eyes-open poses, plus the
// head and body zones that turn a tap into a poke and a press-and-stroke into
// a pat. Which pose shows is decided by partner-state.ts; this layer only
// renders it.
//
// Idle motion follows Wallpaper Engine's approach to flat character art: a
// grid mesh over the picture, deformed by per-area motion weights
// (scripts/build-idle-weights.py) instead of scaling the whole figure. The
// chest, shoulders and head rise a little with each breath while the hands and
// book on the table stay put; the upper body leans a hair; hair tips sway on
// their own with the wave travelling down the hair.

import { Container, type FederatedPointerEvent, MeshPlane, Rectangle, type Texture } from 'pixi.js';
import type { AvatarPoses, PartnerSeat, PoseId, PxPoint } from '@/themes/cinnaglass/room/room-types';
import type { FadeQueue } from '@/themes/cinnaglass/room/fade-queue';

/** Per-vertex motion weights for one pose: `breath` and `hair`, 0..1, row by row. */
export type IdleWeights = { cols: number; rows: number; breath: Float32Array; hair: Float32Array };

/** One pose's mesh, its two frames and its rest geometry. */
type Pose = {
    mesh: MeshPlane;
    open: Texture;
    closed: Texture | null;
    rest: Float32Array;
    weights: IdleWeights | null;
};

export type PartnerTouch = {
    /** A tap on the head or body. */
    onPoke: () => void;
    /** A press-and-stroke on the head started (true) or ended (false). */
    onPat: (holding: boolean) => void;
};

export type PartnerLayer = {
    /** Pose meshes, placed in plate px. */
    container: Container;
    /** Head and body zones, above everything else in the scene. */
    hitContainer: Container;
    /** Every pose texture, for uploading them to the GPU before the first swap. */
    textures: Texture[];
    /** Scene light on the partner, as a multiply tint. */
    setTint: (tint: number) => void;
    /** Show `pose` (null = nobody in the chair), cross-fading from the current one. */
    show: (pose: PoseId | null, fades: FadeQueue, animate: boolean) => void;
    /** Idle motion and blinking; `elapsed` drives the loops, `nowMs` the blinks and hand-overs. */
    update: (elapsed: number, nowMs: number, fades: FadeQueue) => void;
    /** Plate px where UI can attach beside the head (PartnerSeat.beside, placed on the plate). */
    anchors: () => HeadAnchors;
};

/**
 * Where UI attaches beside the partner's head without covering the face: the
 * eye-level points clear of the hair, the x the face ends at on the viewer's
 * right, and the y of the shoulder line.
 */
export type HeadAnchors = { left: PxPoint; right: PxPoint; faceRight: number; shoulder: number };

// Pose swaps and the pat gesture (ai/features/study-room/study-room.md §四).
const CROSSFADE_MS = 180;
const HANDOVER_MS = 120;
const BLINK_MS = 140;
const BLINK_GAP: [number, number] = [2400, 6500];
const PAT_START_PX = 12;

// Idle motion, in pose-canvas px (about 0.57 plate px each) and seconds.
const BREATH_PX = 3.2;
const BREATH_S = 3.6;
const LEAN_RAD = 0.004;
const LEAN_S = 7.4;
const HAIR_PX = 4.5;
const HAIR_S = [4.2, 2.3, 3.1];

/** Read a weight map (R = breath, G = hair) written by scripts/build-idle-weights.py. */
export async function loadIdleWeights(url: string): Promise<IdleWeights> {
    const bitmap = await createImageBitmap(await (await fetch(url)).blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    if (!g) throw new Error('idle weights: no 2d canvas');
    g.drawImage(bitmap, 0, 0);
    const px = g.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const n = bitmap.width * bitmap.height;
    const breath = new Float32Array(n);
    const hair = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        breath[i] = px[i * 4] / 255;
        hair[i] = px[i * 4 + 1] / 255;
    }
    return { cols: bitmap.width, rows: bitmap.height, breath, hair };
}

/**
 * Build the partner layer for `seat` from the avatar's pose art. `textures`
 * must already hold every pose file and `weights` every pose's motion weights
 * (a pose without weights stays still); `random` is the scene's shared source.
 */
export function createPartnerLayer(
    seat: PartnerSeat,
    art: AvatarPoses,
    textures: Record<string, Texture>,
    weights: Partial<Record<PoseId, IdleWeights>>,
    random: () => number,
    touch: PartnerTouch
): PartnerLayer {
    const rand = (min: number, max: number) => min + random() * (max - min);

    // holder places the pose canvas on the plate; the motion is in the meshes
    const container = new Container();
    const holder = new Container();
    holder.position.set(seat.origin.x, seat.origin.y);
    holder.scale.set(seat.scale);
    container.addChild(holder);

    const poses = new Map<PoseId, Pose>();
    for (const [id, files] of Object.entries(art.poses) as [PoseId, AvatarPoses['poses'][PoseId]][]) {
        const w = weights[id] ?? null;
        const mesh = new MeshPlane({
            texture: textures[files.open],
            verticesX: w?.cols ?? 2,
            verticesY: w?.rows ?? 2
        });
        // blinks swap the texture on a canvas of the same size; the grid must stay
        mesh.autoResize = false;
        mesh.alpha = 0;
        holder.addChild(mesh);
        poses.set(id, {
            mesh,
            open: textures[files.open],
            closed: files.closed ? textures[files.closed] : null,
            rest: Float32Array.from(mesh.geometry.positions),
            weights: w
        });
    }

    let current: PoseId | null = null;
    // outgoing poses stay opaque under the incoming one until it has covered them
    let handovers: { pose: Pose; at: number }[] = [];
    let nextBlinkAt = performance.now() + rand(1500, 5000);
    let blinkUntil = 0;
    let doubleBlink = false;

    // Plate-px rectangle of a pose-canvas rectangle.
    const toPlate = (r: { x: number; y: number; w: number; h: number }) =>
        new Rectangle(
            seat.origin.x + r.x * seat.scale,
            seat.origin.y + r.y * seat.scale,
            r.w * seat.scale,
            r.h * seat.scale
        );

    /* ---------- touch zones ---------- */
    const hitContainer = new Container();
    const head = new Container();
    const body = new Container();
    head.hitArea = toPlate(seat.head);
    body.hitArea = toPlate(seat.body);
    for (const zone of [body, head]) {
        zone.eventMode = 'static';
        zone.cursor = 'pointer';
        hitContainer.addChild(zone);
    }
    // the zones only answer while someone sits there
    const setZones = (on: boolean) => {
        head.eventMode = body.eventMode = on ? 'static' : 'none';
    };
    setZones(false);

    // Head: a press that travels past the threshold is a pat, a press that
    // stays put is a poke. Body: every tap is a poke.
    let press: { x: number; y: number } | null = null;
    let patting = false;
    const endPress = () => {
        if (patting) touch.onPat(false);
        press = null;
        patting = false;
    };
    head.on('pointerdown', (e: FederatedPointerEvent) => {
        press = { x: e.global.x, y: e.global.y };
        patting = false;
    });
    head.on('globalpointermove', (e: FederatedPointerEvent) => {
        if (!press || patting) return;
        if (Math.hypot(e.global.x - press.x, e.global.y - press.y) >= PAT_START_PX) {
            patting = true;
            touch.onPat(true);
        }
    });
    head.on('pointerup', () => {
        if (press && !patting) touch.onPoke();
        endPress();
    });
    head.on('pointerupoutside', endPress);
    body.on('pointertap', () => touch.onPoke());

    // Deform one pose's mesh for this moment. Breath lifts along -y by the
    // breath weight; the lean turns the weighted upper body about the seat's
    // pivot; hair drifts sideways by the hair weight, its phase running down
    // the hair so the tips follow the roots instead of all moving at once.
    const TAU = Math.PI * 2;
    const deform = (p: Pose, t: number) => {
        const w = p.weights;
        if (!w) return;
        const pos = p.mesh.geometry.positions;
        const rest = p.rest;
        const lift = -BREATH_PX * 0.5 * (1 + Math.sin((t / BREATH_S) * TAU));
        const lean = LEAN_RAD * Math.sin((t / LEAN_S) * TAU);
        const a1 = (t / HAIR_S[0]) * TAU;
        const a2 = (t / HAIR_S[1]) * TAU + 1.3;
        const a3 = (t / HAIR_S[2]) * TAU + 0.6;
        for (let i = 0, n = w.cols * w.rows; i < n; i++) {
            const x = rest[i * 2];
            const y = rest[i * 2 + 1];
            const b = w.breath[i];
            const h = w.hair[i];
            let dx = lean * (seat.pivot.y - y) * b;
            let dy = lift * b;
            if (h > 0.01) {
                dx += HAIR_PX * h * (0.65 * Math.sin(a1 + y * 0.011) + 0.35 * Math.sin(a2 + y * 0.017));
                dy += HAIR_PX * 0.25 * h * Math.sin(a3 + y * 0.013);
            }
            pos[i * 2] = x + dx;
            pos[i * 2 + 1] = y + dy;
        }
        p.mesh.geometry.getBuffer('aPosition').update();
    };

    return {
        container,
        hitContainer,
        textures: [...poses.values()].flatMap((p) => (p.closed ? [p.open, p.closed] : [p.open])),
        setTint(tint) {
            for (const p of poses.values()) p.mesh.tint = tint;
        },
        show(pose, fades, animate) {
            if (pose === current) return;
            const from = current ? poses.get(current) : undefined;
            const to = pose ? poses.get(pose) : undefined;
            if (to) {
                // coming back before a hand-over finished: it simply fades up again
                handovers = handovers.filter((h) => h.pose !== to);
                to.mesh.texture = to.open;
                // the incoming pose fades in ABOVE the outgoing one, which stays fully
                // opaque underneath: two half-transparent poses would let the room show through
                holder.setChildIndex(to.mesh, holder.children.length - 1);
                if (animate) fades.start(to.mesh, 1, CROSSFADE_MS);
                else to.mesh.alpha = 1;
            }
            if (from) {
                from.mesh.texture = from.open;
                if (!animate) from.mesh.alpha = 0;
                // once covered, the outgoing pose fades out quickly, so parts outside the new
                // silhouette (an arm that moved) leave softly instead of popping
                else if (to) handovers.push({ pose: from, at: performance.now() + CROSSFADE_MS });
                else fades.start(from.mesh, 0, CROSSFADE_MS);
            }
            current = pose;
            blinkUntil = 0;
            nextBlinkAt = performance.now() + rand(BLINK_GAP[0], BLINK_GAP[1]);
            setZones(pose !== null && pose !== 'asleep');
            if (!pose) endPress();
        },
        update(elapsed, nowMs, fades) {
            handovers = handovers.filter((h) => {
                if (nowMs < h.at) return true;
                fades.start(h.pose.mesh, 0, HANDOVER_MS);
                return false;
            });
            for (const p of poses.values()) if (p.mesh.alpha > 0) deform(p, elapsed);

            const p = current ? poses.get(current) : undefined;
            if (!p?.closed) return;
            if (blinkUntil > 0 && nowMs >= blinkUntil) {
                p.mesh.texture = p.open;
                blinkUntil = 0;
                if (doubleBlink) {
                    doubleBlink = false;
                    nextBlinkAt = nowMs + 180;
                } else {
                    nextBlinkAt = nowMs + rand(BLINK_GAP[0], BLINK_GAP[1]);
                }
            } else if (blinkUntil === 0 && nowMs >= nextBlinkAt) {
                p.mesh.texture = p.closed;
                blinkUntil = nowMs + BLINK_MS;
                doubleBlink = random() < 0.15;
            }
        },
        anchors() {
            const at = (p: PxPoint) => ({ x: seat.origin.x + p.x * seat.scale, y: seat.origin.y + p.y * seat.scale });
            return {
                left: at(seat.beside.left),
                right: at(seat.beside.right),
                faceRight: seat.origin.x + seat.beside.faceRight * seat.scale,
                shoulder: seat.origin.y + seat.beside.shoulder * seat.scale
            };
        }
    };
}
