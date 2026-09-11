// QA-only crops and pixel sampling; the approved reference is never modified.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const sharp = require(path.join(process.env.DIARY_NODE_MODULES, 'sharp'));
const root = 'ai/design_system/cinnaglass/journal-room-object';
const dir = `${root}/book-verification`;
const sources = { reference: `${root}/room-journal-concept.png`, actual: `${dir}/design-content-night.png` };
const luma = ([r, g, b]) => r * 0.2126 + g * 0.7152 + b * 0.0722;
const patches = [
    ['left-paper', [500, 550, 120, 40], [440, 575, 120, 40]],
    ['right-paper', [920, 525, 120, 35], [880, 550, 120, 35]],
    ['cover', [1220, 310, 18, 80], [1165, 340, 18, 80]]
];
const samples = [];
for (const [name, ...rects] of patches) {
    const pair = { name };
    for (const [i, source] of ['reference', 'actual'].entries()) {
        const [left, top, width, height] = rects[i];
        const pixels = await sharp(sources[source]).extract({ left, top, width, height }).png().toBuffer();
        const stats = await sharp(pixels).stats();
        const rgb = stats.channels.slice(0, 3).map((c) => +c.mean.toFixed(2));
        pair[source] = { rect: rects[i], rgb, luma: +luma(rgb).toFixed(2) };
    }
    pair.lumaDifference = +(pair.actual.luma - pair.reference.luma).toFixed(2);
    samples.push(pair);
}
assert.ok(Math.abs(samples[0].lumaDifference) < 12, 'Representative quiet paper patch is too bright/dark');
const panels = [
    await sharp(sources.reference)
        .extract({ left: 292, top: 78, width: 998, height: 612 })
        .resize(780, 520, { fit: 'contain', background: '#302b24' })
        .toBuffer(),
    await sharp(`${dir}/book-night.png`).resize(780, 520, { fit: 'contain', background: '#302b24' }).toBuffer()
];
await sharp({ create: { width: 1560, height: 520, channels: 3, background: '#302b24' } })
    .composite(panels.map((input, i) => ({ input, left: i * 780, top: 0 })))
    .png()
    .toFile(`${dir}/book-comparison.png`);
const sheets = [];
for (const background of ['#181e24', '#ece4d6']) {
    sheets.push(
        await sharp('public/ui/journal/book-open.webp').resize(600, 400).flatten({ background }).png().toBuffer()
    );
}
await sharp({ create: { width: 1200, height: 400, channels: 3, background: '#181e24' } })
    .composite(sheets.map((input, i) => ({ input, left: i * 600, top: 0 })))
    .png()
    .toFile(`${dir}/alpha-review.png`);
await writeFile(
    `${dir}/pixel-samples.json`,
    JSON.stringify(
        {
            method: 'Rec.709 luma from decoded screenshot patches; representative material only, not a full-image similarity score',
            samples
        },
        null,
        2
    )
);
console.log(JSON.stringify(samples, null, 2));
