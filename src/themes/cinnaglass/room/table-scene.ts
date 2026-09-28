// table-scene.ts — the across-the-table compositor (third iteration, see
// ai/features/study-room/study-room.md). Each layer is built by its own
// module, and this file decides the stacking,
// the tick order and how one mood, weather or lamp change reaches every layer.
//
// Layer tree, all in plate px under one root that cover-fits the canvas by
// the template's crop:
//   root
//   └─ world                     ← AdjustmentFilter (weather grade)
//       ├─ scene (parallax 3px)
//       │   ├─ plates            one group per hour × weather: lit plate, unlit over it
//       │   ├─ rain              masked to the window panes    rain-layer.ts
//       │   ├─ jacket            the partner's jacket on the empty chair
//       │   ├─ partner           pose sprites, blink, breath   partner-layer.ts
//       │   ├─ mug + steam       the partner's mug on the table steam-layer.ts
//       │   ├─ lamp chain        sways, tugs when pulled
//       │   ├─ hotspot zones     + sparkles                    affordance.ts
//       │   └─ partner zones     head pat / body poke          partner-layer.ts
//       └─ foreground (10px)     the viewer's own hands and mug, and its steam
//
// Plates hold one whole painting each, so everything painted on them (window,
// table, chair) moves together; only the viewer's hands move against them.

import { type Application, Assets, Container, Sprite, type Texture } from 'pixi.js';
import 'pixi.js/prepare';
import { AdjustmentFilter } from 'pixi-filters';
import type {
    AvatarId,
    AvatarRig,
    HotspotOpenEvent,
    LampPlates,
    PartnerState,
    PlatePart,
    RoomMood,
    RoomWeather,
    TableRoomTemplate
} from '@/themes/cinnaglass/room/room-types';
import { createAffordance } from '@/themes/cinnaglass/room/affordance';
import { createFadeQueue } from '@/themes/cinnaglass/room/fade-queue';
import { ACTOR_TINT, WEATHER_GRADE } from '@/themes/cinnaglass/room/lighting';
import { createPartnerLayer, type HeadAnchors, loadPartnerRig } from '@/themes/cinnaglass/room/partner-layer';
import { createPartnerDirector } from '@/themes/cinnaglass/room/partner-state';
import { createRainLayer } from '@/themes/cinnaglass/room/rain-layer';
import { createSteamLayer } from '@/themes/cinnaglass/room/steam-layer';

/** Who sits where: the partner's pose art across the table, the viewer's sleeves in front. */
export type TableCast = { viewer: AvatarId; partner: AvatarId; rig: AvatarRig };

/** Starting conditions for a scene. */
export type TableSceneInit = { mood: RoomMood; weather: RoomWeather; lampOn: boolean; partner: PartnerState };

/** What the scene reports back to the React shell. */
export type TableSceneEvents = {
    onHotspot?: (event: HotspotOpenEvent) => void;
    onLamp?: (on: boolean) => void;
    onPoke?: () => void;
    onPat?: (holding: boolean) => void;
};

/** Imperative handle the React shell drives the running scene through. */
export type TableSceneHandle = {
    setMood: (mood: RoomMood, animate: boolean) => void;
    setWeather: (weather: RoomWeather, animate: boolean) => void;
    setLamp: (on: boolean, animate: boolean) => void;
    setPartnerState: (state: PartnerState) => void;
    /** The partner takes a sip, e.g. after the viewer poured them a coffee. */
    offerSip: () => void;
    /** Debug panel: play a reaction as if it had happened (a pat is held for PAT_DEMO_MS). */
    playReaction: (kind: 'glance' | 'poked' | 'patted') => void;
    /** CSS px around the partner's head for overhead UI, or null while the chair is empty. */
    headAnchors: () => HeadAnchors | null;
    resize: () => void;
    destroy: () => void;
};

// Timings and depths (ai/features/study-room/study-room.md §四).
const MOOD_FADE_MS = 900;
const LAMP_FADE_MS = 420;
const SLEEP_DIM_MS = 1600;
const TRACE_FADE_MS = 400;
const PARALLAX_SCENE = 3;
const PARALLAX_FRONT = 10;
// the lamp's share of the light on anything that moves: off = dimmer and cooler
const LAMP_OFF_TINT = 0xb8c0d8;
// the lamp turns itself down while the partner sleeps (character.md 酣睡)
const LAMP_ASLEEP = 0.55;
// how long the debug panel's pat is held before it lets go
const PAT_DEMO_MS = 1600;
// a cup nobody drinks from cools over this long, down to a thin thread (effects.md 杯子蒸汽)
const CUP_COOL_MS = 15 * 60 * 1000;
const CUP_COLD_STEAM = 0.3;
// states that leave the chair empty
const STATE_EMPTY = new Set<PartnerState>(['away', 'offline']);

/** Multiply two 0xRRGGBB tints channel by channel. */
const mulTint = (a: number, b: number) => {
    const ch = (shift: number) => Math.round((((a >> shift) & 0xff) * ((b >> shift) & 0xff)) / 255) << shift;
    return ch(16) | ch(8) | ch(0);
};
/** Blend two 0xRRGGBB tints, t=0 → a, t=1 → b. */
const mixTint = (a: number, b: number, t: number) => {
    const ch = (shift: number) => {
        const from = (a >> shift) & 0xff;
        return Math.round(from + (((b >> shift) & 0xff) - from) * t) << shift;
    };
    return ch(16) | ch(8) | ch(0);
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** One hour × weather: the lit plate, and the unlit plate lying over it by how far the lamp is down. */
type PlateGroup = { group: Container; off: Sprite | null };

/**
 * Compose one across-the-table room. Awaits every texture before returning;
 * a missing file rejects, which the shell reports as a failed room load.
 */
export async function buildTableScene(
    app: Application,
    room: TableRoomTemplate,
    cast: TableCast,
    init: TableSceneInit,
    events: TableSceneEvents = {}
): Promise<TableSceneHandle> {
    const { w: baseW, h: baseH } = room.base;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const random: () => number = Math.random;

    /* ---------- assets ---------- */
    const plateOf = (mood: RoomMood) => room.plates[mood] ?? room.plates[room.moodFallback[mood]];
    const lampPlates = Object.values(room.plates).flatMap((p) => (p ? [p, ...(p.rain ? [p.rain] : [])] : []));
    const plateUrls = [...new Set(lampPlates.flatMap((p) => (p.off ? [p.on, p.off] : [p.on])))];
    const foreground = room.foreground[cast.viewer];
    const jacket = room.traces.jacket?.[cast.partner];
    const parts = [foreground, room.traces.mug, jacket, room.lamp?.chain].filter((p): p is PlatePart => !!p);
    const [textures, partnerRig] = await Promise.all([
        Assets.load<Texture>([...plateUrls, ...parts.map((p) => p.src)]),
        loadPartnerRig(cast.rig.manifest)
    ]);

    const partSprite = (part: PlatePart) => {
        const s = new Sprite(textures[part.src]);
        s.position.set(part.box.x, part.box.y);
        s.width = part.box.w;
        s.height = part.box.h;
        return s;
    };
    const plateSprite = (url: string) => {
        const s = new Sprite(textures[url]);
        s.width = baseW;
        s.height = baseH;
        return s;
    };

    /* ---------- tree ---------- */
    const root = new Container();
    const world = new Container();
    const scene = new Container();
    const front = new Container();
    world.addChild(scene, front);
    root.addChild(world);
    app.stage.addChild(root);
    // the grade only runs while it changes something: a filter re-renders the
    // whole world offscreen every frame, which is costly at a phone's 3x density
    const weatherFilter = new AdjustmentFilter();
    // pixi filters default to resolution 1: at a 3x screen the rainy world would
    // be redrawn at 1x and stretched back, which is what made rain look jagged
    weatherFilter.resolution = 'inherit';
    weatherFilter.antialias = 'inherit';

    const plateLayer = new Container();
    scene.addChild(plateLayer);
    const plateGroups = new Map<LampPlates, PlateGroup>();
    for (const p of lampPlates) {
        const group = new Container();
        group.alpha = 0;
        group.addChild(plateSprite(p.on));
        const off = p.off ? plateSprite(p.off) : null;
        if (off) {
            off.alpha = 0;
            group.addChild(off);
        }
        plateLayer.addChild(group);
        plateGroups.set(p, { group, off });
    }

    const rain = createRainLayer(room.window, random);
    scene.addChild(rain.container);

    const jacketSprite = jacket ? partSprite(jacket) : null;
    if (jacketSprite) {
        jacketSprite.alpha = 0;
        scene.addChild(jacketSprite);
    }

    const fades = createFadeQueue();
    const director = createPartnerDirector(init.partner, random, performance.now());
    const partner = createPartnerLayer(
        room.seat,
        partnerRig,
        random,
        {
            onPoke() {
                if (!director.react('poked', performance.now())) return;
                partner.flinch();
                events.onPoke?.();
            },
            onPat(holding) {
                if (director.pat(holding, performance.now())) events.onPat?.(holding);
            }
        },
        reduced
    );
    scene.addChild(partner.container);

    const mugSprite = room.traces.mug ? partSprite(room.traces.mug) : null;
    if (mugSprite) scene.addChild(mugSprite);
    const partnerSteam = room.steam?.partner ? createSteamLayer(room.steam.partner, random) : null;
    if (partnerSteam) scene.addChild(partnerSteam.container);

    // the chain hangs from its pivot; rotating the holder swings it in place
    const chainHolder = new Container();
    const chainSprite = room.lamp ? partSprite(room.lamp.chain) : null;
    if (room.lamp && chainSprite) {
        chainHolder.pivot.set(room.lamp.pivot.x, room.lamp.pivot.y);
        chainHolder.position.set(room.lamp.pivot.x, room.lamp.pivot.y);
        chainHolder.addChild(chainSprite);
        scene.addChild(chainHolder);
    }

    // the viewer's own hands draw above everything painted on the plates
    const foregroundSprite = foreground ? partSprite(foreground) : null;
    if (foregroundSprite) front.addChild(foregroundSprite);
    const viewerSteam = room.steam?.viewer ? createSteamLayer(room.steam.viewer, random) : null;
    if (viewerSteam) front.addChild(viewerSteam.container);
    for (const steam of [partnerSteam, viewerSteam]) if (steam && reduced) steam.container.visible = false;

    /* ---------- state ---------- */
    let mood = init.mood;
    let weather = init.weather;
    let lampOn = init.lampOn;
    let partnerState = init.partner;
    let stateSince = performance.now();
    let chainKick = 0; // swing impulse left over from the last pull
    let chainTugAt = -Infinity;
    let shown: PlateGroup | null = null;
    let retireAt = 0; // when the groups under the one fading in can go dark

    // the rainy pair wins while it rains; otherwise the dry plates
    const platesNow = () => {
        const plate = plateOf(mood);
        return weather === 'rain' && plate?.rain ? plate.rain : plate;
    };
    const lampCanSwitch = () => !!platesNow()?.off;
    // 1 = lit, 0 = off
    const lampLevel = () => (!lampOn ? 0 : partnerState === 'asleep' ? LAMP_ASLEEP : 1);

    const retire = () => {
        for (const g of plateGroups.values()) if (g !== shown) g.group.alpha = 0;
        retireAt = 0;
    };

    // Show the plates for the current hour, weather and lamp, and hand the same
    // light to everything that moves. Light adds up, so a dimmed lamp is the
    // unlit plate lying over the lit one at partial alpha; a new hour fades in
    // whole on top of the old one, which goes dark only once it is covered.
    const applyLight = (animate: boolean, durMs: number) => {
        const plate = platesNow();
        const next = plate ? (plateGroups.get(plate) ?? null) : null;
        const dim = plate?.off ? 1 - lampLevel() : 0;
        if (next) {
            if (next.off) {
                if (animate && next === shown) fades.start(next.off, dim, durMs);
                else next.off.alpha = dim;
            }
            if (next !== shown) {
                plateLayer.setChildIndex(next.group, plateLayer.children.length - 1);
                shown = next;
                if (animate) {
                    fades.start(next.group, 1, durMs);
                    retireAt = performance.now() + durMs;
                } else {
                    next.group.alpha = 1;
                    retire();
                }
            }
        }
        const lit = ACTOR_TINT[mood][weather];
        const tint = dim > 0 ? mixTint(lit, mulTint(lit, LAMP_OFF_TINT), dim) : lit;
        partner.setTint(tint);
        if (mugSprite) mugSprite.tint = tint;
        if (jacketSprite) jacketSprite.tint = tint;
        if (chainSprite) chainSprite.tint = tint;
        if (foregroundSprite) foregroundSprite.tint = tint;
        partnerSteam?.setTint(tint);
        viewerSteam?.setTint(tint);
        const grade = WEATHER_GRADE[weather];
        weatherFilter.saturation = grade.saturation;
        weatherFilter.brightness = grade.brightness;
        world.filters = grade.saturation === 1 && grade.brightness === 1 ? [] : [weatherFilter];
    };

    const pullLamp = () => {
        chainTugAt = performance.now();
        chainKick = 0.12;
        if (!lampCanSwitch()) return;
        lampOn = !lampOn;
        applyLight(!reduced, LAMP_FADE_MS);
        events.onLamp?.(lampOn);
    };

    // their cup stays warm while they are here and cools once they sleep or step away
    const partnerCupWarmth = (now: number) => {
        if (partnerState === 'offline') return 0;
        if (partnerState === 'away' || partnerState === 'asleep') {
            return Math.max(CUP_COLD_STEAM, 1 - (now - stateSince) / CUP_COOL_MS);
        }
        return 1;
    };

    const affordance = createAffordance(room.hotspots, random, (event) => {
        if (event.id === 'lamp') pullLamp();
        else events.onHotspot?.(event);
    });
    scene.addChild(affordance.hitContainer, affordance.sparkContainer, partner.hitContainer);

    /* ---------- parallax ---------- */
    const aim = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
        const rect = app.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        aim.x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        aim.y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    };
    if (!reduced) window.addEventListener('pointermove', onPointer);

    /* ---------- ticker ---------- */
    let elapsed = 0;
    const tick = () => {
        const dt = Math.min(app.ticker.deltaMS, 100) / 1000;
        elapsed += dt;
        const now = performance.now();
        fades.update(now);
        if (retireAt && now >= retireAt) retire();

        rain.setRaining(weather === 'rain', fades);
        rain.update(dt);

        const pose = director.update(now);
        partner.show(pose, true);
        // every frame, reduced motion too: the layer owns the poses' opacity and the blinks
        partner.update(elapsed);
        // the mug is in their hands while they sip
        if (mugSprite) mugSprite.visible = pose !== 'sip';

        if (!reduced) {
            if (partnerSteam) {
                partnerSteam.container.visible = pose !== 'sip';
                partnerSteam.setStrength(partnerCupWarmth(now));
                partnerSteam.update(dt);
            }
            viewerSteam?.update(dt);
        }

        if (chainSprite && room.lamp) {
            const hovered = affordance.isHovered('lamp');
            chainKick *= Math.exp(-3 * dt);
            const idle = reduced ? 0 : (hovered ? 0.03 : 0.012) * Math.sin((elapsed / 2.6) * Math.PI * 2);
            chainHolder.rotation = idle + chainKick * Math.sin((elapsed / 0.9) * Math.PI * 2);
            const tug = now - chainTugAt < 120 ? 6 : 0;
            chainSprite.y = room.lamp.chain.box.y + tug;
        }

        affordance.update(dt);

        if (!reduced) {
            eased.x += (aim.x - eased.x) * 0.12;
            eased.y += (aim.y - eased.y) * 0.12;
            const s = root.scale.x || 1;
            scene.position.set((-eased.x * PARALLAX_SCENE) / s, (-eased.y * PARALLAX_SCENE * 0.5) / s);
            front.position.set((-eased.x * PARALLAX_FRONT) / s, (-eased.y * PARALLAX_FRONT * 0.5) / s);
        }
    };
    app.ticker.maxFPS = 30;
    app.ticker.add(tick);

    const onVisibility = () => {
        if (document.hidden) app.stop();
        else app.start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    /* ---------- cover-fit: the face centred across, the head kept in on wide screens ---------- */
    const resize = () => {
        const { width: w, height: h } = app.renderer.screen;
        // the plates drift with the pointer and the hands drift further, so
        // the plate overhangs every edge by as much as they can travel
        const slackX = reduced ? 0 : PARALLAX_SCENE;
        const slackY = reduced ? 0 : PARALLAX_FRONT * 0.5;
        const s = Math.max((w + 2 * slackX) / baseW, (h + 2 * slackY) / baseH);
        root.scale.set(s);
        root.position.set(
            clamp(w / 2 - room.crop.x * s, w - baseW * s + slackX, -slackX),
            clamp(-room.crop.top * s, h - baseH * s + slackY, -slackY)
        );
    };
    resize();

    const applyTraces = (animate: boolean) => {
        if (!jacketSprite) return;
        const to = STATE_EMPTY.has(partnerState) ? 1 : 0;
        if (animate) fades.start(jacketSprite, to, TRACE_FADE_MS);
        else jacketSprite.alpha = to;
    };

    // every pose is uploaded now: a pose shown for the first time (the first pat)
    // would otherwise upload its large texture mid-swap and stall a frame. Not
    // awaited: the queue runs on frames, which a hidden tab never gets
    void app.renderer.prepare.upload(partner.textures);

    applyLight(false, 0);
    applyTraces(false);
    partner.show(director.update(performance.now()), false);

    return {
        setMood(next, animate) {
            if (next === mood) return;
            mood = next;
            applyLight(animate && !reduced, MOOD_FADE_MS);
        },
        setWeather(next, animate) {
            if (next === weather) return;
            weather = next;
            applyLight(animate && !reduced, MOOD_FADE_MS);
        },
        setLamp(on, animate) {
            if (on === lampOn) return;
            lampOn = on;
            applyLight(animate && !reduced, LAMP_FADE_MS);
        },
        setPartnerState(next) {
            if (next === partnerState) return;
            const sleepChanged = (next === 'asleep') !== (partnerState === 'asleep');
            partnerState = next;
            stateSince = performance.now();
            director.setState(next, stateSince);
            applyTraces(!reduced);
            if (sleepChanged) applyLight(!reduced, SLEEP_DIM_MS);
        },
        offerSip() {
            director.react('sip', performance.now());
        },
        playReaction(kind) {
            const now = performance.now();
            if (kind === 'glance') director.react('glance', now);
            // the same path as a real tap, so the flinch and the poke event come with it
            else if (kind === 'poked') {
                if (director.react('poked', now)) partner.flinch();
            } else if (director.pat(true, now))
                window.setTimeout(() => director.pat(false, performance.now()), PAT_DEMO_MS);
        },
        headAnchors() {
            if (STATE_EMPTY.has(partnerState)) return null;
            const a = partner.anchors();
            return {
                left: scene.toGlobal(a.left),
                right: scene.toGlobal(a.right),
                faceRight: scene.toGlobal({ x: a.faceRight, y: a.right.y }).x,
                shoulder: scene.toGlobal({ x: a.right.x, y: a.shoulder }).y
            };
        },
        resize,
        destroy() {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pointermove', onPointer);
            app.ticker.remove(tick);
        }
    };
}
