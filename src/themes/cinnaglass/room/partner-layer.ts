// partner-layer.ts — the partner across the table: one sprite per pose on a
// shared canvas, cross-faded in place, blinking on eyes-open poses, breathing
// and swaying around the torso's bottom middle, plus the head and body zones
// that turn a tap into a poke and a press-and-stroke into a pat. Which pose
// shows is decided by partner-state.ts; this layer only renders it.

import { Container, type FederatedPointerEvent, Rectangle, Sprite, type Texture } from 'pixi.js';
import type { AvatarPoses, PartnerSeat, PoseId, PxPoint } from '@/themes/cinnaglass/room/room-types';
import type { FadeQueue } from '@/themes/cinnaglass/room/fade-queue';

/** One pose's sprite and its two frames. */
type Pose = { sprite: Sprite; open: Texture; closed: Texture | null };

export type PartnerTouch = {
    /** A tap on the head or body. */
    onPoke: () => void;
    /** A press-and-stroke on the head started (true) or ended (false). */
    onPat: (holding: boolean) => void;
};

export type PartnerLayer = {
    /** Pose sprites, placed in plate px. */
    container: Container;
    /** Head and body zones, above everything else in the scene. */
    hitContainer: Container;
    /** Scene light on the partner, as a multiply tint. */
    setTint: (tint: number) => void;
    /** Show `pose` (null = nobody in the chair), cross-fading from the current one. */
    show: (pose: PoseId | null, fades: FadeQueue, animate: boolean) => void;
    /** Breathing, sway and blinking; `elapsed` drives the loops, `nowMs` the blinks. */
    update: (elapsed: number, nowMs: number) => void;
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
const BLINK_MS = 140;
const BLINK_GAP: [number, number] = [2400, 6500];
const PAT_START_PX = 12;

/**
 * Build the partner layer for `seat` from the avatar's pose art. `textures`
 * must already hold every pose file; `random` is the scene's shared source.
 */
export function createPartnerLayer(
    seat: PartnerSeat,
    art: AvatarPoses,
    textures: Record<string, Texture>,
    random: () => number,
    touch: PartnerTouch
): PartnerLayer {
    const rand = (min: number, max: number) => min + random() * (max - min);

    // holder places the pose canvas on the plate; sway and breathe pivot at
    // the torso's bottom middle so the figure never slides off its seat
    const container = new Container();
    const holder = new Container();
    holder.position.set(seat.origin.x, seat.origin.y);
    holder.scale.set(seat.scale);
    const sway = new Container();
    sway.pivot.set(seat.pivot.x, seat.pivot.y);
    sway.position.set(seat.pivot.x, seat.pivot.y);
    const breathe = new Container();
    breathe.pivot.set(seat.pivot.x, seat.pivot.y);
    breathe.position.set(seat.pivot.x, seat.pivot.y);
    sway.addChild(breathe);
    holder.addChild(sway);
    container.addChild(holder);

    const poses = new Map<PoseId, Pose>();
    for (const [id, files] of Object.entries(art.poses) as [PoseId, AvatarPoses['poses'][PoseId]][]) {
        const sprite = new Sprite(textures[files.open]);
        sprite.alpha = 0;
        breathe.addChild(sprite);
        poses.set(id, { sprite, open: textures[files.open], closed: files.closed ? textures[files.closed] : null });
    }

    let current: PoseId | null = null;
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

    return {
        container,
        hitContainer,
        setTint(tint) {
            for (const p of poses.values()) p.sprite.tint = tint;
        },
        show(pose, fades, animate) {
            if (pose === current) return;
            const from = current ? poses.get(current) : undefined;
            const to = pose ? poses.get(pose) : undefined;
            if (from) {
                from.sprite.texture = from.open;
                if (animate) fades.start(from.sprite, 0, CROSSFADE_MS);
                else from.sprite.alpha = 0;
            }
            if (to) {
                to.sprite.texture = to.open;
                // the incoming pose draws above the outgoing one while they blend
                breathe.setChildIndex(to.sprite, breathe.children.length - 1);
                if (animate) fades.start(to.sprite, 1, CROSSFADE_MS);
                else to.sprite.alpha = 1;
            }
            current = pose;
            blinkUntil = 0;
            nextBlinkAt = performance.now() + rand(BLINK_GAP[0], BLINK_GAP[1]);
            setZones(pose !== null && pose !== 'asleep');
            if (!pose) endPress();
        },
        update(elapsed, nowMs) {
            const beat = Math.sin((elapsed / 3.6) * Math.PI * 2);
            breathe.scale.set(1 - 0.003 * beat, 1 + 0.015 * beat);
            sway.rotation = 0.008 * Math.sin((elapsed / 7.4) * Math.PI * 2);

            const p = current ? poses.get(current) : undefined;
            if (!p?.closed) return;
            if (blinkUntil > 0 && nowMs >= blinkUntil) {
                p.sprite.texture = p.open;
                blinkUntil = 0;
                if (doubleBlink) {
                    doubleBlink = false;
                    nextBlinkAt = nowMs + 180;
                } else {
                    nextBlinkAt = nowMs + rand(BLINK_GAP[0], BLINK_GAP[1]);
                }
            } else if (blinkUntil === 0 && nowMs >= nextBlinkAt) {
                p.sprite.texture = p.closed;
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
