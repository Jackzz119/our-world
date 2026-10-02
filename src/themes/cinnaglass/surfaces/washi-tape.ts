// washi-tape.ts — the strips of washi tape that hold journal pages and polaroids to the glass:
// four generated strips with their own torn ends (arts/ui/memory/manifest.json, ART-03). Each
// entry picks one by a stable hash; the tint paints a small block under the strip until its
// picture loads. Decoration, never identity.
import type { CSSProperties } from 'react';

export type WashiTape = { tint: string; img: string };

export const TAPES: WashiTape[] = [
    { tint: '#b9d3e6', img: '/ui/memory/tape-blue.webp' },
    { tint: '#efc3cf', img: '/ui/memory/tape-pink.webp' },
    { tint: '#efe1b4', img: '/ui/memory/tape-butter.webp' },
    { tint: '#cfe2c4', img: '/ui/memory/tape-sage.webp' }
];

/** The --tape / --tape-img custom properties for the strip a hash picks from `tapes`. */
export function tapeStyle(hash: number, tapes: WashiTape[] = TAPES): CSSProperties {
    const tape = tapes[hash % tapes.length];
    return { '--tape': tape.tint, '--tape-img': `url(${tape.img})` } as CSSProperties;
}
