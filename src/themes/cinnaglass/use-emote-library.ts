// use-emote-library.ts — the world's shared sticker library as one hook: the emote rows, their
// signed display urls and the four actions the picker can trigger (web search, url import, file
// upload, removal). Signed urls expire, so it also owns the re-signing timer; it publishes its
// reload function through `reloadRef` so a world_emotes broadcast can refetch without this hook
// having to know about the event stream. Feature doc: ai/features/chat.md §三「lib/emotes.ts」.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addEmoteFromFile, importEmoteFromUrl, listEmotes, removeEmote, searchWebEmotes } from '@/lib/emotes.ts';
import { signImageUrls } from '@/lib/storage.ts';
import { Logman } from '@/lib/logman.ts';
import { errMsg } from './chat-store';
import type { EmoteView } from './chat-store';
import type { EmoteRow } from '@/types/chat.ts';

const TAG = '[chat][web][use-emote-library]';

/* eslint-disable react-hooks/set-state-in-effect -- the load effect below is a verbatim move of the
   world effect in chat-data.ts. Emptying the library when the world goes away is a state reset, and
   replacing it with derived state would make stale stickers flash on re-entry — a behaviour change
   this structural refactor deliberately does not make. The rule only became visible because the
   605-line hook it used to live in was too large for the compiler-backed lint to analyse. */

// The library for one world. `reloadRef` is owned by the caller: this hook fills it while the world
// is mounted and clears it on unmount, exactly like the account stream does with its own reload.
export function useEmoteLibrary(worldId: string | null, reloadRef: React.RefObject<(() => void) | null>) {
    // the world's shared sticker library + signed display urls (path → url)
    const [emotes, setEmotes] = useState<EmoteRow[]>([]);
    const [emoteUrls, setEmoteUrls] = useState<Record<string, string>>({});

    // Sticker lookup for the row → Msg projection in the facade.
    const emotesById = useMemo(() => {
        const m = new Map<string, EmoteRow>();
        for (const e of emotes) m.set(e.id, e);
        return m;
    }, [emotes]);

    // ready-to-render sticker library for the picker
    const emoteViews = useMemo(
        () => emotes.map((e): EmoteView => ({ ...e, url: emoteUrls[e.storage_path] ?? null })),
        [emotes, emoteUrls]
    );

    useEffect(() => {
        if (!worldId) {
            setEmotes([]);
            setEmoteUrls({});
            return;
        }
        let cancelled = false;

        const loadEmotes = async () => {
            const rows = await listEmotes();
            if (cancelled) return;
            setEmotes(rows);
            const urls = await signImageUrls(rows.map((r) => r.storage_path));
            if (!cancelled) setEmoteUrls(urls);
        };
        reloadRef.current = () => {
            loadEmotes().catch((e: unknown) => {
                if (!cancelled) Logman.warn(TAG, `表情库刷新失败：${errMsg(e)}`);
            });
        };
        reloadRef.current();
        // signed urls expire after an hour — re-sign well before that so stickers survive long
        // idle sessions (same bug class as ST-O in ai/features/timeline.md:201)
        const resign = setInterval(() => reloadRef.current?.(), 40 * 60 * 1000);
        return () => {
            cancelled = true;
            reloadRef.current = null;
            clearInterval(resign);
        };
    }, [worldId, reloadRef]);

    // emote library actions — the library refreshes via the world_emotes
    // broadcast echo on both ends; errors bubble to the picker's inline msg
    const searchWeb = useCallback((q: string) => searchWebEmotes(q), []);
    const importEmoteUrl = useCallback(
        async (url: string, name: string) => {
            if (!worldId) throw new Error('先进入世界再收集贴纸');
            await importEmoteFromUrl(worldId, url, name);
        },
        [worldId]
    );
    const addEmoteFile = useCallback(
        async (file: File, name: string) => {
            if (!worldId) throw new Error('先进入世界再收集贴纸');
            await addEmoteFromFile(worldId, name, file);
        },
        [worldId]
    );
    const removeEmoteById = useCallback((id: string) => {
        removeEmote(id).catch((e: unknown) => Logman.error(TAG, `移出表情失败：${errMsg(e)}`));
    }, []);

    return { emotesById, emoteUrls, emoteViews, searchWeb, importEmoteUrl, addEmoteFile, removeEmoteById };
}
