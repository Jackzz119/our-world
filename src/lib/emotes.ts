// emotes.ts — data access for the world emote (sticker) library
// (ai/Features/chat.md 表情系统 EMO-3). Images live in the private
// `memories` bucket under <worldId>/emotes/, so the existing world-scoped
// storage policies and signed-URL machinery apply unchanged.
import { supabase } from '@/lib/supabase.ts';
import type { EmoteRow, EmoteSearchResult } from '@/types/chat.ts';

const COLS = 'id, world_id, name, storage_path, source_url, added_by, created_at';
// stickers render at 110px; 512 covers hi-dpi with room to spare
const STICKER_MAX = 512;

// The whole shared library (RLS scopes to my world's emotes).
export const listEmotes = async (): Promise<EmoteRow[]> => {
    const { data, error } = await supabase.from('world_emotes').select(COLS).order('created_at');
    if (error) throw error;
    return (data ?? []) as EmoteRow[];
};

// Search the web for sticker candidates (Tenor, proxied by the edge function
// so the API key stays server-side). Throws with a readable message when the
// key isn't configured yet.
export const searchWebEmotes = async (q: string): Promise<EmoteSearchResult[]> => {
    const { data, error } = await supabase.functions.invoke('emotes', { body: { action: 'search', q } });
    if (error) throw new Error(await describeFnError(error));
    if (data?.error) throw new Error(String(data.error));
    return (data?.results ?? []) as EmoteSearchResult[];
};

// Import a web image into the library — the edge function downloads it
// server-side (≤2MB, image/* only) and stores + inserts under MY identity.
export const importEmoteFromUrl = async (worldId: string, url: string, name: string): Promise<EmoteRow> => {
    const { data, error } = await supabase.functions.invoke('emotes', {
        body: { action: 'import', world_id: worldId, url, name }
    });
    if (error) throw new Error(await describeFnError(error));
    if (data?.error) throw new Error(String(data.error));
    return data.emote as EmoteRow;
};

// Upload a local image as an emote (client-side downscale to webp).
export const addEmoteFromFile = async (worldId: string, name: string, file: File): Promise<EmoteRow> => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error('未登录。');
    const blob = await downscaleToWebp(file);
    const path = `${worldId}/emotes/${crypto.randomUUID()}.webp`;
    const { error: upErr } = await supabase.storage.from('memories').upload(path, blob, { contentType: 'image/webp' });
    if (upErr) throw upErr;
    const { data, error } = await supabase
        .from('world_emotes')
        .insert({ world_id: worldId, name: name.trim().slice(0, 24), storage_path: path, added_by: uid })
        .select(COLS)
        .single();
    if (error) {
        await supabase.storage.from('memories').remove([path]); // don't orphan the file
        throw error.code === '23505' ? new Error(`:${name}: 已存在，换个名字`) : error;
    }
    return data as EmoteRow;
};

// Remove an emote from the shared library (existing sticker messages keep a
// tombstone — messages.emote_id goes null via FK). The file stays in storage
// so history could be restored later; cheap enough not to matter.
export const removeEmote = async (id: string): Promise<void> => {
    const { error } = await supabase.from('world_emotes').delete().eq('id', id);
    if (error) throw error;
};

const downscaleToWebp = async (file: File): Promise<Blob> => {
    const bitmap = await createImageBitmap(file); // throws on non-image input
    try {
        const scale = Math.min(1, STICKER_MAX / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.9));
        if (!blob) throw new Error('图片处理失败');
        return blob;
    } finally {
        bitmap.close?.();
    }
};

// functions.invoke wraps non-2xx responses in an opaque error; dig out the
// JSON body so the UI can show the real reason (e.g. key 未配置 / 重名).
const describeFnError = async (error: unknown): Promise<string> => {
    const ctx = (error as { context?: Response })?.context;
    if (ctx && typeof ctx.json === 'function') {
        try {
            const body = await ctx.json();
            if (body?.error) return String(body.error);
        } catch {
            /* fall through */
        }
    }
    return error instanceof Error ? error.message : String(error);
};
