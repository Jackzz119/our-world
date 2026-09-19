// chat-data.ts — the chat view-model layer: turns the rows fetched by lib/chat|friends|emotes into
// everything the two chat surfaces render — the stage-side ChatCard (shell/chat-card.tsx) and the
// covering chat hub (channel-screen.tsx). World text channels ride the world topic, DMs and
// friendships ride the account topic `user:{uid}`; one pipeline serves both, since a DM is just a
// channel without a world. Feature doc: ai/features/chat.md.
// This file is now the façade only: the pure projections live in chat-store.ts and the five hooks
// it composes are use-message-store / use-world-stream / use-account-stream / use-emote-library /
// use-optimistic-send. Its path, its exports and useChatThreads' return face are unchanged, so no
// consumer had to move.
// Decisions cited below live in the historical register
// ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md (D-2 draft rules :11,
// D-7 message states :53); the current register is ai/design_system/uiux/cinnaglass/decisions.md.
// B-3 (sticker send) is a mockup clause in
// ai/design_system/uiux/research/cinnaglass-history/emoji-picker.html.
import { useCallback, useMemo, useRef } from 'react';
import { acceptFriend, removeFriendship, sendFriendRequest } from '@/lib/friends.ts';
import { Logman } from '@/lib/logman.ts';
import { colorFor, errMsg, otherOf, toMsgs } from './chat-store';
import { useAccountStream } from './use-account-stream';
import { useEmoteLibrary } from './use-emote-library';
import { useMessageStore } from './use-message-store';
import { useOptimisticSend } from './use-optimistic-send';
import { useWorldStream } from './use-world-stream';
import type { Conv, FriendEntry, FriendRequest, Msg } from './chat-store';
import type { Channel } from '@/types/chat.ts';
import type { FeedProfile } from '@/types/feed.ts';

// The view-model types and the pure projections live in chat-store.ts; both chat surfaces keep
// importing them from here, so the split stays invisible to every consumer.
export { colorFor, convsFor } from './chat-store';
export type { Conv, EmoteView, FriendEntry, FriendRequest, Msg, MsgReaction } from './chat-store';

// Logman tag for this module (ai/PROJECT.md §已有功能资产 keeps the domain tag pool).
const TAG = '[chat][web][chat-data]';

// virtual conversation id: the friends page inside the chat hub (Discord-
// style — the pinned entry above the DM list; not a real channel)
export const FRIENDS_VIEW = 'friends';

/* eslint-disable react-hooks/refs -- `uidRef.current = uid` and the allChanRef line below are
   verbatim from the pre-split hook: both are read from event handlers and from a child's effect in
   the same commit, so syncing them in an effect instead would make those callers read one commit
   behind. See the same note in use-message-store.ts. */

// Single source of truth for every conversation, shared by both chat surfaces. Loads each channel's
// latest page once, then keeps the stores live from the two broadcast topics — our own writes
// included, since the DB echo is the only render path. Returns the conversation lists, the rendered
// threads, the read cursors and every mutation the surfaces can trigger.
export function useChatThreads(worldId: string | null, uid: string | null, profiles: Record<string, FeedProfile>) {
    const uidRef = useRef(uid);
    uidRef.current = uid;
    // every channel I can talk in (world text + dm) — send/read routing
    const allChanRef = useRef<Channel[]>([]);
    // filled by the account stream; the shared event handler calls it when a
    // friendship event lands (friend lists + dm channels need a refetch)
    const reloadAccountRef = useRef<(() => void) | null>(null);
    // same pattern for the emote library (world_emotes events)
    const reloadEmotesRef = useRef<(() => void) | null>(null);

    // the shared message repository; both streams feed it and every mutation writes through it
    const store = useMessageStore(allChanRef, reloadAccountRef, reloadEmotesRef);
    const { chanRows, reactions, reads, reachedStart, pendingIds, failedIds, vanishingIds, loadOlder } = store;
    const { channels } = useWorldStream(worldId, store);
    const { dmChannels, friendships, friendProfiles } = useAccountStream(uid, store, reloadAccountRef);
    // the world's shared sticker library, its signed urls and its four actions
    const { emotesById, emoteUrls, emoteViews, searchWeb, importEmoteUrl, addEmoteFile, removeEmoteById } =
        useEmoteLibrary(worldId, reloadEmotesRef);

    // both channel sources are in hand — assemble the routing list once, during render, so every
    // handler and every child effect in this commit already sees the new set
    allChanRef.current = [...channels, ...dmChannels];

    // the write side: the optimistic ledger plus every mutation the surfaces can trigger
    const { send, sendStickerTo, retrySend, discardFailed, editMessage, deleteMsg, toggleReaction, markRead } =
        useOptimisticSend(store, allChanRef, uidRef);

    // Display names; world-member profiles win over friend profiles when both know an id.
    const nameMap = useMemo(() => ({ ...friendProfiles, ...profiles }), [friendProfiles, profiles]);

    // channel rows → Msg at render time, so late-arriving profile names /
    // reaction echoes / state flags all re-resolve without re-fetching
    const threads = useMemo(() => {
        const ctx = { uid, nameMap, reactions, emotesById, emoteUrls, pendingIds, failedIds, vanishingIds };
        const out: Record<string, Msg[]> = {};
        for (const [cid, rows] of Object.entries(chanRows)) out[cid] = toMsgs(rows, ctx);
        return out;
    }, [chanRows, uid, nameMap, reactions, pendingIds, failedIds, vanishingIds, emotesById, emoteUrls]);

    // DM conversations for every switcher; hint = the latest message, so a DM row reads like a
    // conversation list entry.
    const dmConvs = useMemo(
        () =>
            dmChannels.map((c): Conv => {
                const other = otherOf(c, uid);
                const name = nameMap[other]?.display_name ?? '好友';
                const last = (chanRows[c.id] ?? []).at(-1);
                return {
                    id: c.id,
                    kind: 'dm',
                    name,
                    hint: last?.content ?? '私信',
                    otherId: other,
                    ini: name.slice(0, 1),
                    color: colorFor(other)
                };
            }),
        [dmChannels, uid, nameMap, chanRows]
    );

    // Accepted friendships as rows for the friends page, each carrying its DM channel if one exists.
    const friends = useMemo(
        () =>
            friendships
                .filter((f) => f.status === 'accepted')
                .map((f): FriendEntry => {
                    const other = f.user_a === uid ? f.user_b : f.user_a;
                    const dm = dmChannels.find((c) => other === otherOf(c, uid));
                    return {
                        otherId: other,
                        name: nameMap[other]?.display_name ?? '好友',
                        color: colorFor(other),
                        dmChannelId: dm?.id ?? null
                    };
                }),
        [friendships, dmChannels, uid, nameMap]
    );
    // Friend requests waiting for my answer.
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
    // Friend requests waiting for theirs.
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

    // friend actions — lists refresh via the friendships event
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
