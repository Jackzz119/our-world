// Frame probe for panel motion: when the compositor actually put frames on screen after a UI action
// (viz's Graphics.Pipeline.DrawAndSwap in a Chrome trace), per variant, averaged over runs. Unlike
// requestAnimationFrame gaps this sees what reaches the screen: compositor animations keep drawing
// while the main thread is busy, and a GPU stall shows up as a gap. Inspection only.
// usage: node scripts/probe-frames.mjs <config.json>     (VERBOSE=1 prints each first run's gaps)
// config: { url, w, h, dpr, action: js, ms?, window?, reps?, warm?, args?: [chrome flags],
//           variants: [{ label, base?: server url, url?, css?, js?: setup, action? }] }
// Compare two builds by pointing variants at two servers (e.g. a checkout of the old commit on 5174).
import { dependency, baseUrl } from './lib/deps.mjs';
import { readFile } from 'node:fs/promises';

const { chromium } = dependency('playwright');
const cfg = JSON.parse(await readFile(process.argv[2], 'utf8'));
const VSYNC = 1000 / 60;

for (const v of cfg.variants) {
    const rows = [];
    for (let rep = 0; rep < (cfg.reps ?? 3); rep++) {
        const browser = await chromium.launch({ channel: 'chrome', headless: true, args: v.args ?? cfg.args ?? [] });
        const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, deviceScaleFactor: cfg.dpr });
        const page = await ctx.newPage();
        await page.goto((v.base ?? baseUrl()) + (v.url ?? cfg.url), { waitUntil: 'load' });
        await page.waitForTimeout(cfg.warm ?? 3500);
        if (v.css) await page.addStyleTag({ content: v.css });
        if (v.js) await page.evaluate(v.js);
        await page.waitForTimeout(600);
        await browser.startTracing(page, { categories: ['viz', 'benchmark', 'devtools.timeline'] });
        await page.waitForTimeout(150);
        await page.evaluate((action) => {
            console.timeStamp('PROBE_ACTION');
            (0, eval)(action);
        }, v.action ?? cfg.action);
        await page.waitForTimeout(cfg.ms ?? 1200);
        const events = JSON.parse((await browser.stopTracing()).toString()).traceEvents;
        await browser.close();
        const mark = events.find((e) => e.name === 'TimeStamp' && e.args?.data?.message === 'PROBE_ACTION');
        if (!mark) throw new Error('the action left no mark in the trace');
        const t0 = mark.ts / 1000;
        const draws = [
            ...new Set(
                events
                    .filter((e) => e.name === 'Graphics.Pipeline.DrawAndSwap' && ['b', 'B', 'X'].includes(e.ph))
                    .map((e) => e.ts / 1000)
            )
        ]
            .filter((t) => t >= t0 && t - t0 <= (cfg.window ?? 900))
            .sort((a, b) => a - b);
        // the first gap counts from the action itself
        const gaps = draws.map((t, i) => t - (i ? draws[i - 1] : t0));
        if (process.env.VERBOSE && rep === 0) console.log('   gaps', gaps.map((g) => g.toFixed(0)).join(' '));
        rows.push({
            first: gaps[0] ?? NaN,
            maxGap: Math.max(0, ...gaps),
            dropped: gaps.reduce((s, g) => s + Math.max(0, Math.round(g / VSYNC) - 1), 0),
            frames: gaps.length
        });
    }
    const avg = (k) => (rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(1);
    const worst = Math.max(...rows.map((r) => r.maxGap)).toFixed(0);
    console.log(
        `${v.label.padEnd(40)} first ${avg('first').padStart(5)}ms  longest gap ${avg('maxGap').padStart(6)}ms (worst ${worst})  frames ${avg('frames').padStart(5)}  missed 60Hz frames ${avg('dropped')}`
    );
}
