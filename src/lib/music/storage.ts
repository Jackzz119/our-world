// storage.ts — Supabase Storage access for the music library: the private 'music' bucket.
// Areas and the policy behind each: supabase/migrations/20261001100000_music_library.sql.
// Feature doc: ai/features/music/music.md. M0 only uses the caller's scratch area (tmp/<user>/);
// reserved uploads into orig/ come with M2.
import { supabase, currentUserId } from '@/lib/supabase';

export const MUSIC_BUCKET = 'music';
// Long enough for a long listen with pauses; the player re-signs when a URL expires.
export const AUDIO_URL_TTL = 6 * 60 * 60;

// Browsers report no MIME type for .ape/.dsf/.cue/.lrc, so the type comes from the extension and is
// sent with the upload (the bucket keeps no MIME whitelist).
const MIME_BY_EXT: Record<string, string> = {
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    alac: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aif: 'audio/aiff',
    aiff: 'audio/aiff',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    opus: 'audio/ogg',
    webm: 'audio/webm',
    wv: 'audio/x-wavpack',
    ape: 'audio/x-ape',
    dsf: 'audio/x-dsf',
    dff: 'audio/x-dff',
    cue: 'text/plain',
    lrc: 'text/plain',
    ttml: 'application/ttml+xml',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
};

export type ScratchFile = { path: string; name: string; size: number; mime: string };

// The MIME type we declare for a file name; unknown extensions upload as plain bytes.
export const musicMimeOf = (fileName: string): string =>
    MIME_BY_EXT[fileName.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

// FNV-1a over the UTF-8 bytes: a short, stable tag for names that lose characters below.
const nameTag = (text: string): string => {
    let hash = 0x811c9dc5;
    for (const byte of new TextEncoder().encode(text)) {
        hash ^= byte;
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
};

// Storage keys accept only a safe ASCII set, so 雨天的窗边.flac cannot be stored under its own name.
// ASCII names pass through; anything else keeps its ASCII part plus a tag of the original name.
export const storageSafeName = (fileName: string): string => {
    const dot = fileName.lastIndexOf('.');
    const base = dot > 0 ? fileName.slice(0, dot) : fileName;
    const ext =
        dot > 0
            ? fileName
                  .slice(dot + 1)
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '')
            : '';
    const ascii = base
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60);
    const safe = ascii === base ? ascii : `${ascii || 'file'}-${nameTag(base)}`;
    return ext ? `${safe}.${ext}` : safe;
};

// The caller's scratch folder in a world: readable, writable and deletable only by them.
const scratchFolder = async (worldId: string, area: string): Promise<string> => {
    const userId = await currentUserId('未登录，无法使用音乐存储。');
    return `${worldId}/tmp/${userId}/${area}`;
};

// List the scratch files of one area (sub-folders and placeholders are skipped).
export const listScratch = async (worldId: string, area = 'm0'): Promise<ScratchFile[]> => {
    const folder = await scratchFolder(worldId, area);
    const { data, error } = await supabase.storage
        .from(MUSIC_BUCKET)
        .list(folder, { limit: 200, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    return (data ?? [])
        .filter((item) => item.id)
        .map((item) => ({
            path: `${folder}/${item.name}`,
            name: item.name,
            size: Number(item.metadata?.size ?? 0),
            mime: String(item.metadata?.mimetype ?? musicMimeOf(item.name))
        }));
};

// Upload into the scratch area, replacing an earlier copy of the same name (tmp/ is the only area
// the app may delete from; nothing is ever overwritten in place).
export const uploadScratch = async (worldId: string, file: File, area = 'm0'): Promise<ScratchFile> => {
    const folder = await scratchFolder(worldId, area);
    const name = storageSafeName(file.name);
    const path = `${folder}/${name}`;
    const mime = musicMimeOf(file.name);
    const bucket = supabase.storage.from(MUSIC_BUCKET);
    await bucket.remove([path]);
    const { error } = await bucket.upload(path, file, { contentType: mime, upsert: false, cacheControl: '3600' });
    if (error) throw error;
    return { path, name, size: file.size, mime };
};

// Delete scratch files; storage refuses anything outside the caller's own tmp/ folder.
export const removeScratch = async (paths: string[]): Promise<void> => {
    if (!paths.length) return;
    const { error } = await supabase.storage.from(MUSIC_BUCKET).remove(paths);
    if (error) throw error;
};

// Batch-sign private music paths for playback. Returns path -> signed URL; paths that fail to sign
// are omitted.
export const signAudioUrls = async (paths: string[], ttl = AUDIO_URL_TTL): Promise<Record<string, string>> => {
    const unique = [...new Set(paths.filter(Boolean))];
    if (!unique.length) return {};
    const { data, error } = await supabase.storage.from(MUSIC_BUCKET).createSignedUrls(unique, ttl);
    if (error) throw error;
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
        if (row.signedUrl && row.path) map[row.path] = row.signedUrl;
    }
    return map;
};
