// Export deterministic frames from the SAME browser geometry used by the book.
import { dependency, baseUrl } from './lib/deps.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = dependency('playwright');
const sharp = dependency('sharp');
const dir = 'ai/design_system/uiux/cinnaglass/journal-room-object/turn-verification';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
    await page.goto(`${baseUrl()}/ai/design_system/uiux/cinnaglass/journal-room-object/turn-prototype.html`);
    await page.waitForFunction(() => !!window.turnDemo);
    await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
    for (const [kind, count] of [
        ['frame', 36],
        ['sequence', 48],
        ['back', 36]
    ]) {
        const frames = [];
        for (let i = 0; i <= count; i++) {
            const p = i / count;
            await page.evaluate(([kind, p]) => window.turnDemo[kind](p), [kind, p]);
            await page.evaluate(
                () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
            );
            const png = await page.screenshot();
            if ([0, 0.25, 0.5, 0.75, 1].some((n) => Math.abs(p - n) < 0.001))
                await writeFile(`${dir}/${kind}-${Math.round(p * 100)}.png`, png);
            const raw = await sharp(png).resize(960, 600).removeAlpha().raw().toBuffer();
            frames.push(raw);
        }
        const delays = frames.map((_, i) => (i === 0 || i === frames.length - 1 ? 650 : 40));
        await sharp(Buffer.concat(frames), {
            raw: { width: 960, height: 600 * frames.length, channels: 3, pageHeight: 600 }
        })
            .gif({ loop: 0, delay: delays, effort: 7, dither: 0.25 })
            .toFile(
                `${dir}/${kind === 'frame' ? 'turn-single' : kind === 'back' ? 'turn-back' : 'turn-continuous'}.gif`
            );
        console.log(kind, 'exported', frames.length, 'frames');
    }
    await writeFile(
        `${dir}/prototype-results.json`,
        JSON.stringify({ pages: await page.evaluate(() => window.turnDemo.pages), errors }, null, 2)
    );
    if (errors.length) throw new Error(errors.join('\n'));
} finally {
    await browser.close();
}
