// pixi-scene.ts — the WebGL room compositor (PixiJS v8). It owns no layer of
// its own: each layer is built by its own module, and this file decides the
// order they stack in, the order they tick in, and how a mood change reaches
// all of them at once. One render tree, one lighting story.
//
// Layer tree (all coordinates in base-image pixels, root scales to cover),
// with the module that builds each one:
//   root
//   ├─ world                       ← AdjustmentFilter (weather desaturation)
//   │   ├─ base sprites (per mood art, alpha cross-fade)    here
//   │   ├─ turntable platter       ← the record's albedo, turning
//   │   ├─ turntable light         ← the painted light on it, never turning
//   │   ├─ turntable stills        ← spindle pin and other static cuts
//   │   ├─ turntable armSwing      ← arm shadows + arms, hinged at the post
//   │   │                                                   turntable-prop.ts
//   │   ├─ rain container          ← masked by window panes rain-layer.ts
//   │   ├─ clock (shadow + hands)  ← mood tint              clock-layer.ts
//   │   ├─ characters              ← mood tint + shadow     character-layer.ts
//   │   ├─ hotspot zones           ← hit areas only         affordance.ts
//   │   └─ sparkles                ← additive particles     affordance.ts
//   └─ light (wash/glow/breath, rebuilt per mood)           lighting.ts
//
// The layers never import each other. The only two things they share are
// read-only and passed in: the room template and the current light recipe. A
// hover flag or a cross-fade that two layers both need travels through the
// tick below, which is therefore the one place execution order is decided.

import { type Application, Assets, Container, Sprite, type Texture } from 'pixi.js';
import { AdjustmentFilter } from 'pixi-filters';
import type { HotspotOpenEvent, RoomMood, RoomTemplate, RoomWeather } from '@/themes/cinnaglass/room/room-types';
import { resolveRoomArt } from '@/themes/cinnaglass/room/room-types';
import { createAffordance } from '@/themes/cinnaglass/room/affordance';
import { type CharacterAssets, createCharacterLayer } from '@/themes/cinnaglass/room/character-layer';
import { createClockLayer } from '@/themes/cinnaglass/room/clock-layer';
import { createFadeQueue } from '@/themes/cinnaglass/room/fade-queue';
import { createLightPass, type LightRecipe, RECIPES, WEATHER_GRADE } from '@/themes/cinnaglass/room/lighting';
import { createRainLayer } from '@/themes/cinnaglass/room/rain-layer';
import { createTurntable, type TurntableProp } from '@/themes/cinnaglass/room/turntable-prop';

// the character art contract lives with the layer that consumes it; the
// compositor keeps re-exporting it so the React shell has one import
export type { CharacterAssets };

/** Imperative handle the React shell drives a running scene through. */
export type SceneHandle = {
    setMood: (mood: RoomMood, animate: boolean) => void;
    setWeather: (weather: RoomWeather, animate: boolean) => void;
    /** Screen-space (CSS px) anchor above a seat's head, for DOM overlays. */
    getSeatScreenPos: (seatId: string) => { x: number; y: number } | null;
    resize: () => void;
    destroy: () => void;
};

/* ------------------------------------------------------------------ */
/* scene construction                                                  */
/* ------------------------------------------------------------------ */

/**
 * Compose one room into a Pixi stage: base art per mood, rain masked to the
 * glass, clock hands, characters, living props and the light pass, all under
 * one root that cover-fits the canvas. Awaits every texture before returning.
 * The returned handle is the only way to drive the scene afterwards; call its
 * destroy() before tearing down the Application, which the caller still owns.
 */
export async function buildScene(
    app: Application,
    room: RoomTemplate,
    charAssets: CharacterAssets,
    initialMood: RoomMood,
    initialWeather: RoomWeather,
    onHotspot?: (event: HotspotOpenEvent) => void
): Promise<SceneHandle> {
    const { w: baseW, h: baseH } = room.base;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // every random draw in the scene comes from here, so a test build can swap
    // in a seeded generator and replay a frame exactly
    const random: () => number = Math.random;

    /* ---------- asset loading ---------- */
    const artUrls = [...new Set(Object.values(room.art))] as string[];
    const charUrls = Object.values(charAssets).flatMap((a) => [a.open, a.closed]);
    const textures = await Assets.load<Texture>([...artUrls, ...charUrls]);

    /* ---------- tree ---------- */
    const root = new Container();
    const world = new Container();
    const lightPass = createLightPass(baseW, baseH, room.window.glow);
    root.addChild(world, lightPass.container);
    app.stage.addChild(root);

    // base art sprites, one per distinct file, cross-faded by alpha
    const baseSprites = new Map<string, Sprite>();
    for (const url of artUrls) {
        const s = new Sprite(textures[url]);
        s.width = baseW;
        s.height = baseH;
        s.alpha = 0;
        world.addChild(s);
        baseSprites.set(url, s);
    }

    /* ---------- living props ---------- */
    // the prop builds its own layers and hands them back in draw order; the
    // compositor only decides where they sit in the world and when they tick
    const turntableSpec = room.props?.turntable;
    const turntable: TurntableProp | null = turntableSpec
        ? await createTurntable(app, turntableSpec, room.art, artUrls, textures)
        : null;
    if (turntable) world.addChild(...turntable.layers);

    /* ---------- rain (masked to glass panes) ---------- */
    const rain = createRainLayer(room.window, random);
    world.addChild(rain.container);

    /* ---------- clock ---------- */
    const clock = createClockLayer(room.clock);
    world.addChild(clock.container);

    /* ---------- characters ---------- */
    const characters = createCharacterLayer(room.seats, charAssets, textures, random);
    world.addChild(characters.container);

    /* ---------- furniture hotspots and sparkles ---------- */
    const affordance = createAffordance(room.hotspots, random, onHotspot);
    world.addChild(affordance.hitContainer, affordance.sparkContainer);

    // weather grading for the whole world (art included)
    const weatherFilter = new AdjustmentFilter();
    world.filters = [weatherFilter];

    /* ---------- state & transitions ---------- */
    let mood: RoomMood = initialMood;
    let weather: RoomWeather = initialWeather;
    // the recipe in force, so the ticker never re-reads the table every frame
    let recipe: LightRecipe = RECIPES[initialMood][initialWeather];
    const fades = createFadeQueue();

    // Apply the current mood x weather: weather grade, actor tint, base-art
    // cross-fade (prop cuts ride along with the art they were carved from) and
    // a freshly built light pass. With animate=false everything snaps and the
    // old light pass is destroyed at once instead of fading out.
    const applyRecipe = (animate: boolean) => {
        const rec = RECIPES[mood][weather];
        recipe = rec;
        const grade = WEATHER_GRADE[weather];
        weatherFilter.saturation = grade.saturation;
        weatherFilter.brightness = grade.brightness;
        // mood grading for actors and clock: they eat the room's light via tint
        characters.setTint(rec.actorTint);
        clock.setTint(rec.actorTint);

        const targetArt = resolveRoomArt(room, mood);
        for (const [url, s] of baseSprites) {
            const to = url === targetArt ? 1 : 0;
            // prop cuts were taken from this very art, so they fade with it
            for (const obj of [s, ...(turntable?.cutsByArtUrl.get(url) ?? [])]) {
                if (animate) fades.start(obj, to, 900);
                else obj.alpha = to;
            }
        }

        lightPass.apply(rec, fades, animate);
    };

    /* ---------- ticker ---------- */
    let elapsed = 0;
    // One frame: advance the fade queue, then rain, characters, clock, light
    // breathing, living props and the sparkle affordance, in that order. dt is
    // capped at 100ms so a backgrounded tab cannot teleport any simulation.
    const tick = () => {
        const dt = Math.min(app.ticker.deltaMS, 100) / 1000;
        elapsed += dt;
        const now = performance.now();

        // alpha fades
        fades.update(now);

        // rain
        rain.setRaining(weather === 'rain', fades);
        rain.update(dt);

        // characters: breathe, sway, blink
        characters.update(elapsed, now);

        // clock
        clock.update(new Date());

        // cloud-cover light breathing
        lightPass.update(elapsed, recipe);

        // living props: the vinyl never stops; hovering the turntable leans on
        // the platter (speed) and the tonearm gives a small swing — state
        // changes on the prop itself, never a glow swap
        turntable?.update(dt, affordance.isHovered('music'));

        // hotspot hints and sparkles
        affordance.update(dt);
    };

    app.ticker.maxFPS = 30;
    app.ticker.add(tick);

    /* ---------- power discipline ---------- */
    // stop the ticker while the tab is hidden, resume it on return
    const onVisibility = () => {
        if (document.hidden) app.stop();
        else app.start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (reduced) {
        // reduced motion: render one full frame, then freeze
        applyRecipe(false);
        app.render();
        app.stop();
    }

    /* ---------- cover-fit layout ---------- */
    // the shipped base art carries a painted ~20px rounded dark frame (a
    // concept-era window prop); over-scaling the cover pushes it off-canvas
    // until frameless art lands. All anchors share root's transform, so
    // hotspots/seats stay aligned.
    const EDGE_CROP = 1.035;
    // Cover-fit the base art to the canvas, then refit the disc masters to the
    // size they are now drawn at.
    const resize = () => {
        const w = app.renderer.width / app.renderer.resolution;
        const h = app.renderer.height / app.renderer.resolution;
        const s = Math.max(w / baseW, h / baseH) * EDGE_CROP; // cover + crop
        root.scale.set(s);
        root.position.set((w - baseW * s) / 2, (h - baseH * s) / 2);
        // the record's unit square spans two rim radii in base px
        if (turntableSpec) turntable?.refit(2 * turntableSpec.platter.rx * s * app.renderer.resolution);
    };
    resize();

    applyRecipe(false);

    return {
        // Switch the lighting hour; a repeat of the current mood is ignored.
        setMood(next, animate) {
            if (next === mood) return;
            mood = next;
            applyRecipe(animate && !reduced);
        },
        // Switch between the sunny and the rainy pass; a repeat is ignored.
        setWeather(next, animate) {
            if (next === weather) return;
            weather = next;
            applyRecipe(animate && !reduced);
        },
        getSeatScreenPos(seatId) {
            const seat = room.seats.find((s) => s.id === seatId);
            if (!seat) return null;
            // ~22px of air above the hand-tuned visual head top (see
            // ai/codex-visual/20260811-044310Z/codex-report.md H1: the tag must
            // read as "her status", not a wall toast); toGlobal already yields
            // logical (CSS px) stage coordinates
            return root.toGlobal({
                x: seat.foot.x,
                y: seat.foot.y - seat.height * seat.headRatio - 22
            });
        },
        resize,
        // Detach the ticker, the visibility listener and the postrender runner,
        // then flush any disc textures still waiting to be retired. Does not
        // destroy the Application — the caller owns it.
        destroy() {
            document.removeEventListener('visibilitychange', onVisibility);
            app.ticker.remove(tick);
            turntable?.destroy();
        }
    };
}
