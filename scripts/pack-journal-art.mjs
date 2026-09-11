// Package the generated art for the game. Keep the original files in arts/.
// The first book has a painted checkerboard instead of alpha; remove only the
// neutral backdrop connected to the canvas boundary, retaining the warm book.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require(process.env.DIARY_NODE_MODULES ? path.join(process.env.DIARY_NODE_MODULES, 'sharp') : 'sharp');
const source = 'arts/ui/journal/book-checker-source.png';
const dir = 'public/ui/journal';
await mkdir(dir, { recursive: true });
const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const outside = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0;
let tail = 0;
const visit = (p) => {
    if (outside[p]) return;
    const i = p * 3;
    // Warm brown/cream is the book; white/gray checks are the backdrop.
    if (Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 20) return;
    outside[p] = 1;
    queue[tail++] = p;
};
for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
}
for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
}
while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = Math.floor(p / width);
    if (x) visit(p - 1);
    if (x + 1 < width) visit(p + 1);
    if (y) visit(p - width);
    if (y + 1 < height) visit(p + width);
}
const rgba = Buffer.alloc(width * height * 4);
for (let p = 0; p < outside.length; p++) {
    for (let c = 0; c < 3; c++) rgba[p * 4 + c] = data[p * 3 + c];
    rgba[p * 4 + 3] = outside[p] ? 0 : 255;
}
const image = sharp(rgba, { raw: { width, height, channels: 4 } });
await image.clone().png().toFile('arts/ui/journal/book-alpha.png');
const book = await image.clone().webp({ quality: 96, alphaQuality: 100 }).toFile(`${dir}/book-open.webp`);
const single = await image
    .clone()
    .extract({ left: 735, top: 0, width: 789, height: 1024 })
    .webp({ quality: 96, alphaQuality: 100 })
    .toFile(`${dir}/book-single.webp`);
const corner = await sharp(source)
    .extract({ left: 1080, top: 115, width: 256, height: 256 })
    .webp({ quality: 93 })
    .toFile(`${dir}/paper-corner.webp`);
const quill = await sharp('arts/ui/journal/quill-source.png')
    .resize({ height: 680 })
    .webp({ quality: 94, alphaQuality: 100 })
    .toFile(`${dir}/quill.webp`);
const reference = 'ai/design_system/cinnaglass/journal-room-object/room-journal-concept.png';
for (const [tone, left, top] of [
    ['blue', 401, 204],
    ['pink', 393, 372]
]) {
    const portrait = await sharp(reference).extract({ left, top, width: 84, height: 84 }).toBuffer();
    await sharp(portrait)
        .composite([
            {
                input: Buffer.from('<svg width="84" height="84"><circle cx="42" cy="42" r="41" fill="white"/></svg>'),
                blend: 'dest-in'
            }
        ])
        .webp({ quality: 96, alphaQuality: 100 })
        .toFile(`${dir}/avatar-${tone}.webp`);
}
const report = {
    source,
    sourceSize: [width, height],
    backgroundPixelsRemoved: tail,
    retainedRgb: 'unchanged before WebP encoding',
    book,
    single,
    corner,
    quill
};
await writeFile('arts/ui/journal/pack-results.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
