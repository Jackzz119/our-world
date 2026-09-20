// chat-store.ts — the pure half of the chat view-model layer: the types both chat surfaces render
// (Msg / Conv / FriendEntry / EmoteView) plus every transformation that turns DB rows into them.
// Zero React and zero state, so each function can be reasoned about — and asserted against — on its
// own; the hooks in chat-data.ts and its use-*.ts siblings only own the state around these.
// Feature doc: ai/features/chat.md §三.
import type { Channel, ChatMessageRow, EmoteRow, ReactionRow } from '@/types/chat';
import type { FeedProfile } from '@/types/feed';

// One emoji chip under a message: the tally, whether I'm in it, and who to name in the tooltip.
export type MsgReaction = { emoji: string; count: number; mine: boolean; users: string[] };

// A message as the UI renders it: the DB row plus a formatted time, a side relative to the reader,
// the optimistic/failed/vanishing flags and the sticker's signed url.
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

// One entry in a conversation switcher — a world text channel or a DM.
export type Conv = {
    id: string; // channel uuid (world text channel OR dm channel)
    kind: 'channel' | 'dm';
    name: string;
    hint: string;
    otherId?: string; // dm: the friend's account id
    ini?: string; // dm: avatar initial
    color?: string; // dm: avatar gradient
};

// View models for the friends page (好友区).
export type FriendEntry = { otherId: string; name: string; color: string; dmChannelId: string | null };
export type FriendRequest = { otherId: string; name: string; color: string };

// A library emote plus its signed display url (null while the url is still being signed). It lives
// here rather than in emote-picker.tsx so the data layer never has to import a UI component.
export type EmoteView = EmoteRow & { url: string | null };

// deterministic avatar hue per account (until real avatars land)
export const colorFor = (id: string): string => {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
    const hue = Math.abs(h) % 360;
    return `linear-gradient(135deg, hsl(${hue},72%,82%), hsl(${hue},58%,64%))`;
};

// The conversation set every switcher shows (card, hub nav, unread badges): the current world's
// text channels first (in-world only — channels are a world concept), then my DMs, which are
// account-level and therefore present in the lobby too.
export const convsFor = (inWorld: boolean, channels: Channel[], dmConvs: Conv[]): Conv[] => [
    ...(inWorld
        ? channels
              .filter((ch) => ch.type === 'text')
              .map((ch): Conv => ({ id: ch.id, kind: 'channel', name: ch.name, hint: ch.topic ?? '' }))
        : []),
    ...dmConvs
];

// Zero-pad to two digits.
const pad = (n: number) => String(n).padStart(2, '0');
// today → HH:mm, older → M/D HH:mm
export const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return d.toDateString() === new Date().toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
};

// Any thrown value → a string safe to show or log (Supabase throws both Errors and plain objects).
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// union by id, ordered by created_at — used wherever pages and broadcast
// echoes may overlap (server rows win over optimistic locals)
export const mergeRows = (a: ChatMessageRow[], b: ChatMessageRow[]): ChatMessageRow[] => {
    const byId = new Map<string, ChatMessageRow>();
    for (const r of [...a, ...b]) byId.set(r.id, r);
    return [...byId.values()].sort((x, y) => Date.parse(x.created_at) - Date.parse(y.created_at));
};

// A reaction's identity inside one message: one row per user per emoji.
export const rxKey = (r: ReactionRow) => `${r.user_id}:${r.emoji}`;
// The other participant of a DM channel.
export const otherOf = (c: Channel, uid: string | null) => (c.dm_user_a === uid ? c.dm_user_b! : c.dm_user_a!);

// Fold reaction rows into the message_id → rows map, replacing any row with the same rxKey so a
// re-fetch and a broadcast echo of the same reaction never double-count. `remove` runs the same
// de-dupe and then drops the row instead of re-adding it (the DELETE echo path).
export const upsertReactions = (
    prev: Record<string, ReactionRow[]>,
    rows: ReactionRow[],
    remove = false
): Record<string, ReactionRow[]> => {
    const next = { ...prev };
    for (const r of rows) {
        const cur = (next[r.message_id] ?? []).filter((x) => rxKey(x) !== rxKey(r));
        next[r.message_id] = remove ? cur : [...cur, r];
    }
    return next;
};

// Reconcile a conversation with a freshly fetched latest page. The page is the server's truth for
// the span it covers, so a local row inside that span that is not in the page was deleted on the
// server (or never got there: an optimistic local, kept via `keep`). Rows newer than the page —
// echoes that landed while the fetch was in flight — and rows older than it — paginated history the
// page does not cover — stay; when the page is short the server has nothing older, so older locals
// go too. A plain union (mergeRows) can never take a row away, which is why a reconnect used to
// keep whatever the other side deleted while we were offline.
export const reconcileRows = (
    local: ChatMessageRow[],
    page: ChatMessageRow[],
    keep: Set<string>,
    pageIsComplete: boolean
): ChatMessageRow[] => {
    if (!page.length) return pageIsComplete ? local.filter((r) => keep.has(r.id)) : local;
    const min = Date.parse(page[0].created_at);
    const max = Date.parse(page[page.length - 1].created_at);
    const pageIds = new Set(page.map((r) => r.id));
    const kept = local.filter((r) => {
        if (pageIds.has(r.id)) return false; // the page's copy wins
        if (keep.has(r.id)) return true; // pending / failed locals were never on the server
        const t = Date.parse(r.created_at);
        if (t > max) return true; // newer than the page: an echo that landed mid-fetch
        if (t < min) return !pageIsComplete; // older history, unless the server has none
        if (t === min) return !pageIsComplete; // a tie at the page's cut may just be over the limit
        return false; // inside the span but absent from it: deleted on the server
    });
    return mergeRows(kept, page);
};

// Replace the reaction buckets of the given messages with a fresh fetch. The fetch is the truth for
// exactly those messages, so a reaction withdrawn while we were offline disappears — which the
// add-only upsertReactions could never do. Buckets of other messages are untouched.
export const replaceReactions = (
    prev: Record<string, ReactionRow[]>,
    messageIds: Iterable<string>,
    rows: ReactionRow[]
): Record<string, ReactionRow[]> => {
    const next = { ...prev };
    for (const id of messageIds) delete next[id];
    for (const r of rows) next[r.message_id] = [...(next[r.message_id] ?? []), r];
    return next;
};

// Drop one id from an id set, returning the very same set when it was not there — the identity is
// what stops a no-op state update from re-rendering every thread.
export const without = (s: Set<string>, id: string): Set<string> => {
    if (!s.has(id)) return s;
    const n = new Set(s);
    n.delete(id);
    return n;
};

// Remove one message from every conversation bucket. The caller rarely knows which channel a
// vanishing or discarded id belonged to, so the sweep is over all of them.
export const dropMessageEverywhere = (
    prev: Record<string, ChatMessageRow[]>,
    id: string
): Record<string, ChatMessageRow[]> => {
    const next: Record<string, ChatMessageRow[]> = {};
    for (const [cid, rows] of Object.entries(prev)) next[cid] = rows.filter((r) => r.id !== id);
    return next;
};

// Everything outside a row that the projection below needs: who "me" is, the names to show, and the
// three client-side ledgers plus the sticker library the row is resolved against.
export type MsgContext = {
    uid: string | null;
    nameMap: Record<string, FeedProfile>;
    reactions: Record<string, ReactionRow[]>;
    emotesById: Map<string, EmoteRow>;
    emoteUrls: Record<string, string>;
    pendingIds: Set<string>;
    failedIds: Set<string>;
    vanishingIds: Set<string>;
};

// One conversation's rows → the messages the UI renders. Called at render time, so late-arriving
// profile names, reaction echoes and state flags all re-resolve without re-fetching anything.
export const toMsgs = (rows: ChatMessageRow[], ctx: MsgContext): Msg[] => {
    const nameOf = (id: string) => ctx.nameMap[id]?.display_name ?? '对方';
    return rows.map((r): Msg => {
        const mine = r.author_id === ctx.uid;
        const emote = r.kind === 'sticker' && r.emote_id ? ctx.emotesById.get(r.emote_id) : undefined;
        const rx = ctx.reactions[r.id];
        let msgRx: MsgReaction[] | undefined;
        if (rx?.length) {
            const byEmoji = new Map<string, ReactionRow[]>();
            for (const row of rx) byEmoji.set(row.emoji, [...(byEmoji.get(row.emoji) ?? []), row]);
            msgRx = [...byEmoji.entries()].map(([emoji, rows2]) => ({
                emoji,
                count: rows2.length,
                mine: rows2.some((x) => x.user_id === ctx.uid),
                users: rows2.map((x) => (x.user_id === ctx.uid ? '我' : nameOf(x.user_id)))
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
            pending: ctx.pendingIds.has(r.id) || undefined,
            failed: ctx.failedIds.has(r.id) || undefined,
            vanishing: ctx.vanishingIds.has(r.id) || undefined,
            reactions: msgRx,
            kind: r.kind,
            emoteUrl: emote ? (ctx.emoteUrls[emote.storage_path] ?? null) : null,
            emoteGone: r.kind === 'sticker' && !r.emote_id ? true : undefined
        };
    });
};
