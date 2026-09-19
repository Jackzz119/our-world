// Material-map packaging, not a painted UI: retain deviations from neutral
// as transparent light/dark grain. A solid gray map would veil the real room.
import { dependency } from './lib/deps.mjs';
const sharp = dependency('sharp');
const { data, info } = await sharp('arts/ui/navigation/frost-source.png')
    .resize(512, 512)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < data.length; i++) {
    const delta = data[i] - mean;
    const tone = delta >= 0 ? 255 : 0;
    rgba[i * 4] = tone;
    rgba[i * 4 + 1] = tone;
    rgba[i * 4 + 2] = tone;
    rgba[i * 4 + 3] = Math.min(140, Math.round(Math.abs(delta) * 5));
}
const output = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile('public/ui/nav/frost.webp');
console.log(JSON.stringify({ mean, ...output }));
