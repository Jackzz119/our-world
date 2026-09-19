// use-message-store.ts — the shared message repository: the rows, reactions and read cursors of
// every conversation (world channels and DMs alike), the three client-side id ledgers, and the two
// ways rows get in — `absorb` for a fetched batch and `handleEvent` for a broadcast echo. It is
// deliberately one module: absorb's four setState calls must land in a single React commit, or a
// message would paint one frame before its reactions do. Feature doc: ai/features/chat.md §三.
import { useCallback, useRef, useState } from 'react';
import { MESSAGE_PAGE_SIZE, getMessages, getReactions } from '@/lib/chat';
import { Logman } from '@/lib/logman';
import { dropMessageEverywhere, errMsg, mergeRows, upsertReactions, without } from '@/themes/cinnaglass/chat-store';
import type { Channel, ChannelReadRow, ChatMessageRow, ReactionRow, WorldEvent } from '@/types/chat';

const TAG = '[chat][web][use-message-store]';

// how long a deleted message keeps rendering so the particle effect can play
const VANISH_MS = 900;

// The `xRef.current = x` lines below mirror state into refs during render, verbatim from the
// pre-split hook. An event handler or an effect firing in the same commit therefore already reads
// the newest value — markRead in particular is called from a child's effect, which runs before any
// effect this hook could sync in. Syncing in an effect instead would make those callers read one
// commit behind, so the pattern stays as it was.

// Every conversation's rows plus the ledgers that colour them. `allChanRef` guards pagination
// against ids that are not real conversations; the two reload refs let a broadcast event ask the
// account stream or the emote library to refetch without this hook importing either of them.
export function useMessageStore(
    allChanRef: React.RefObject<Channel[]>,
    reloadAccountRef: React.RefObject<(() => void) | null>,
    reloadEmotesRef: React.RefObject<(() => void) | null>
) {
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
    const loadingOlder = useRef(new Set<string>());

    // deleted messages linger briefly so the particle effect can play over
    // the still-rendered bubble, then get purged for real
    const startVanish = useCallback((id: string) => {
        setVanishingIds((s) => (s.has(id) ? s : new Set(s).add(id)));
        setTimeout(() => {
            setChanRows((prev) => dropMessageEverywhere(prev, id));
            setVanishingIds((s) => without(s, id));
        }, VANISH_MS);
    }, []);

    // merge one fetched batch (channels' pages + reactions + reads) into the
    // shared stores — used by both the world and the account loaders
    const absorb = useCallback(
        (
            chans: Channel[],
            pages: ChatMessageRow[][],
            rxRows: ReactionRow[],
            readRows: ChannelReadRow[],
            merge: boolean
        ) => {
            setChanRows((prev) => {
                const next = { ...prev };
                chans.forEach((c, i) => {
                    next[c.id] = merge ? mergeRows(prev[c.id] ?? [], pages[i]) : pages[i];
                });
                return next;
            });
            setReactions((prev) => upsertReactions(prev, rxRows));
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
    const handleEvent = useCallback(
        (ev: WorldEvent) => {
            if (ev.table === 'messages') {
                if (ev.operation === 'DELETE') {
                    startVanish(ev.old_record.id);
                } else {
                    const row = ev.record;
                    setChanRows((prev) => ({
                        ...prev,
                        [row.channel_id]: mergeRows(prev[row.channel_id] ?? [], [row])
                    }));
                    if (ev.operation === 'INSERT') {
                        // echo of an optimistic send — confirmed
                        setPendingIds((s) => without(s, row.id));
                    }
                }
            } else if (ev.table === 'message_reactions') {
                const row = ev.operation === 'INSERT' ? ev.record : ev.old_record;
                if (!row) return;
                setReactions((prev) => upsertReactions(prev, [row], ev.operation !== 'INSERT'));
            } else if (ev.table === 'channel_reads') {
                const row = ev.record;
                if (!row) return;
                setReads((prev) => ({
                    ...prev,
                    [row.channel_id]: { ...prev[row.channel_id], [row.user_id]: row.last_read_at }
                }));
            } else if (ev.table === 'friendships') {
                // friend lists and dm channels changed shape — refetch them
                reloadAccountRef.current?.();
            } else if (ev.table === 'world_emotes') {
                // shared sticker library changed on either end — refetch
                reloadEmotesRef.current?.();
            }
        },
        [startVanish, reloadAccountRef, reloadEmotesRef]
    );

    // upward pagination for the chat hub: prepend the page before the oldest
    // loaded message of a conversation (+ its reactions)
    const loadOlder = useCallback(
        async (convId: string) => {
            if (!allChanRef.current.some((c) => c.id === convId)) return;
            if (loadingOlder.current.has(convId)) return;
            const oldest = (chanRowsRef.current[convId] ?? [])[0];
            if (!oldest) return;
            loadingOlder.current.add(convId);
            try {
                const page = await getMessages(convId, { before: oldest.created_at });
                const rxRows = await getReactions(page.map((r) => r.id));
                setChanRows((prev) => ({ ...prev, [convId]: mergeRows(page, prev[convId] ?? []) }));
                if (rxRows.length) setReactions((prev) => upsertReactions(prev, rxRows));
                if (page.length < MESSAGE_PAGE_SIZE) setReachedStart((prev) => ({ ...prev, [convId]: true }));
            } catch (e: unknown) {
                Logman.warn(TAG, `加载更早消息失败：${errMsg(e)}`);
            } finally {
                loadingOlder.current.delete(convId);
            }
        },
        [allChanRef]
    );

    return {
        chanRows,
        reactions,
        reads,
        reachedStart,
        pendingIds,
        failedIds,
        vanishingIds,
        chanRowsRef,
        reactionsRef,
        readsRef,
        pendingRef,
        failedRef,
        setChanRows,
        setReactions,
        setReads,
        setPendingIds,
        setFailedIds,
        startVanish,
        absorb,
        handleEvent,
        loadOlder
    };
}

// What the two stream hooks need from the store: one atomic merge and one event handler.
export type StreamSink = {
    absorb: ReturnType<typeof useMessageStore>['absorb'];
    handleEvent: ReturnType<typeof useMessageStore>['handleEvent'];
};
