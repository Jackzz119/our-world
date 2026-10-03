// artwork.ts — cover art for the library: three display sizes made on the uploader's device (256 for
// rows, 512 for the record sleeve, 1200 for the immersive lyrics backdrop), stored once per world
// under art/<sha256 of the original image>/, plus a small palette taken from the image so the
// player can tint itself before the picture loads (replaces the hand-written tints of the built-in
// soundscapes). Safari cannot encode WebP from a canvas, so it gets JPEG.
// Feature doc: ai/features/music/music.md §歌词与海报.
import { sha256Blob } from '@/lib/music/sha256';
import type { MusicArtwork } from '@/types/music';

export const ARTWORK_SIZES = [256, 512, 1200] as const;

export type ArtworkVariant = { size: number; blob: Blob; ext: 'webp' | 'jpg'; contentType: string };

export type PreparedArtwork = {
    sha256: string;
    width: number;
    height: number;
    variants: ArtworkVariant[];
    palette: NonNullable<MusicArtwork['palette']>;
};

// Encode a canvas, preferring WebP and falling back to JPEG where the browser quietly cannot.
const encode = (canvas: HTMLCanvasElement): Promise<{ blob: Blob; ext: 'webp' | 'jpg'; type: string }> =>
    new Promise((resolve, reject) => {
        canvas.toBlob(
            (webp) => {
                if (webp && webp.type === 'image/webp') return resolve({ blob: webp, ext: 'webp', type: 'image/webp' });
                canvas.toBlob(
                    (jpeg) =>
                        jpeg
                            ? resolve({ blob: jpeg, ext: 'jpg', type: 'image/jpeg' })
                            : reject(new Error('封面压缩失败。')),
                    'image/jpeg',
                    0.86
                );
            },
            'image/webp',
            0.86
        );
    });

const hex = (r: number, g: number, b: number) =>
    `#${[r, g, b]
        .map((v) =>
            Math.round(Math.min(255, Math.max(0, v)))
                .toString(16)
                .padStart(2, '0')
        )
        .join('')}`;

// A few colours from a 24×24 thumbnail: the average, the most saturated mid-tone (dominant), and a
// darker and a lighter version for gradients.
const paletteOf = (bitmap: ImageBitmap): PreparedArtwork['palette'] => {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return {};
    ctx.drawImage(bitmap, 0, 0, 24, 24);
    const data = ctx.getImageData(0, 0, 24, 24).data;
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let best = { score: -1, r: 0, g: 0, b: 0 };
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        sr += r;
        sg += g;
        sb += b;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const light = (max + min) / 510;
        const saturation = max === 0 ? 0 : (max - min) / max;
        const score = saturation * (1 - Math.abs(light - 0.5) * 1.6);
        if (score > best.score) best = { score, r, g, b };
    }
    const n = data.length / 4;
    const [ar, ag, ab] = [sr / n, sg / n, sb / n];
    return {
        muted: hex(ar, ag, ab),
        dominant: hex(best.r, best.g, best.b),
        dark: hex(ar * 0.55, ag * 0.55, ab * 0.55),
        light: hex(ar + (255 - ar) * 0.55, ag + (255 - ag) * 0.55, ab + (255 - ab) * 0.55)
    };
};

// Make the stored sizes and the palette of one cover image.
export async function prepareArtwork(image: Blob): Promise<PreparedArtwork> {
    const sha256 = await sha256Blob(image);
    const bitmap = await createImageBitmap(image).catch(() => {
        throw new Error('封面图片打不开。');
    });
    try {
        const variants: ArtworkVariant[] = [];
        const longest = Math.max(bitmap.width, bitmap.height);
        for (const size of ARTWORK_SIZES) {
            // never upscale; small covers keep their own size for every slot
            const scale = Math.min(1, size / longest);
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('封面压缩失败。');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const { blob, ext, type } = await encode(canvas);
            variants.push({ size, blob, ext, contentType: type });
        }
        return { sha256, width: bitmap.width, height: bitmap.height, variants, palette: paletteOf(bitmap) };
    } finally {
        bitmap.close?.();
    }
}

// Where a variant lives in the bucket.
export const artworkPath = (worldId: string, sha256: string, variant: Pick<ArtworkVariant, 'size' | 'ext'>) =>
    `${worldId}/art/${sha256}/${variant.size}.${variant.ext}`;

// The variant path closest to (and not smaller than, when possible) a display size in CSS pixels.
export const artworkFor = (artwork: Pick<MusicArtwork, 'variants'> | null, cssPx: number): string | null => {
    if (!artwork) return null;
    const want = cssPx * Math.min(2, window.devicePixelRatio || 1);
    const sizes = Object.keys(artwork.variants)
        .map(Number)
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
    const size = sizes.find((s) => s >= want) ?? sizes[sizes.length - 1];
    return size === undefined ? null : (artwork.variants[String(size)] ?? null);
};
