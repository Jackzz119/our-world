// storage.ts — Supabase Storage access for room memory photos.
// Originals + client-made webp thumbnails live in the private 'memories'
// bucket, path-scoped by room id:
//   <roomId>/<uuid>.<ext>        original (archival quality)
//   <roomId>/<uuid>.thumb.webp   thumbnail (from the image-slot preview)
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

// Upload the original image (+ optional webp thumbnail) for a room. Returns the
// original's storage path to persist in posts.images.
export const uploadMemoryImage = async (roomId: string, file: File, thumbDataUrl?: string): Promise<{ originalPath: string }> => {
    const ext = EXT_BY_TYPE[file.type] ?? 'bin';
    const base = `${roomId}/${newId()}`;
    const originalPath = `${base}.${ext}`;

    const { error: origErr } = await supabase.storage.from(BUCKET).upload(originalPath, file, { contentType: file.type, upsert: false });
    if (origErr) throw origErr;

    if (thumbDataUrl) {
        const thumb = dataUrlToBlob(thumbDataUrl);
        const { error: thumbErr } = await supabase.storage
            .from(BUCKET)
            .upload(thumbPathOf(originalPath), thumb, { contentType: 'image/webp', upsert: false });
        if (thumbErr) throw thumbErr;
    }

    return { originalPath };
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