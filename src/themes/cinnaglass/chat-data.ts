// chat-data.ts — shared conversation state for the two chat surfaces:
// the in-scene ChatDock (WoW-style ambient box) and the covering
// ChannelScreen. Same threads, two experiences — see ai/Features/chat.md.
// Everything is real now: world text channels ride the world topic, DMs and
// friendships ride the account topic `user:{uid}` (DM 是账号级). The message
// pipeline (rows / reactions / read cursors / optimistic states) is shared by
// both kinds of conversation — a DM is just a channel without a world.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    MESSAGE_PAGE_SIZE,
    addReaction,
    deleteMessage,
    getChannelReads,
    getChannels,
    getDmChannels,
    getMessages,
    getReactions,
    getReadsForChannels,
    markChannelRead,
    removeReaction,
    sendMessage,
    subscribeUser,
    subscribeWorld,
    updateMessage
} from '@/lib/chat.ts';
import { acceptFriend, listFriendships, removeFriendship, sendFriendRequest } from '@/lib/friends.ts';
import { addEmoteFromFile, importEmoteFromUrl, listEmotes, removeEmote, searchWebEmotes } from '@/lib/emotes.ts';
import { sendSticker } from '@/lib/chat.ts';
import { getProfilesByIds } from '@/lib/profiles.ts';
import { signImageUrls } from '@/lib/storage.ts';
import { Logman } from '@/lib/logman.ts';
import type { EmoteView } from './emote-picker';
import type { Channel, ChatMessageRow, EmoteRow, FriendshipRow, ReactionRow, WorldEvent } from '@/types/chat.ts';
import type { FeedProfile } from '@/types/feed.ts';

const TAG = '[chat][web][chat-data]';
// how long a deleted message keeps rendering so the particle effect can play
const VANISH_MS = 900;

// virtual conversation id: the friends page inside the chat hub (Discord-
// style — the pinned entry above the DM list; not a real channel)
export const FRIENDS_VIEW = 'friends';

export type MsgReaction = { emoji: string; count: number; mine: boolean; users: string[] };

export type Msg = {
    id: string;
    from: 'me' | 'them';
    text: string;
    time: string;
    sender?: string;
    ts: string; // created_at ISO — drives ordering / cursors
    authorId: string;
    edited?: boolean;
    pending?: boolean; // optimistic, not yet confirmed by the echo
    failed?: boolean; // INSERT failed — retry / discard via hub
    vanishing?: boolean; // deleted, kept briefly for the particle effect
    reactions?: MsgReaction[];
    kind: 'text' | 'sticker';
    emoteUrl?: string | null; // sticker: signed image url (null = loading)
    emoteGone?: boolean; // sticker whose emote left the library → tombstone
};

// deterministic avatar hue per account (until real avatars land)
export const colorFor = (id: string): string => {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
    const hue = Math.abs(h) % 360;
    return `linear-gradient(135deg, hsl(${hue},72%,82%), hsl(${hue},58%,64%))`;
};

// One switchable conversation entry. convsFor is the single source for every
// conversation switcher (dock tabs + chat hub list + future unread badges):
// text channels belong to the world, DMs are account-level and persistent —
// so the set is "current world's text channels + my DMs" in-world, DMs only
// in the lobby.
export type Conv = {
    id: string; // channel uuid (world text channel OR dm channel)
    kind: 'channel' | 'dm';
    name: string;
    hint: string;
    otherId?: string; // dm: the friend's account id
    ini?: string; // dm: avatar initial
    color?: string; // dm: avatar gradient
};

export const convsFor = (inWorld: boolean, channels: Channel[], dmConvs: Conv[]): Conv[] => [
    ...(inWorld
        ? channels.filter((ch) => ch.type === 'text').map((ch): Conv => ({ id: ch.id, kind: 'channel', name: ch.name, hint: ch.topic ?? '' }))
        : []),
    ...dmConvs
];

// sidebar home-panel view models (好友区)
export type FriendEntry = { otherId: string; name: string; color: string; dmChannelId: string | null };
export type FriendRequest = { otherId: string; name: string; color: string };

const pad = (n: number) => String(n).padStart(2, '0');
// today → HH:mm, older → M/D HH:mm
const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return d.toDateString() === new Date().toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// union by id, ordered by created_at — used wherever pages and broadcast
// echoes may overlap (server rows win over optimistic locals)
const mergeRows = (a: ChatMessageRow[], b: ChatMessageRow[]): ChatMessageRow[] => {
    const byId = new Map<string, ChatMessageRow>();
    for (const r of [...a, ...b]) byId.set(r.id, r);
    return [...byId.values()].sort((x, y) => Date.parse(x.created_at) - Date.parse(y.created_at));
};

const rxKey = (r: ReactionRow) => `${r.user_id}:${r.emoji}`;
const otherOf = (c: Channel, uid: string | null) => (c.dm_user_a === uid ? c.dm_user_b! : c.dm_user_a!);

// Single source of truth for all conversations, shared by both surfaces.
// Threads are fetched per channel on load, then kept live by the broadcast
// subscriptions (sender included — writes only touch the DB, the echo
// renders them).
export function useChatThreads(worldId: string | null, uid: string | null, profiles: Record<string, FeedProfile>) {
    const [channels, setChannels] = useState<Channel[]>([]); // world channels
    const [dmChannels, setDmChannels] = useState<Channel[]>([]);
    const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
    // the world's shared sticker library + signed display urls (path → url)
    const [emotes, setEmotes] = useState<EmoteRow[]>([]);
    const [emoteUrls, setEmoteUrls] = useState<Record<string, string>>({});
    // profiles of friends (may live outside the world's member pair)
    const [friendProfiles, setFriendProfiles] = useState<Record<string, FeedProfile>>({});
    const [chanRows, setChanRows] = useState<Record<string, ChatMessageRow[]>>({});
    const [reactions, setReactions] = useState<Record<string, ReactionRow[]>>({}); // by message_id
    // read cursors: channelId → userId → last_read_at
    const [reads, setReads] = useState<Record<string, Record<string, string>>>({});
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
    const [vanishingIds, setVanishingIds] = useState<Set<string>>(new Set());
    // per-channel: true once a page came back shorter than a full page
    const [reachedStart, setReachedStart] = useState<Record<string, boolean>>({});
    const chanRowsRef = useRef(chanRows);
    chanRowsRef.current = chanRows;
    const readsRef = useRef(reads);
    readsRef.current = reads;
    const reactionsRef = useRef(reactions);
    reactionsRef.current = reactions;
    const pendingRef = useRef(pendingIds);
    pendingRef.current = pendingIds;
    const failedRef = useRef(failedIds);
    failedRef.current = failedIds;
    const uidRef = useRef(uid);
    uidRef.current = uid;
    const loadingOlder = useRef(new Set<string>());
    // every channel I can talk in (world text + dm) — send/read routing
    const allChanRef = useRef<Channel[]>([]);
    allChanRef.current = [...channels, ...dmChannels];
    // set inside the account effect; the shared event handler calls it when a
    // friendship event lands (friend lists + dm channels need a refetch)
    const reloadAccountRef = useRef<(() => void) | null>(null);
    // same pattern for the emote library (world_emotes events)
    const reloadEmotesRef = useRef<(() => void) | null>(null);
    const worldIdRef = useRef(worldId);
    worldIdRef.current = worldId;

    const nameMap = useMemo(() => ({ ...friendProfiles, ...profiles }), [friendProfiles, profiles]);

    const emotesById = useMemo(() => {
        const m = new Map<string, EmoteRow>();
        for (const e of emotes) m.set(e.id, e);
        return m;
    }, [emotes]);

    // ready-to-render sticker library for the picker
    const emoteViews = useMemo(() => emotes.map((e): EmoteView => ({ ...e, url: emoteUrls[e.storage_path] ?? null })), [emotes, emoteUrls]);

    // channel rows → Msg at render time, so late-arriving profile names /
    // reaction echoes / state flags all re-resolve without re-fetching
    const threads = useMemo(() => {
        const nameOf = (id: string) => nameMap[id]?.display_name ?? '对方';
        const out: Record<string, Msg[]> = {};
        for (const [cid, rows] of Object.entries(chanRows)) {
            out[cid] = rows.map((r): Msg => {
                const mine = r.author_id === uid;
                const emote = r.kind === 'sticker' && r.emote_id ? emotesById.get(r.emote_id) : undefined;
                const rx = reactions[r.id];
                let msgRx: MsgReaction[] | undefined;
                if (rx?.length) {
                    const byEmoji = new Map<string, ReactionRow[]>();
                    for (const row of rx) byEmoji.set(row.emoji, [...(byEmoji.get(row.emoji) ?? []), row]);
                    msgRx = [...byEmoji.entries()].map(([emoji, rows2]) => ({
                        emoji,
                        count: rows2.length,
                        mine: rows2.some((x) => x.user_id === uid),
                        users: rows2.map((x) => (x.user_id === uid ? '我' : nameOf(x.user_id)))
                    }));
                }
                return {
                    id: r.id,
                    from: mine ? 'me' : 'them',
                    text: r.content,
                    time: fmtTime(r.created_at),
                    sender: mine ? undefined : nameOf(r.author_id),
                    ts: r.created_at,
                    authorId: r.author_id,
                    edited: !!r.edited_at,
                    pending: pendingIds.has(r.id) || undefined,
                    failed: failedIds.has(r.id) || undefined,
                    vanishing: vanishingIds.has(r.id) || undefined,
                    reactions: msgRx,
                    kind: r.kind,
                    emoteUrl: emote ? (emoteUrls[emote.storage_path] ?? null) : null,
                    emoteGone: r.kind === 'sticker' && !r.emote_id ? true : undefined
                };
            });
        }
        return out;
    }, [chanRows, uid, nameMap, reactions, pendingIds, failedIds, vanishingIds, emotesById, emoteUrls]);

    // DM conversations, ready for every switcher (dock tabs / hub nav / home
    // panel 私信区); hint = the latest message, so DM rows read like a
    // conversation list (mockup friends-page.html)
    const dmConvs = useMemo(
        () =>
            dmChannels.map((c): Conv => {
                const other = otherOf(c, uid);
                const name = nameMap[other]?.display_name ?? '好友';
                const last = (chanRows[c.id] ?? []).at(-1);
                return { id: c.id, kind: 'dm', name, hint: last?.content ?? '私信', otherId: other, ini: name.slice(0, 1), color: colorFor(other) };
            }),
        [dmChannels, uid, nameMap, chanRows]
    );

    // home-panel friend view models
    const friends = useMemo(
        () =>
            friendships
                .filter((f) => f.status === 'accepted')
                .map((f): FriendEntry => {
                    const other = f.user_a === uid ? f.user_b : f.user_a;
                    const dm = dmChannels.find((c) => other === otherOf(c, uid));
                    return { otherId: other, name: nameMap[other]?.display_name ?? '好友', color: colorFor(other), dmChannelId: dm?.id ?? null };
                }),
        [friendships, dmChannels, uid, nameMap]
    );
    const requestsIn = useMemo(
        () =>
            friendships
                .filter((f) => f.status === 'pending' && f.requested_by !== uid)
                .map((f): FriendRequest => {
                    const other = f.requested_by;
                    return { otherId: other, name: nameMap[other]?.display_name ?? '有人', color: colorFor(other) };
                }),
        [friendships, uid, nameMap]
    );
    const requestsOut = useMemo(
        () =>
            friendships
                .filter((f) => f.status === 'pending' && f.requested_by === uid)
                .map((f): FriendRequest => {
                    const other = f.user_a === uid ? f.user_b : f.user_a;
                    return { otherId: other, name: nameMap[other]?.display_name ?? '对方', color: colorFor(other) };
                }),
        [friendships, uid, nameMap]
    );

    // deleted messages linger briefly so the particle effect can play over
    // the still-rendered bubble, then get purged for real
    const startVanish = useCallback((id: string) => {
        setVanishingIds((s) => (s.has(id) ? s : new Set(s).add(id)));
        setTimeout(() => {
            setChanRows((prev) => {
                const next: Record<string, ChatMessageRow[]> = {};
                for (const [cid, rows] of Object.entries(prev)) next[cid] = rows.filter((r) => r.id !== id);
                return next;
            });
            setVanishingIds((s) => {
                if (!s.has(id)) return s;
                const n = new Set(s);
                n.delete(id);
                return n;
            });
        }, VANISH_MS);
    }, []);

    // merge one fetched batch (channels' pages + reactions + reads) into the
    // shared stores — used by both the world and the account loaders
    const absorb = useCallback(
        (chans: Channel[], pages: ChatMessageRow[][], rxRows: ReactionRow[], readRows: { channel_id: string; user_id: string; last_read_at: string }[], merge: boolean) => {
            setChanRows((prev) => {
                const next = { ...prev };
                chans.forEach((c, i) => {
                    next[c.id] = merge ? mergeRows(prev[c.id] ?? [], pages[i]) : pages[i];
                });
                return next;
            });
            setReactions((prev) => {
                const next = { ...prev };
                for (const r of rxRows) {
                    const cur = (next[r.message_id] ?? []).filter((x) => rxKey(x) !== rxKey(r));
                    next[r.message_id] = [...cur, r];
                }
                return next;
            });
            setReads((prev) => {
                const next = { ...prev };
                for (const r of readRows) next[r.channel_id] = { ...next[r.channel_id], [r.user_id]: r.last_read_at };
                return next;
            });
            setReachedStart((prev) => {
                const next = { ...prev };
                chans.forEach((c, i) => {
                    if (pages[i].length < MESSAGE_PAGE_SIZE) next[c.id] = true;
                });
                return next;
            });
        },
        []
    );

    // one event handler for both topics — every table the triggers broadcast
    const onEvent = useCallback(
        (ev: WorldEvent) => {
            if (ev.table === 'messages') {
                if (ev.operation === 'DELETE') {
                    startVanish(ev.old_record.id);
                } else {
                    const row = ev.record;
                    setChanRows((prev) => ({ ...prev, [row.channel_id]: mergeRows(prev[row.channel_id] ?? [], [row]) }));
                    if (ev.operation === 'INSERT') {
                        // echo of an optimistic send — confirmed
                        setPendingIds((s) => {
                            if (!s.has(row.id)) return s;
                            const n = new Set(s);
                            n.delete(row.id);
                            return n;
                        });
                    }
                }
            } else if (ev.table === 'message_reactions') {
                const row = ev.operation === 'INSERT' ? ev.record : ev.old_record;
                if (!row) return;
                setReactions((prev) => {
                    const cur = (prev[row.message_id] ?? []).filter((x) => rxKey(x) !== rxKey(row));
                    return { ...prev, [row.message_id]: ev.operation === 'INSERT' ? [...cur, row] : cur };
                });
            } else if (ev.table === 'channel_reads') {
                const row = ev.record;
                if (!row) return;
                setReads((prev) => ({ ...prev, [row.channel_id]: { ...prev[row.channel_id], [row.user_id]: row.last_read_at } }));
            } else if (ev.table === 'friendships') {
                // friend lists and dm channels changed shape — refetch them
                reloadAccountRef.current?.();
            } else if (ev.table === 'world_emotes') {
                // shared sticker library changed on either end — refetch
                reloadEmotesRef.current?.();
            }
        },
        [startVanish]
    );

    // ── world stream: the world's text channels + emote library ───────
    useEffect(() => {
        if (!worldId) {
            setChannels([]);
            setEmotes([]);
            setEmoteUrls({});
            return;
        }
        let cancelled = false;
        let everSubscribed = false;

        const loadEmotes = async () => {
            const rows = await listEmotes();
            if (cancelled) return;
            setEmotes(rows);
            const urls = await signImageUrls(rows.map((r) => r.storage_path));
            if (!cancelled) setEmoteUrls(urls);
        };
        reloadEmotesRef.current = () => {
            loadEmotes().catch((e: unknown) => {
                if (!cancelled) Logman.warn(TAG, `表情库刷新失败：${errMsg(e)}`);
            });
        };
        reloadEmotesRef.current();
        // signed urls expire after an hour — re-sign well before that so
        // stickers survive long idle sessions (same bug class as ST-O)
        const resign = setInterval(() => reloadEmotesRef.current?.(), 40 * 60 * 1000);

        const load = async (merge: boolean) => {
            const chs = await getChannels(worldId);
            if (cancelled) return;
            setChannels(chs);
            const text = chs.filter((c) => c.type === 'text');
            const [pages, readRows] = await Promise.all([Promise.all(text.map((c) => getMessages(c.id))), getChannelReads(worldId)]);
            if (cancelled) return;
            const rxRows = await getReactions(pages.flat().map((r) => r.id));
            if (cancelled) return;
            absorb(text, pages, rxRows, readRows, merge);
        };

        load(false).catch((e: unknown) => {
            if (!cancelled) Logman.error(TAG, `载入频道失败：${errMsg(e)}`);
        });

        const unsub = subscribeWorld(worldId, onEvent, (status) => {
            if (cancelled) return;
            Logman.log(TAG, `world 订阅状态：${status}（${worldId}）`);
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                Logman.warn(TAG, `world 连接异常：${status}，等待自动重连`);
            } else if (status === 'SUBSCRIBED' && everSubscribed) {
                // reconnected — refill the gap the broadcast couldn't cover
                load(true).catch((e: unknown) => {
                    if (!cancelled) Logman.warn(TAG, `world 重连补拉失败：${errMsg(e)}`);
                });
            }
            if (status === 'SUBSCRIBED') everSubscribed = true;
        });
        return () => {
            cancelled = true;
            reloadEmotesRef.current = null;
            clearInterval(resign);
            unsub();
        };
    }, [worldId, onEvent, absorb]);

    // ── account stream: friendships + DM conversations ────────────────
    useEffect(() => {
        if (!uid) {
            setDmChannels([]);
            setFriendships([]);
            setFriendProfiles({});
            return;
        }
        let cancelled = false;
        let everSubscribed = false;

        const load = async (merge: boolean) => {
            const [fs, dms] = await Promise.all([listFriendships(), getDmChannels()]);
            if (cancelled) return;
            setFriendships(fs);
            setDmChannels(dms);
            const otherIds = [...new Set(fs.flatMap((f) => [f.user_a, f.user_b]).filter((id) => id !== uid))];
            const [profs, pages, readRows] = await Promise.all([
                getProfilesByIds(otherIds),
                Promise.all(dms.map((c) => getMessages(c.id))),
                getReadsForChannels(dms.map((c) => c.id))
            ]);
            if (cancelled) return;
            setFriendProfiles(profs);
            const rxRows = await getReactions(pages.flat().map((r) => r.id));
            if (cancelled) return;
            absorb(dms, pages, rxRows, readRows, merge);
        };

        reloadAccountRef.current = () => {
            load(true).catch((e: unknown) => {
                if (!cancelled) Logman.warn(TAG, `好友/私信刷新失败：${errMsg(e)}`);
            });
        };

        load(false).catch((e: unknown) => {
            if (!cancelled) Logman.error(TAG, `载入好友/私信失败：${errMsg(e)}`);
        });

        const unsub = subscribeUser(uid, onEvent, (status) => {
            if (cancelled) return;
            Logman.log(TAG, `account 订阅状态：${status}`);
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                Logman.warn(TAG, `account 连接异常：${status}，等待自动重连`);
            } else if (status === 'SUBSCRIBED' && everSubscribed) {
                load(true).catch((e: unknown) => {
                    if (!cancelled) Logman.warn(TAG, `account 重连补拉失败：${errMsg(e)}`);
                });
            }
            if (status === 'SUBSCRIBED') everSubscribed = true;
        });
        return () => {
            cancelled = true;
            reloadAccountRef.current = null;
            unsub();
        };
    }, [uid, onEvent, absorb]);

    // upward pagination for the chat hub: prepend the page before the oldest
    // loaded message of a conversation (+ its reactions)
    const loadOlder = useCallback(async (convId: string) => {
        if (!allChanRef.current.some((c) => c.id === convId)) return;
        if (loadingOlder.current.has(convId)) return;
        const oldest = (chanRowsRef.current[convId] ?? [])[0];
        if (!oldest) return;
        loadingOlder.current.add(convId);
        try {
            const page = await getMessages(convId, { before: oldest.created_at });
            const rxRows = await getReactions(page.map((r) => r.id));
            setChanRows((prev) => ({ ...prev, [convId]: mergeRows(page, prev[convId] ?? []) }));
            if (rxRows.length)
                setReactions((prev) => {
                    const next = { ...prev };
                    for (const r of rxRows) {
                        const cur = (next[r.message_id] ?? []).filter((x) => rxKey(x) !== rxKey(r));
                        next[r.message_id] = [...cur, r];
                    }
                    return next;
                });
            if (page.length < MESSAGE_PAGE_SIZE) setReachedStart((prev) => ({ ...prev, [convId]: true }));
        } catch (e: unknown) {
            Logman.warn(TAG, `加载更早消息失败：${errMsg(e)}`);
        } finally {
            loadingOlder.current.delete(convId);
        }
    }, []);

    // optimistic send: the bubble appears instantly as pending and is
    // confirmed by the echo (same client-generated id); failure flips it to
    // the failed state — content is never dropped implicitly (D-2/D-7).
    // `exec` is the actual write (text or sticker) so both kinds share the
    // pending/failed bookkeeping.
    const deliver = useCallback((id: string, label: string, exec: () => Promise<void>) => {
        setPendingIds((s) => new Set(s).add(id));
        setFailedIds((s) => {
            if (!s.has(id)) return s;
            const n = new Set(s);
            n.delete(id);
            return n;
        });
        exec().catch((e: unknown) => {
            Logman.error(TAG, `发送失败（${label}）：${errMsg(e)}`);
            setPendingIds((s) => {
                const n = new Set(s);
                n.delete(id);
                return n;
            });
            setFailedIds((s) => new Set(s).add(id));
        });
    }, []);

    const appendLocal = useCallback((convId: string, row: ChatMessageRow) => {
        setChanRows((prev) => ({ ...prev, [convId]: [...(prev[convId] ?? []), row] }));
    }, []);

    const send = useCallback(
        (convId: string, text: string) => {
            const v = text.trim();
            if (!v || !allChanRef.current.some((c) => c.id === convId)) return;
            const id = crypto.randomUUID();
            appendLocal(convId, {
                id,
                channel_id: convId,
                world_id: null,
                author_id: uidRef.current ?? '',
                content: v,
                created_at: new Date().toISOString(),
                edited_at: null,
                kind: 'text',
                emote_id: null
            });
            deliver(id, convId, () => sendMessage(convId, v, id));
        },
        [deliver, appendLocal]
    );

    // sticker send rides the exact same optimistic pipeline (B-3)
    const sendStickerTo = useCallback(
        (convId: string, emote: EmoteRow) => {
            if (!allChanRef.current.some((c) => c.id === convId)) return;
            const id = crypto.randomUUID();
            appendLocal(convId, {
                id,
                channel_id: convId,
                world_id: null,
                author_id: uidRef.current ?? '',
                content: `:${emote.name}:`,
                created_at: new Date().toISOString(),
                edited_at: null,
                kind: 'sticker',
                emote_id: emote.id
            });
            deliver(id, `sticker ${emote.name}`, () => sendSticker(convId, emote.id, emote.name, id));
        },
        [deliver, appendLocal]
    );

    const retrySend = useCallback(
        (msgId: string) => {
            for (const rows of Object.values(chanRowsRef.current)) {
                const row = rows.find((r) => r.id === msgId);
                if (!row) continue;
                if (row.kind === 'sticker' && row.emote_id) {
                    const name = row.content.replace(/^:|:$/g, '');
                    deliver(row.id, `sticker ${name}`, () => sendSticker(row.channel_id, row.emote_id!, name, row.id));
                } else {
                    deliver(row.id, row.channel_id, () => sendMessage(row.channel_id, row.content, row.id));
                }
                return;
            }
        },
        [deliver]
    );

    // discard a failed (never persisted) message — the one explicit drop path
    const discardFailed = useCallback((msgId: string) => {
        setChanRows((prev) => {
            const next: Record<string, ChatMessageRow[]> = {};
            for (const [cid, rows] of Object.entries(prev)) next[cid] = rows.filter((r) => r.id !== msgId);
            return next;
        });
        setFailedIds((s) => {
            const n = new Set(s);
            n.delete(msgId);
            return n;
        });
    }, []);

    // edit own message — optimistic content swap, echo confirms; on failure
    // the echo-less local edit is corrected by the next reconnect refetch
    const editMessage = useCallback((msgId: string, content: string) => {
        const v = content.trim();
        if (!v) return;
        setChanRows((prev) => {
            const next: Record<string, ChatMessageRow[]> = {};
            for (const [cid, rows] of Object.entries(prev))
                next[cid] = rows.map((r) => (r.id === msgId ? { ...r, content: v, edited_at: r.edited_at ?? new Date().toISOString() } : r));
            return next;
        });
        updateMessage(msgId, v).catch((e: unknown) => Logman.error(TAG, `编辑失败（${msgId}）：${errMsg(e)}`));
    }, []);

    // delete own message — vanish locally right away (particles play), the
    // DELETE broadcast makes the other end vanish too
    const deleteMsg = useCallback(
        (msgId: string) => {
            startVanish(msgId);
            deleteMessage(msgId).catch((e: unknown) => Logman.error(TAG, `删除失败（${msgId}）：${errMsg(e)}`));
        },
        [startVanish]
    );

    // optimistic reaction flip; the broadcast echo settles the final state
    const toggleReaction = useCallback((msgId: string, emoji: string) => {
        const me = uidRef.current;
        if (!me) return;
        const mine = (reactionsRef.current[msgId] ?? []).some((r) => r.user_id === me && r.emoji === emoji);
        setReactions((prev) => {
            const rows = (prev[msgId] ?? []).filter((r) => !(r.user_id === me && r.emoji === emoji));
            return {
                ...prev,
                [msgId]: mine
                    ? rows
                    : [...rows, { message_id: msgId, user_id: me, world_id: null, channel_id: '', emoji, created_at: new Date().toISOString() }]
            };
        });
        (mine ? removeReaction(msgId, emoji) : addReaction(msgId, emoji)).catch((e: unknown) => Logman.warn(TAG, `reaction 失败：${errMsg(e)}`));
    }, []);

    // mark a conversation as read up to now — throttled by the cursor itself:
    // skip when our cursor already covers the newest message
    const markRead = useCallback((convId: string) => {
        const me = uidRef.current;
        if (!me || !allChanRef.current.some((c) => c.id === convId)) return;
        const rows = chanRowsRef.current[convId] ?? [];
        // unconfirmed locals don't count as "something new to read"
        const newest = rows.filter((r) => !pendingRef.current.has(r.id) && !failedRef.current.has(r.id)).at(-1);
        if (!newest) return;
        const mineAt = readsRef.current[convId]?.[me];
        if (mineAt && Date.parse(mineAt) >= Date.parse(newest.created_at)) return;
        // optimistic local cursor so repeat calls stop immediately
        setReads((prev) => ({ ...prev, [convId]: { ...prev[convId], [me]: new Date().toISOString() } }));
        markChannelRead(convId).catch((e: unknown) => Logman.warn(TAG, `已读上报失败：${errMsg(e)}`));
    }, []);

    // emote library actions — the library refreshes via the world_emotes
    // broadcast echo on both ends; errors bubble to the picker's inline msg
    const searchWeb = useCallback((q: string) => searchWebEmotes(q), []);
    const importEmoteUrl = useCallback(async (url: string, name: string) => {
        const w = worldIdRef.current;
        if (!w) throw new Error('先进入世界再收集贴纸');
        await importEmoteFromUrl(w, url, name);
    }, []);
    const addEmoteFile = useCallback(async (file: File, name: string) => {
        const w = worldIdRef.current;
        if (!w) throw new Error('先进入世界再收集贴纸');
        await addEmoteFromFile(w, name, file);
    }, []);
    const removeEmoteById = useCallback((id: string) => {
        removeEmote(id).catch((e: unknown) => Logman.error(TAG, `移出表情失败：${errMsg(e)}`));
    }, []);

    // friend actions (home panel) — lists refresh via the friendships event
    const addFriend = useCallback(async (email: string) => {
        const name = await sendFriendRequest(email);
        return name;
    }, []);
    const acceptRequest = useCallback((otherId: string) => {
        acceptFriend(otherId).catch((e: unknown) => Logman.error(TAG, `接受好友失败：${errMsg(e)}`));
    }, []);
    const removeFriend = useCallback((otherId: string) => {
        removeFriendship(otherId).catch((e: unknown) => Logman.error(TAG, `解除好友失败：${errMsg(e)}`));
    }, []);

    return {
        channels,
        dmConvs,
        friends,
        requestsIn,
        requestsOut,
        threads,
        reads,
        emoteViews,
        send,
        sendStickerTo,
        retrySend,
        discardFailed,
        editMessage,
        deleteMsg,
        toggleReaction,
        markRead,
        loadOlder,
        reachedStart,
        addFriend,
        acceptRequest,
        removeFriend,
        searchWeb,
        importEmoteUrl,
        addEmoteFile,
        removeEmoteById
    };
}
