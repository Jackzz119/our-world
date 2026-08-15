// pixi-scene.ts — the WebGL room compositor (PixiJS v8). One render tree,
// one lighting story: base art, rain (masked to the glass), clock hands,
// characters and the weather light pass all live in the same pipeline, so
// mood grading reaches every layer — the "pasted on" look of the CSS
// prototype is gone by construction.
//
// Layer tree (all coordinates in base-image pixels, root scales to cover):
//   root
//   ├─ world                       ← AdjustmentFilter (weather desaturation)
//   │   ├─ base sprites (per mood art, alpha cross-fade)
//   │   ├─ rain container          ← masked by window-pane Graphics
//   │   ├─ clock (shadow + hands)  ← mood tint
//   │   └─ characters              ← mood tint + contact shadow
//   └─ light (wash/glow/breath, rebuilt per mood, alpha fade)

import {
    Application,
    Assets,
    Container,
    Graphics,
    Rectangle,
    Sprite,
    Texture
} from 'pixi.js';
import { AdjustmentFilter } from 'pixi-filters';
import type { RoomMood, RoomTemplate, RoomWeather } from './room-types';
import { resolveRoomArt } from './room-types';

export type CharacterAssets = Record<string, { open: string; closed: string }>;

export type SceneHandle = {
    setMood: (mood: RoomMood, animate: boolean) => void;
    setWeather: (weather: RoomWeather, animate: boolean) => void;
    /** Screen-space (CSS px) anchor above a seat's head, for DOM overlays. */
    getSeatScreenPos: (seatId: string) => { x: number; y: number } | null;
    resize: () => void;
    destroy: () => void;
};

/* ------------------------------------------------------------------ */
/* mood & weather recipes                                              */
/* ------------------------------------------------------------------ */

type LightRecipe = {
    /** character/clock multiply tint — how much of the room's light they eat */
    actorTint: number;
    washTop: string;
    washBottom: string;
    washAlpha: number;
    washBlend: 'multiply' | 'screen' | 'normal';
    glowColor: string;
    glowAlpha: number;
    breathAlpha: number; // cloud-cover light breathing (rain only)
};

const RECIPES: Record<RoomMood, Record<RoomWeather, LightRecipe>> = {
    golden: {
        sun: {
            actorTint: 0xffe8cf,
            washTop: 'rgba(255,190,120,0.30)',
            washBottom: 'rgba(150,130,190,0.12)',
            washAlpha: 0.5,
            washBlend: 'normal',
            glowColor: 'rgba(255,205,140,1)',
            glowAlpha: 0.42,
            breathAlpha: 0,
        },
        rain: {
            actorTint: 0xd8dde8,
            washTop: 'rgba(150,170,200,0.42)',
            washBottom: 'rgba(110,130,165,0.22)',
            washAlpha: 0.55,
            washBlend: 'normal',
            glowColor: 'rgba(205,220,238,1)',
            glowAlpha: 0.28,
            breathAlpha: 0.30,
        }
    },
    // codex audit M3: dim less globally, keep faces warm — washes dropped
    // ~15%, actor tints lifted toward lamp-warm
    twilight: {
        sun: {
            actorTint: 0xf8ddd2,
            washTop: 'rgba(235,150,150,0.22)',
            washBottom: 'rgba(95,90,170,0.16)',
            washAlpha: 0.42,
            washBlend: 'normal',
            glowColor: 'rgba(250,170,130,1)',
            glowAlpha: 0.34,
            breathAlpha: 0,
        },
        rain: {
            actorTint: 0xd4d2e4,
            washTop: 'rgba(140,140,178,0.30)',
            washBottom: 'rgba(75,80,130,0.22)',
            washAlpha: 0.47,
            washBlend: 'normal',
            glowColor: 'rgba(190,200,228,1)',
            glowAlpha: 0.24,
            breathAlpha: 0.34,
        }
    },
    night: {
        sun: {
            actorTint: 0xc2cbe6,
            washTop: 'rgba(90,120,190,0.13)',
            washBottom: 'rgba(25,32,68,0.20)',
            washAlpha: 0.47,
            washBlend: 'normal',
            glowColor: 'rgba(165,195,245,1)',
            glowAlpha: 0.20,
            breathAlpha: 0,
        },
        rain: {
            actorTint: 0xb8c0dd,
            washTop: 'rgba(80,100,155,0.17)',
            washBottom: 'rgba(22,28,60,0.23)',
            washAlpha: 0.5,
            washBlend: 'normal',
            glowColor: 'rgba(150,180,235,1)',
            glowAlpha: 0.18,
            breathAlpha: 0.28,
        }
    }
};

// weather-wide grading applied to the whole world container (art included)
const WEATHER_GRADE: Record<RoomWeather, { saturation: number; brightness: number }> = {
    sun: { saturation: 1, brightness: 1 },
    rain: { saturation: 0.86, brightness: 0.96 }
};

/* ------------------------------------------------------------------ */
/* gradient texture helpers (offscreen canvas — version-stable)        */
/* ------------------------------------------------------------------ */

function linearGradientTexture(top: string, bottom: string, angleDeg = 115): Texture {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const rad = (angleDeg * Math.PI) / 180;
    const x = Math.cos(rad) * 64;
    const y = Math.sin(rad) * 64;
    const g = ctx.createLinearGradient(32 - x / 2, 32 - y / 2, 32 + x / 2, 32 + y / 2);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return Texture.from(c);
}

function radialGradientTexture(color: string, innerAlpha = 1): Texture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    const rgba = (a: number) => color.replace(/,\s*[\d.]+\)$/, `,${a})`);
    g.addColorStop(0, rgba(innerAlpha));
    g.addColorStop(0.55, rgba(innerAlpha * 0.45));
    g.addColorStop(1, rgba(0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return Texture.from(c);
}

/**
 * Four-point star sparkle: long soft cross rays + a bright core + a faint
 * halo. Drawn once on an offscreen canvas, reused by every particle.
 */
function sparkleTexture(): Texture {
    const S = 96;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d')!;
    const m = S / 2;

    // color tiers per the sparkle spec: core #FFF8E8, rays #FFE6B5, halo #FFC978
    const ray = (len: number, w: number, angle: number) => {
        ctx.save();
        ctx.translate(m, m);
        ctx.rotate(angle);
        const g = ctx.createLinearGradient(-len, 0, len, 0);
        g.addColorStop(0, 'rgba(255,230,181,0)');
        g.addColorStop(0.5, 'rgba(255,230,181,0.95)');
        g.addColorStop(1, 'rgba(255,230,181,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, len, w, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };
    // halo — low-alpha warm amber only, never a solid orange blob
    const halo = ctx.createRadialGradient(m, m, 2, m, m, m * 0.8);
    halo.addColorStop(0, 'rgba(255,201,120,0.4)');
    halo.addColorStop(1, 'rgba(255,201,120,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, S, S);
    // long vertical/horizontal rays, short diagonals
    ray(m * 0.9, m * 0.1, 0);
    ray(m * 0.9, m * 0.1, Math.PI / 2);
    ray(m * 0.42, m * 0.07, Math.PI / 4);
    ray(m * 0.42, m * 0.07, -Math.PI / 4);
    // core
    const core = ctx.createRadialGradient(m, m, 0, m, m, m * 0.16);
    core.addColorStop(0, 'rgba(255,255,248,1)');
    core.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, S, S);
    return Texture.from(c);
}

/* ------------------------------------------------------------------ */
/* rain particles (ported from the canvas prototype)                   */
/* ------------------------------------------------------------------ */

type Streak = { pane: number; x: number; y: number; len: number; speed: number; drift: number; alpha: number; width: number };
type TrailPoint = { x: number; y: number; age: number };
type Drop = { pane: number; x: number; y: number; r: number; vy: number; sliding: boolean; wobble: number; trail: TrailPoint[] };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const TRAIL_FADE_S = 1.4;

function makeStreak(room: RoomTemplate, pane: number, anywhere: boolean): Streak {
    const p = room.window.panes[pane];
    const speed = rand(300, 560);
    return {
        pane,
        x: rand(p.x, p.x + p.w),
        y: anywhere ? rand(p.y, p.y + p.h) : p.y - rand(0, 40),
        len: rand(14, 30),
        speed,
        drift: -speed * 0.055,
        alpha: 0.10 + (speed / 560) * 0.22,
        width: rand(1, 1.7)
    };
}

function makeDrop(room: RoomTemplate, pane: number): Drop {
    const p = room.window.panes[pane];
    return {
        pane,
        x: rand(p.x + 6, p.x + p.w - 6),
        y: rand(p.y + 6, p.y + p.h * 0.7),
        r: rand(1.2, 2.4),
        vy: 0,
        sliding: false,
        wobble: rand(0, Math.PI * 2),
        trail: []
    };
}

/* ------------------------------------------------------------------ */
/* scene construction                                                  */
/* ------------------------------------------------------------------ */

export async function buildScene(
    app: Application,
    room: RoomTemplate,
    charAssets: CharacterAssets,
    initialMood: RoomMood,
    initialWeather: RoomWeather,
    onHotspot?: (id: string) => void
): Promise<SceneHandle> {
    const { w: baseW, h: baseH } = room.base;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- asset loading ---------- */
    const artUrls = [...new Set(Object.values(room.art))] as string[];
    const charUrls = Object.values(charAssets).flatMap((a) => [a.open, a.closed]);
    const textures = await Assets.load<Texture>([...artUrls, ...charUrls]);

    /* ---------- tree ---------- */
    const root = new Container();
    const world = new Container();
    const light = new Container();
    root.addChild(world, light);
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

    /* ---------- rain (masked to glass panes) ---------- */
    const rainC = new Container();
    const paneMask = new Graphics();
    for (const p of room.window.panes) paneMask.rect(p.x, p.y, p.w, p.h);
    paneMask.fill({ color: 0xffffff });
    rainC.mask = paneMask;
    rainC.addChild(paneMask); // mask must be in the tree
    const streakG = new Graphics();
    const dropG = new Graphics();
    rainC.addChild(streakG, dropG);
    world.addChild(rainC);

    const streaks: Streak[] = [];
    const drops: Drop[] = [];
    room.window.panes.forEach((p, i) => {
        const sc = Math.min(70, Math.round((p.w * p.h) / 5200));
        for (let n = 0; n < sc; n++) streaks.push(makeStreak(room, i, true));
        const dc = Math.min(10, Math.round((p.w * p.h) / 20000));
        for (let n = 0; n < dc; n++) drops.push(makeDrop(room, i));
    });

    /* ---------- clock ---------- */
    const clockC = new Container();
    clockC.position.set(room.clock.center.x, room.clock.center.y);
    const r = room.clock.radius;
    // painted drop shadow behind the hands sells "hands on the wall"
    const handShadow = new Graphics();
    handShadow.position.set(r * 0.03, r * 0.05);
    handShadow.alpha = 0.35;
    const hands = new Graphics();
    clockC.addChild(handShadow, hands);
    world.addChild(clockC);

    const drawHands = (g: Graphics, shadow: boolean) => {
        const now = new Date();
        const s = now.getSeconds() + now.getMilliseconds() / 1000;
        const m = now.getMinutes() + s / 60;
        const h = (now.getHours() % 12) + m / 60;
        const col = shadow ? 0x2c2118 : undefined;
        const hand = (angleDeg: number, len: number, w: number, color: number) => {
            const a = ((angleDeg - 90) * Math.PI) / 180;
            g.moveTo(0, 0);
            g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
            g.stroke({ width: w, color: col ?? color, cap: 'round' });
        };
        hand(h * 30, r * 0.50, r * 0.075, 0x5b4636);
        hand(m * 6, r * 0.74, r * 0.055, 0x6b543f);
        hand(s * 6, r * 0.84, r * 0.026, 0xa4553f); // sweep second — quiet, cozy
        g.circle(0, 0, r * 0.05).fill({ color: col ?? 0x4c3a2c });
    };

    /* ---------- characters ---------- */
    type Char = {
        sway: Container;
        breathe: Container;
        sprite: Sprite;
        open: Texture;
        closed: Texture;
        phase: number;
        nextBlinkAt: number;
        blinkUntil: number;
        doubleBlink: boolean;
    };
    const chars: Char[] = [];
    const actorLayer = new Container();
    world.addChild(actorLayer);

    for (const seat of room.seats) {
        const assets = charAssets[seat.id];
        if (!assets) continue;
        const open = textures[assets.open];
        const closed = textures[assets.closed];
        const holder = new Container();
        holder.position.set(seat.foot.x, seat.foot.y);

        // contact shadow: grounds the character on the furniture
        const shadowTex = radialGradientTexture('rgba(30,24,40,1)', 1);
        const shadow = new Sprite(shadowTex);
        shadow.anchor.set(0.5);
        shadow.alpha = 0.30;
        holder.addChild(shadow);

        const sway = new Container();
        const breathe = new Container();
        const sprite = new Sprite(open);
        sprite.anchor.set(0.5, 1); // feet at the anchor point
        const scale = seat.height / sprite.texture.height;
        sprite.scale.set(scale);
        shadow.width = sprite.width * 0.92;
        shadow.height = sprite.width * 0.17;
        breathe.addChild(sprite);
        sway.addChild(breathe);
        holder.addChild(sway);
        actorLayer.addChild(holder);

        chars.push({
            sway,
            breathe,
            sprite,
            open,
            closed,
            phase: seat.phase,
            nextBlinkAt: performance.now() + rand(1500, 5000),
            blinkUntil: 0,
            doubleBlink: false
        });
    }

    // mood grading for actors + clock: they eat the room's light via tint
    const setActorTint = (tint: number) => {
        for (const c of chars) c.sprite.tint = tint;
        hands.tint = tint;
    };

    /* ---------- furniture hotspots (sparkles + hover glow + tap) ----------
       The idle ring is gone (2026-08-12 user call: white borders read as UI
       chrome). Clickability is now whispered by wandering gold sparkles —
       rare while idle, eager while hovered. */
    type Hot = { rect: (typeof room.hotspots)[number]['rect']; glow: Sprite; hovered: boolean; nextSparkleAt: number };
    const hots: Hot[] = [];
    const hotLayer = new Container();
    world.addChild(hotLayer);
    for (const h of room.hotspots) {
        const zone = new Container();
        zone.eventMode = 'static';
        zone.cursor = 'pointer';
        zone.hitArea = new Rectangle(h.rect.x, h.rect.y, h.rect.w, h.rect.h);

        // warm watercolor bloom, silent until hover (ai/UX.md §5)
        const glow = new Sprite(radialGradientTexture('rgba(255,236,200,1)'));
        glow.anchor.set(0.5);
        glow.position.set(h.rect.x + h.rect.w / 2, h.rect.y + h.rect.h / 2);
        glow.width = h.rect.w * 1.7;
        glow.height = h.rect.h * 1.7;
        glow.blendMode = 'screen';
        glow.alpha = 0;
        zone.addChild(glow);

        const hot: Hot = {
            rect: h.rect,
            glow,
            hovered: false,
            nextSparkleAt: rand(1, 6) // desynced first twinkles
        };
        zone.on('pointerover', () => {
            hot.hovered = true; // ticker breathes the bloom while hovered
            // spec: greet the pointer with one peak spark right away
            hot.nextSparkleAt = -1;
        });
        zone.on('pointerout', () => {
            hot.hovered = false;
            startFade(glow, 0, 260);
        });
        zone.on('pointertap', () => onHotspot?.(h.id));
        hots.push(hot);
        hotLayer.addChild(zone);
    }

    /* ---------- sparkle affordance (replaces the idle ring) ----------
       Tuning follows the sparkle mockup brief: warm gold, 6–16px, sine
       fade in/out, ≤8 visible at once across the room. */
    type Spark = { sprite: Sprite; born: number; life: number; size: number; spin: number; drift: number };
    const sparks: Spark[] = [];
    const sparkTex = sparkleTexture();
    const sparkLayer = new Container();
    world.addChild(sparkLayer);
    // rhythm per the sparkle spec: idle 0–1 per spot (3–6 visible room-wide),
    // hover ≤2 per spot at a calm 0.9–1.4s pace — never a pulse train
    const IDLE_GAP: [number, number] = [2.8, 6.5];
    const HOVER_GAP: [number, number] = [0.9, 1.4];
    const MAX_SPARKS = 8;

    const spawnSpark = (hot: Hot, t: number) => {
        if (sparks.length >= MAX_SPARKS + 4) return; // hard cap incl. hover bursts
        const s = new Sprite(sparkTex);
        s.anchor.set(0.5);
        // biased toward the object's center so sparks sit ON the furniture
        const bx = 0.22 + Math.random() * 0.56;
        const by = 0.22 + Math.random() * 0.56;
        s.position.set(hot.rect.x + hot.rect.w * bx, hot.rect.y + hot.rect.h * by);
        s.blendMode = 'add';
        s.alpha = 0;
        const size = rand(7, 16);
        s.width = size;
        s.height = size;
        sparkLayer.addChild(s);
        sparks.push({
            sprite: s,
            born: t,
            life: rand(1.6, 2.4), // spec: 1.6–2.4s with natural jitter
            size,
            spin: rand(-0.5, 0.5),
            drift: rand(0.5, 3) // px/s upward — twinkle in place, no flight path
        });
    };

    // weather grading for the whole world (art included)
    const weatherFilter = new AdjustmentFilter();
    world.filters = [weatherFilter];

    /* ---------- light pass (rebuilt per recipe, cross-faded) ---------- */
    const glowRect = room.window.glow;
    const buildLight = (rec: LightRecipe): Container => {
        const c = new Container();

        const wash = new Sprite(linearGradientTexture(rec.washTop, rec.washBottom));
        wash.width = baseW;
        wash.height = baseH;
        wash.alpha = rec.washAlpha;
        if (rec.washBlend !== 'normal') wash.blendMode = rec.washBlend;
        c.addChild(wash);

        const glow = new Sprite(radialGradientTexture(rec.glowColor));
        glow.anchor.set(0.5);
        glow.position.set(glowRect.x + glowRect.w / 2, glowRect.y + glowRect.h / 2);
        glow.width = glowRect.w * 2.6;
        glow.height = glowRect.h * 2.1;
        glow.blendMode = 'screen';
        glow.alpha = rec.glowAlpha;
        c.addChild(glow);

        if (rec.breathAlpha > 0) {
            const breath = new Sprite(radialGradientTexture('rgba(30,38,62,1)'));
            breath.anchor.set(0.5);
            breath.position.copyFrom(glow.position);
            breath.width = glow.width;
            breath.height = glow.height;
            breath.blendMode = 'multiply';
            breath.alpha = 0;
            breath.label = 'breath';
            c.addChild(breath);
        }

        // vignette retired (2026-08-11 user call): the frame-rect version
        // read as a black overlay hugging the edges — the design comps have
        // no edge darkening at all, so the light pass ends here.
        return c;
    };

    /* ---------- state & transitions ---------- */
    let mood: RoomMood = initialMood;
    let weather: RoomWeather = initialWeather;
    let currentLight: Container | null = null;
    type Fade = { obj: Container | Sprite; from: number; to: number; start: number; dur: number; kill?: boolean };
    let fades: Fade[] = [];

    const startFade = (obj: Container | Sprite, to: number, dur: number, kill = false) => {
        fades = fades.filter((f) => f.obj !== obj);
        fades.push({ obj, from: obj.alpha, to, start: performance.now(), dur, kill });
    };

    const applyRecipe = (animate: boolean) => {
        const rec = RECIPES[mood][weather];
        const grade = WEATHER_GRADE[weather];
        weatherFilter.saturation = grade.saturation;
        weatherFilter.brightness = grade.brightness;
        setActorTint(rec.actorTint);

        const targetArt = resolveRoomArt(room, mood);
        for (const [url, s] of baseSprites) {
            const to = url === targetArt ? 1 : 0;
            if (animate) startFade(s, to, 900);
            else s.alpha = to;
        }

        const next = buildLight(rec);
        next.alpha = 0;
        light.addChild(next);
        if (animate) {
            startFade(next, 1, 900);
            if (currentLight) startFade(currentLight, 0, 900, true);
        } else {
            next.alpha = 1;
            if (currentLight) {
                light.removeChild(currentLight);
                currentLight.destroy({ children: true });
            }
        }
        currentLight = next;
    };

    /* ---------- ticker ---------- */
    let elapsed = 0;
    const tick = () => {
        const dtMs = app.ticker.deltaMS;
        const dt = Math.min(dtMs, 100) / 1000;
        elapsed += dt;
        const now = performance.now();

        // alpha fades
        for (const f of fades) {
            const t = Math.min(1, (now - f.start) / f.dur);
            f.obj.alpha = f.from + (f.to - f.from) * t;
            if (t >= 1 && f.kill) {
                f.obj.parent?.removeChild(f.obj as Container);
                (f.obj as Container).destroy({ children: true });
            }
        }
        fades = fades.filter((f) => now - f.start < f.dur);

        // rain
        const raining = weather === 'rain';
        rainC.visible = raining || rainC.alpha > 0.01;
        startRainAlpha(raining);
        if (raining) {
            for (const s of streaks) {
                const p = room.window.panes[s.pane];
                s.y += s.speed * dt;
                s.x += s.drift * dt;
                if (s.y > p.y + p.h + s.len) Object.assign(s, makeStreak(room, s.pane, false));
            }
            for (const d of drops) {
                const p = room.window.panes[d.pane];
                if (!d.sliding) {
                    d.r += dt * rand(0.05, 0.25);
                    if (d.r > 3.3 && Math.random() < dt * 0.35) d.sliding = true;
                } else {
                    d.vy = Math.min(d.vy + 140 * dt, rand(50, 95));
                    d.wobble += dt * 7;
                    d.y += d.vy * dt;
                    d.x += Math.sin(d.wobble) * 4 * dt;
                    d.r = Math.max(1.4, d.r - dt * 0.35);
                    d.trail.push({ x: d.x, y: d.y, age: 0 });
                    if (d.trail.length > 26) d.trail.shift();
                    if (d.y > p.y + p.h + 4) Object.assign(d, makeDrop(room, d.pane));
                }
                for (const t of d.trail) t.age += dt;
                d.trail = d.trail.filter((t) => t.age < TRAIL_FADE_S);
            }
            streakG.clear();
            for (const s of streaks) {
                streakG.moveTo(s.x, s.y);
                streakG.lineTo(s.x - s.drift * 0.05, s.y - s.len);
                streakG.stroke({ width: s.width, color: 0xdeecfc, alpha: s.alpha, cap: 'round' });
            }
            dropG.clear();
            for (const d of drops) {
                for (let i = 1; i < d.trail.length; i++) {
                    const a = d.trail[i - 1];
                    const b = d.trail[i];
                    const fade = Math.max(0, 1 - b.age / TRAIL_FADE_S);
                    if (fade <= 0) continue;
                    dropG.moveTo(a.x, a.y);
                    dropG.lineTo(b.x, b.y);
                    dropG.stroke({ width: d.r * 0.8, color: 0xd7e8fa, alpha: 0.16 * fade, cap: 'round' });
                }
                dropG.circle(d.x, d.y, d.r).fill({ color: 0xe8f2fc, alpha: 0.5 });
                dropG.circle(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.35).fill({ color: 0xffffff, alpha: 0.65 });
            }
        }

        // characters: breathe, sway, blink
        for (const c of chars) {
            c.breathe.scale.y = 1 + 0.016 * Math.sin((elapsed / 3.6 + c.phase) * Math.PI * 2);
            c.breathe.scale.x = 1 - 0.003 * Math.sin((elapsed / 3.6 + c.phase) * Math.PI * 2);
            c.sway.rotation = 0.009 * Math.sin((elapsed / 7.4 + c.phase * 0.9) * Math.PI * 2);
            if (c.blinkUntil > 0 && now >= c.blinkUntil) {
                c.sprite.texture = c.open;
                c.blinkUntil = 0;
                if (c.doubleBlink) {
                    c.doubleBlink = false;
                    c.nextBlinkAt = now + 180;
                } else {
                    c.nextBlinkAt = now + rand(2400, 6500);
                }
            } else if (now >= c.nextBlinkAt && c.blinkUntil === 0) {
                c.sprite.texture = c.closed;
                c.blinkUntil = now + 140;
                if (Math.random() < 0.15) c.doubleBlink = true;
                c.nextBlinkAt = Infinity;
            }
        }

        // clock (redraw is cheap; sweep second hand)
        hands.clear();
        handShadow.clear();
        drawHands(handShadow, true);
        drawHands(hands, false);

        // cloud-cover light breathing
        if (currentLight) {
            const breath = currentLight.getChildByLabel?.('breath') as Sprite | null;
            if (breath) {
                const rec = RECIPES[mood][weather];
                breath.alpha = rec.breathAlpha * (0.5 + 0.5 * Math.sin((elapsed / 11) * Math.PI * 2));
            }
        }

        // hovered hotspot blooms breathe gently
        for (const h of hots) {
            if (h.hovered) h.glow.alpha = 0.5 + 0.1 * Math.sin(elapsed * 2.2);
        }

        // sparkle affordance: rare twinkles while idle, a shimmer on hover
        for (const h of hots) {
            if (elapsed >= h.nextSparkleAt) {
                const idleBudget = sparks.length < MAX_SPARKS;
                if (h.hovered || idleBudget) spawnSpark(h, elapsed);
                const [lo, hi] = h.hovered ? HOVER_GAP : IDLE_GAP;
                h.nextSparkleAt = elapsed + rand(lo, hi);
            }
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
            const sp = sparks[i];
            const t = (elapsed - sp.born) / sp.life;
            if (t >= 1) {
                sp.sprite.parent?.removeChild(sp.sprite);
                sp.sprite.destroy();
                sparks.splice(i, 1);
                continue;
            }
            // spec scale curve 0.35→1.0→0.25: bloom in, peak, melt away
            const a = Math.sin(Math.PI * t);
            sp.sprite.alpha = a;
            const sc = (0.3 + 0.7 * a) * (sp.size / sparkTex.width);
            sp.sprite.scale.set(sc);
            sp.sprite.rotation = sp.spin * t;
            sp.sprite.y -= sp.drift * dt; // gentle upward shimmer
        }
    };

    let rainFadeTarget = -1;
    const startRainAlpha = (raining: boolean) => {
        const target = raining ? 1 : 0;
        if (rainFadeTarget !== target) {
            rainFadeTarget = target;
            startFade(rainC, target, 900);
        }
    };

    app.ticker.maxFPS = 30;
    app.ticker.add(tick);

    /* ---------- power discipline ---------- */
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
    const resize = () => {
        const w = app.renderer.width / app.renderer.resolution;
        const h = app.renderer.height / app.renderer.resolution;
        const s = Math.max(w / baseW, h / baseH) * EDGE_CROP; // cover + crop
        root.scale.set(s);
        root.position.set((w - baseW * s) / 2, (h - baseH * s) / 2);
    };
    resize();

    applyRecipe(false);

    return {
        setMood(next, animate) {
            if (next === mood) return;
            mood = next;
            applyRecipe(animate && !reduced);
        },
        setWeather(next, animate) {
            if (next === weather) return;
            weather = next;
            applyRecipe(animate && !reduced);
        },
        getSeatScreenPos(seatId) {
            const seat = room.seats.find((s) => s.id === seatId);
            if (!seat) return null;
            // ~22px of air above the hand-tuned visual head top (codex audit
            // H1: the tag must read as "her status", not a wall toast);
            // toGlobal already yields logical (CSS px) stage coordinates
            return root.toGlobal({
                x: seat.foot.x,
                y: seat.foot.y - seat.height * seat.headRatio - 22
            });
        },
        resize,
        destroy() {
            document.removeEventListener('visibilitychange', onVisibility);
            app.ticker.remove(tick);
        }
    };
}
