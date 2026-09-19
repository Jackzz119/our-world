// turntable-prop.ts — the room's one living prop. Living-diorama direction
// (2026-08-22, ai/design_system/research/living-props.md): furniture moves
// instead of glowing. The record turns inside the disc plane itself —
// discHomography maps that plane to base px, so a spin is a real perspective
// rotation and rim and label both stay put. Its painted light and the tonearm
// are separate layers that never turn. Hover is a state change on the prop:
// the platter leans faster, the arm gives a swing.
//
// It owns the whole prop: the four layers, one mesh set per mood, the spin and
// speed, the tonearm's lift spring, the arm shadows, the disc masters refit to
// the size they are drawn at, and the renderer runner that retires the old
// masters a frame later. That last pair is why the prop is one module and not
// several — see refit() and destroy().

import { type Application, Assets, Container, PerspectiveMesh, Sprite, type Texture } from 'pixi.js';
import type { RoomMood, RoomTemplate, TurntableSpec } from './room-types';
import { discCorners, discHomography, type Mat3 } from './homography';
import { type ArtImage, boxDownscale, carvePatch, shadowTexture } from './textures';

const SHADOW_ALPHA = 0.42;
// tonearm nudge spring: stiff enough to answer within ~0.3s, damped just under
// critical so it settles with one soft overshoot (the caller caps dt at 0.1s,
// well inside the stable range for this pair)
const ARM_SPRING_K = 120;
const ARM_SPRING_DAMP = 14;
// vertical skew (radians) about the post when cued: the headshell, ~90px from
// the post, rises ~4px while the post itself does not move
const ARM_LIFT_SKEW = 0.045;

export type TurntableProp = {
    /** platter / light / stills / arm swing, in the order they go into the world. */
    layers: Container[];
    /** Base-art url to the cuts taken from it, so they cross-fade with their own art. */
    cutsByArtUrl: Map<string, Container[]>;
    /** Advance the spin and the tonearm for one frame. */
    update: (dt: number, hovered: boolean) => void;
    /** Refit the disc masters to the width they are now drawn at, in device px. */
    refit: (devicePx: number) => void;
    /** Detach the renderer runner and flush any master still waiting to be retired. */
    destroy: () => void;
};

/**
 * Build the turntable for one room. Loads the generated part textures, cuts
 * the stills out of every mood's base art, and returns the prop once every
 * texture is in. The caller adds `layers` to the world in order and drives
 * update/refit/destroy; nothing else reaches inside.
 */
export async function createTurntable(
    app: Application,
    spec: TurntableSpec,
    art: RoomTemplate['art'],
    artUrls: string[],
    baseTextures: Record<string, Texture>
): Promise<TurntableProp> {
    const {
        platter: e,
        center,
        armPivot,
        arm: armSpec,
        armTint,
        armShadow,
        platterArt,
        platterLight,
        spindle,
        stills = []
    } = spec;

    const vinyls: PerspectiveMesh[] = []; // one per mood (tint differs), all sharing the spin
    const cutsByArtUrl = new Map<string, Container[]>(); // art url → its cuts, faded with the base
    const armShadows: { sprite: Sprite; restX: number; restY: number; dx: number; dy: number }[] = [];
    let vinylSpin = 0; // radians turned so far
    let vinylSpeed = (Math.PI * 2) / 9; // idle: one turn / 9s
    // "lift" is the tonearm's one state: 0 = resting on the record, 1 = cued
    // up. Arm, lean and shadow all derive from it, so they can never disagree.
    let lift = 0;
    let liftVel = 0;

    const retiredDiscTextures: Texture[] = [];
    const discTextureCleanup = {
        postrender() {
            // Mesh.texture changes immediately, but Pixi's shared mesh shader
            // only rebinds it on the next draw. Retire the old sources AFTER
            // that draw; destroying them during resize destroys its BindGroup.
            for (const texture of retiredDiscTextures.splice(0)) texture.destroy(true);
        }
    };
    app.renderer.runners.postrender.add(discTextureCleanup);

    const vinylH: Mat3 = discHomography(e, center);
    const platterLayer = new Container(); // the record: albedo tinted per hour, turning
    const lightLayer = new Container(); // the painting's light on the record: never turns
    const stillLayer = new Container(); // spindle & co from the machine plate, never turning
    const armSwing = new Container(); // rotation = lean about the post
    armSwing.position.set(armPivot.x, armPivot.y);
    const armShadowGroup = new Container(); // every mood's shadow below every mood's arm
    const armGroup = new Container(); // the arms of every mood; skewed about the post to cue up
    armSwing.addChild(armShadowGroup, armGroup);
    const restCorners = discCorners(vinylH, 0);

    // the record is the painting split by symmetry (scripts/build-turntable-
    // parts.py v5): its rotationally symmetric part is the albedo and turns;
    // everything that would not survive a turn — sheen, groove sparkle, rim
    // highlight, shadow side — is static light layered on top. At rest they
    // give the painting back; nothing lit ever turns. The arm is generated
    // flat albedo lit by tint; the pin is a still cut from the painting.
    const lightUrls = Object.values(platterLight).flatMap((l) => [l.add, l.mul]);
    const platterUrls = Object.values(platterArt);
    const partTex = await Assets.load<Texture>([
        ...platterUrls,
        armSpec.src,
        ...(spindle ? Object.values(spindle.src) : []),
        ...new Set(lightUrls)
    ]);

    // the disc textures ship as 512px masters and are drawn 160–400 device px
    // wide. Sampled straight they alias into sparkle while turning; mipmapped,
    // the GPU blends two levels and the grooves go soft — the "softer than the
    // painting" of round four. So each master is refit once per layout to the
    // very size it is drawn at (stepwise box downscale) and then sampled 1:1,
    // exactly like the painting itself.
    const discSrcs = [...platterUrls, ...lightUrls];
    const discMeshes: { mesh: PerspectiveMesh; src: string }[] = [];
    let fitted: Texture[] = [];
    let fitPx = 0;
    const refit = (devicePx: number) => {
        const px = Math.min(512, Math.max(64, Math.round(devicePx)));
        if (fitPx && Math.abs(px - fitPx) < fitPx * 0.08) return; // resize jitter: keep the fit
        fitPx = px;
        const next = new Map<string, Texture>();
        for (const src of discSrcs) next.set(src, boxDownscale(partTex[src].source.resource as ArtImage, px));
        for (const d of discMeshes) d.mesh.texture = next.get(d.src)!;
        retiredDiscTextures.push(...fitted);
        fitted = [...next.values()];
    };

    const armTexture = partTex[armSpec.src];
    const armSrcImg = armTexture.source.resource as ArtImage | undefined;
    const res = armTexture.width / armSpec.box.w; // texture px per base px
    const shadowBlur = 2.2 * res;
    const shadowTex = armSrcImg ? shadowTexture(armSrcImg, res, shadowBlur) : null;
    const shadowPad = Math.ceil(shadowBlur * 3) / res;
    const moods = Object.keys(art) as RoomMood[];
    for (const url of artUrls) {
        const mood = moods.find((m) => art[m] === url);
        if (!mood) continue;
        const img = baseTextures[url].source.resource as ArtImage | undefined;
        const cuts: Container[] = [];
        // this hour's record: the painting's symmetric part, turning
        const disc = new PerspectiveMesh({ texture: partTex[platterArt[mood]], verticesX: 12, verticesY: 12 });
        platterLayer.addChild(disc);
        vinyls.push(disc);
        cuts.push(disc);
        discMeshes.push({ mesh: disc, src: platterArt[mood] });
        // the hour's light on the record, static: sheen adds, shadow side multiplies
        for (const [src, blend] of [
            [platterLight[mood].mul, 'multiply'],
            [platterLight[mood].add, 'add']
        ] as const) {
            const lightMesh = new PerspectiveMesh({ texture: partTex[src], verticesX: 12, verticesY: 12 });
            lightMesh.setCorners(...restCorners);
            lightMesh.blendMode = blend;
            lightLayer.addChild(lightMesh);
            cuts.push(lightMesh);
            discMeshes.push({ mesh: lightMesh, src });
        }
        if (spindle) {
            // the pin stands through the record: above the platter, painted pixels, never moves
            const pin = new Sprite(partTex[spindle.src[mood]]);
            pin.position.set(spindle.box.x, spindle.box.y);
            pin.width = spindle.box.w;
            pin.height = spindle.box.h;
            stillLayer.addChild(pin);
            cuts.push(pin);
        }
        if (img) {
            for (const poly of stills) {
                const patch = carvePatch(img, poly);
                const still = new Sprite(patch.tex);
                still.position.set(patch.box.x, patch.box.y);
                stillLayer.addChild(still);
                cuts.push(still);
            }
        }
        if (shadowTex) {
            const shadow = new Sprite(shadowTex);
            shadow.position.set(armSpec.box.x - armPivot.x - shadowPad, armSpec.box.y - armPivot.y - shadowPad);
            shadow.width = armSpec.box.w + shadowPad * 2;
            shadow.height = armSpec.box.h + shadowPad * 2;
            shadow.blendMode = 'multiply';
            shadow.alpha = SHADOW_ALPHA;
            // the mood cross-fade animates the holder, the lift drives the
            // sprite: two alphas that must never fight over one field
            const holder = new Container();
            holder.addChild(shadow);
            armShadowGroup.addChild(holder);
            cuts.push(holder);
            armShadows.push({
                sprite: shadow,
                restX: shadow.x,
                restY: shadow.y,
                dx: armShadow[mood].dx,
                dy: armShadow[mood].dy
            });
        }
        const arm = new Sprite(armTexture);
        arm.position.set(armSpec.box.x - armPivot.x, armSpec.box.y - armPivot.y);
        arm.width = armSpec.box.w;
        arm.height = armSpec.box.h;
        arm.tint = armTint[mood];
        armGroup.addChild(arm);
        cuts.push(arm);
        cutsByArtUrl.set(url, cuts);
    }

    // place the record quad for the current spin — perspective-correct by
    // construction, so rim and label both stay put while it turns
    const layVinyl = () => {
        const p = discCorners(vinylH, vinylSpin);
        for (const m of vinyls) m.setCorners(...p);
    };
    layVinyl();

    return {
        layers: [platterLayer, lightLayer, stillLayer, armSwing],
        cutsByArtUrl,
        refit,
        update(dt, hovered) {
            const target = hovered ? (Math.PI * 2) / 4 : (Math.PI * 2) / 9;
            vinylSpeed += (target - vinylSpeed) * Math.min(1, dt * 3); // soft ramp
            vinylSpin = (vinylSpin + vinylSpeed * dt) % (Math.PI * 2);
            layVinyl();
            // cue the arm: an under-damped spring drives `lift` (overshoots a
            // touch, settles). A real tonearm hinges at the post, so the post
            // stays put and the headshell rises: a vertical skew about the
            // pivot (y grows with distance from the post) plus a hair of
            // outward lean. The shadow stays on the table plane, so it slides
            // away from the arm and fades — "lifted", not "stickered"
            liftVel += (ARM_SPRING_K * ((hovered ? 1 : 0) - lift) - ARM_SPRING_DAMP * liftVel) * dt;
            lift += liftVel * dt;
            armSwing.rotation = -0.012 * lift;
            armGroup.skew.y = ARM_LIFT_SKEW * lift;
            for (const s of armShadows) {
                s.sprite.x = s.restX + s.dx * (1 + 0.6 * lift);
                s.sprite.y = s.restY + s.dy * (1 + 0.8 * lift);
                s.sprite.alpha = SHADOW_ALPHA * (1 - 0.4 * lift);
            }
        },
        destroy() {
            app.renderer.runners.postrender.remove(discTextureCleanup);
            discTextureCleanup.postrender();
        }
    };
}
