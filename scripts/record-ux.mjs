// Screen recordings of the production components in the fixtures, for the UX docs (ai/design_system/
// uiux/cinnaglass/ux/ux.md). Frames are the compositor's own (CDP screencast); while recording, the
// page's clocks and timers and its animations all run `slow` times slower, so the capture keeps up
// even where the GPU is busy, and the video is put back to real time: it shows the designed motion,
// not how smooth a device is (scripts/probe-frames.mjs measures that). Frames are resampled to a
// steady 25 fps and encoded to H.264 MP4 by Chrome's MediaRecorder; the poster is the frame at
// `poster` ms.
// usage: node scripts/record-ux.mjs [name filter] [--out <dir>] [--frames]
//   scenarios: scripts/record-ux.json; output: ai/design_system/uiux/cinnaglass/ux/live (or --out);
//   --frames also writes every distinct frame, named by its time, for inspection.
// scenario: { name, url, w, h, phone?, slow?, boot?, lead?, tail?, poster?, kbps?, fromLoad?, assetGap?,
//   steps: [{ tap? | click?: selector, nth?, type?: text, delay?, key?, eval?: js,
//   drag?: { from: [x, y], to: [x, y], ms }, wait? }] }
//   fromLoad: the clip starts with the page loading (the entry loader), from its first frame on the dark
//   loader; assetGap: pictures arrive one at a time, this many ms apart, so a load shows its progress.
import { dependency, baseUrl } from './lib/deps.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const { chromium } = dependency('playwright');
const args = process.argv.slice(2);
const flag = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args.splice(i, 2)[1];
};
const out = flag('--out') ?? 'ai/design_system/uiux/cinnaglass/ux/live';
const dumpFrames = args.includes('--frames');
const filter = args.find((a) => !a.startsWith('--'));
const scenarios = JSON.parse(await readFile(new URL('./record-ux.json', import.meta.url), 'utf8')).filter(
    (s) => !filter || s.name.includes(filter)
);
await mkdir(out, { recursive: true });
const FPS = 25;
const STEP = 1000 / FPS;
const browser = await chromium.launch({ channel: 'chrome', headless: true });

// Installed before the page's scripts; __setTimeScale(k) makes performance.now, Date.now, rAF times,
// setTimeout and setInterval run k times slower from that moment on.
function timeShim() {
    const realNow = performance.now.bind(performance);
    const realSetTimeout = window.setTimeout.bind(window);
    const realSetInterval = window.setInterval.bind(window);
    const realRaf = window.requestAnimationFrame.bind(window);
    const dateOffset = Date.now() - realNow();
    let scale = 1;
    let base = 0;
    let virtualBase = 0;
    const now = () => virtualBase + (realNow() - base) / scale;
    window.__setTimeScale = (k) => {
        virtualBase = now();
        base = realNow();
        scale = k;
    };
    performance.now = now;
    Date.now = () => Math.round(dateOffset + now());
    window.setTimeout = (fn, ms = 0, ...rest) => realSetTimeout(fn, ms * scale, ...rest);
    window.setInterval = (fn, ms = 0, ...rest) => realSetInterval(fn, ms * scale, ...rest);
    window.requestAnimationFrame = (cb) => realRaf(() => cb(now()));
}

// One-shot entrances finish before recording starts; loops never do and are skipped.
async function settle(page) {
    await page.evaluate(() =>
        Promise.race([
            Promise.all(
                document
                    .getAnimations()
                    .filter((a) => a.effect?.getTiming().iterations !== Infinity)
                    .map((a) => a.finished.catch(() => {}))
            ),
            new Promise((r) => setTimeout(r, 3000))
        ])
    );
}

// A finger drag through CDP touch events (Playwright's touchscreen only taps).
async function drag(cdp, { from, to, ms }) {
    const steps = Math.max(6, Math.round(ms / 16));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
    for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: from[0] + (to[0] - from[0]) * k, y: from[1] + (to[1] - from[1]) * k }]
        });
        await new Promise((r) => setTimeout(r, ms / steps));
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

// Runs in a blank page: draws each tick's frame on a canvas a MediaRecorder watches, in real time.
async function encode({ images, seq, w, h, fps, kbps }) {
    const blobs = await Promise.all(images.map((d) => fetch(`data:image/jpeg;base64,${d}`).then((r) => r.blob())));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    const track = canvas.captureStream(0).getVideoTracks()[0];
    const recorder = new MediaRecorder(new MediaStream([track]), {
        mimeType: 'video/mp4;codecs=avc1.4D401F',
        videoBitsPerSecond: kbps * 1000
    });
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => (recorder.onstop = r));
    let bitmap = await createImageBitmap(blobs[seq[0]]);
    let shown = seq[0];
    g.drawImage(bitmap, 0, 0, w, h);
    recorder.start();
    const start = performance.now();
    for (let i = 0; i < seq.length; i++) {
        if (seq[i] !== shown) {
            bitmap.close();
            bitmap = await createImageBitmap(blobs[seq[i]]);
            g.drawImage(bitmap, 0, 0, w, h);
            shown = seq[i];
        }
        track.requestFrame();
        const next = start + ((i + 1) * 1000) / fps;
        await new Promise((r) => setTimeout(r, Math.max(0, next - performance.now())));
    }
    recorder.stop();
    await stopped;
    const bytes = new Uint8Array(await new Blob(chunks, { type: 'video/mp4' }).arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
}

for (const s of scenarios) {
    const slow = s.slow ?? 1;
    const ctx = await browser.newContext({
        viewport: { width: s.w, height: s.h },
        deviceScaleFactor: 1,
        // a phone is a touch screen: no hover states left behind by a mouse
        hasTouch: !!s.phone,
        isMobile: !!s.phone,
        reducedMotion: 'no-preference'
    });
    if (slow !== 1) await ctx.addInitScript(timeShim);
    // a clip that films the load runs slow from the page's first script on
    if (slow !== 1 && s.fromLoad) await ctx.addInitScript((k) => window.__setTimeScale(k), slow);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    if (s.assetGap) {
        let gate = Promise.resolve();
        await page.route(/\.(png|webp|jpe?g|avif)(\?|$)/, (route) => {
            gate = gate.then(() => new Promise((r) => setTimeout(r, s.assetGap * slow)));
            return gate.then(() => route.continue());
        });
    }
    if (!s.fromLoad) {
        await page.goto(baseUrl() + s.url, { waitUntil: 'load' });
        await page.waitForTimeout(s.boot ?? 2500);
        await settle(page);
    }
    const cdp = await ctx.newCDPSession(page);
    const frames = [];
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
        frames.push({ t: metadata.timestamp * 1000, data });
        cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    if (slow !== 1) {
        await cdp.send('Animation.enable');
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / slow });
        if (!s.fromLoad) await page.evaluate((k) => window.__setTimeScale(k), slow);
    }
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
    if (s.fromLoad) {
        await page.goto(baseUrl() + s.url, { waitUntil: 'commit' });
        await page.locator('.world-loader').waitFor();
    }
    const t0 = Date.now();
    await page.waitForTimeout((s.lead ?? 700) * slow);
    for (const step of s.steps) {
        const target = step.tap ?? step.click;
        if (target) {
            const loc = page.locator(target).nth(step.nth ?? 0);
            if (step.tap) await loc.tap();
            else await loc.click();
        }
        if (step.drag) await drag(cdp, { ...step.drag, ms: (step.drag.ms ?? 400) * slow });
        if (step.type) await page.keyboard.type(step.type, { delay: (step.delay ?? 70) * slow });
        if (step.eval) await page.evaluate(step.eval);
        if (step.key) await page.keyboard.press(step.key);
        await page.waitForTimeout((step.wait ?? 900) * slow);
    }
    await page.waitForTimeout((s.tail ?? 700) * slow);
    const t1 = Date.now();
    await cdp.send('Page.stopScreencast');
    await ctx.close();
    if (!frames.length) throw new Error(`${s.name}: no frames captured`);
    frames.sort((a, b) => a.t - b.t);
    // a steady 25 fps in video time: each tick shows the newest frame drawn by then
    const order = [];
    let j = 0;
    for (let tick = t0; tick <= t1; tick += STEP * slow) {
        while (j + 1 < frames.length && frames[j + 1].t <= tick) j++;
        order.push(j);
    }
    const used = [...new Set(order)];
    const slot = new Map(used.map((idx, k) => [idx, k]));
    if (dumpFrames) {
        const dir = path.join(out, `${s.name}-frames`);
        await mkdir(dir, { recursive: true });
        for (const idx of used) {
            const ms = String(Math.round((frames[idx].t - t0) / slow)).padStart(6, '0');
            await writeFile(path.join(dir, `${ms}.jpg`), Buffer.from(frames[idx].data, 'base64'));
        }
    }
    const posterAt = Math.min(order.length - 1, Math.max(0, Math.round((s.poster ?? 0) / STEP)));
    await writeFile(path.join(out, `${s.name}.jpg`), Buffer.from(frames[order[posterAt]].data, 'base64'));
    const encoder = await browser.newPage({ viewport: { width: 200, height: 200 } });
    const mp4 = Buffer.from(
        await encoder.evaluate(encode, {
            images: used.map((idx) => frames[idx].data),
            seq: order.map((idx) => slot.get(idx)),
            w: s.w,
            h: s.h,
            fps: FPS,
            kbps: s.kbps ?? (s.w > 800 ? 3000 : 1500)
        }),
        'base64'
    );
    await encoder.close();
    await writeFile(path.join(out, `${s.name}.mp4`), mp4);
    const seconds = (order.length / FPS).toFixed(1);
    const report = `${s.name}: ${seconds}s, ${used.length} distinct frames, ${(mp4.length / 1024).toFixed(0)} KB`;
    console.log(errors.length ? `${report}  ERRORS ${errors.join(' | ')}` : report);
}
await browser.close();
