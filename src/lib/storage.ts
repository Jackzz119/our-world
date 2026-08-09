// storage.ts — Supabase Storage access for world memory photos.
// Originals + client-made webp thumbnails live in the private 'memories'
// bucket, path-scoped by world id:
//   <worldId>/<uuid>.<ext>        original (archival quality)
//   <worldId>/<uuid>.thumb.webp   thumbnail (from the image-slot preview)
// posts.images stores the ORIGINAL path; display uses short-lived signed URLs
// because the bucket is private.
import { supabase } from '@/lib/supabase.ts';

const BUCKET = 'memories';
const SIGNED_URL_TTL = 60 * 60; // 1 hour

const EXT_BY_TYPE: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/avif': 'avif'
};

// Derive the thumbnail path from an original: foo/bar.jpg -> foo/bar.thumb.webp
export const thumbPathOf = (originalPath: string): string => originalPath.replace(/\.[^./]+$/, '.thumb.webp');

const dataUrlToBlob = (dataUrl: string): Blob => {
    const [head, body] = dataUrl.split(',');
    const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/webp';
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
};

const newId = (): string =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

// Display-quality thumbnail regenerated from the original (the composer
// slot's preview is sized to its tiny frame — too small for the photo wall).
// 1024 covers hi-dpi photo-wall columns and the lightbox's progressive
// preview; 480 was visibly soft on both.
const THUMB_MAX = 1024;
const makeThumbDataUrl = async (file: File): Promise<string> => {
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, THUMB_MAX / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h);
        return canvas.toDataURL('image/webp', 0.85);
    } finally {
        bitmap.close?.();
    }
};

// Upload the original image (+ webp thumbnail) for a world. The thumbnail is
// regenerated from the original at display size; `fallbackThumbDataUrl` (the
// slot preview) covers formats createImageBitmap can't decode. Returns the
// original's storage path to persist in posts.images.
export const uploadMemoryImage = async (
    worldId: string,
    file: File,
    fallbackThumbDataUrl?: string
): Promise<{ originalPath: string }> => {
    const ext = EXT_BY_TYPE[file.type] ?? 'bin';
    const base = `${worldId}/${newId()}`;
    const originalPath = `${base}.${ext}`;

    const { error: origErr } = await supabase.storage.from(BUCKET).upload(originalPath, file, { contentType: file.type, upsert: false });
    if (origErr) throw origErr;

    const thumbDataUrl = await makeThumbDataUrl(file).catch(() => fallbackThumbDataUrl);
    if (thumbDataUrl) {
        const thumb = dataUrlToBlob(thumbDataUrl);
        const { error: thumbErr } = await supabase.storage
            .from(BUCKET)
            .upload(thumbPathOf(originalPath), thumb, { contentType: 'image/webp', upsert: false });
        if (thumbErr) throw thumbErr;
    }

    return { originalPath };
};

// Upload a world icon: downscaled to a small square-ish webp (icons render at
// 40px, 256 covers hi-dpi) under a unique name so signed-URL caches never go
// stale. Returns the storage path to persist in worlds.icon_path; superseded
// icons are left behind (a couple of KB, not worth a cleanup pass yet).
const ICON_MAX = 256;
export const uploadWorldIcon = async (worldId: string, file: File): Promise<{ iconPath: string }> => {
    const bitmap = await createImageBitmap(file); // throws on non-image input
    let dataUrl: string;
    try {
        const scale = Math.min(1, ICON_MAX / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h);
        dataUrl = canvas.toDataURL('image/webp', 0.9);
    } finally {
        bitmap.close?.();
    }
    const iconPath = `${worldId}/icon-${newId()}.webp`;
    const { error } = await supabase.storage.from(BUCKET).upload(iconPath, dataUrlToBlob(dataUrl), { contentType: 'image/webp', upsert: false });
    if (error) throw error;
    return { iconPath };
};

// Batch-sign private storage paths for display. Returns a path -> signed URL
// map; paths that fail to sign are omitted.
export const signImageUrls = async (paths: string[]): Promise<Record<string, string>> => {
    const unique = [...new Set(paths.filter(Boolean))];
    if (!unique.length) return {};
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, SIGNED_URL_TTL);
    if (error) throw error;
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
        if (row.signedUrl && row.path) map[row.path] = row.signedUrl;
    }
    return map;
};