// use-optimistic-send.ts — every mutation a chat surface can trigger, plus the optimistic ledger
// that makes them feel instant: a bubble is rendered from a locally minted row before the write
// leaves, the `pending` / `failed` id sets say how it should look meanwhile, and the DB echo is what
// finally confirms it. Text and stickers share one ledger, so retry and discard work the same for
// both. Decisions: D-2 (draft rules) / D-7 (message states) — see the file header of chat-data.ts.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    addReaction,
    deleteMessage,
    markChannelRead,
    removeReaction,
    sendMessage,
    sendSticker,
    updateMessage
} from '@/lib/chat';
import { Logman } from '@/lib/logman';
import { dropMessageEverywhere, errMsg, mergeRows, without } from '@/themes/cinnaglass/chat/store';
import type { Channel, ChatMessageRow, EmoteRow, ReactionRow } from '@/types/chat';

const TAG = '[chat][web][use-optimistic-send]';

// how long the "that did not save" line stays on the surfaces
const NOTICE_MS = 4000;

// Postgres unique-violation: the row is already there, so the write it reports on did succeed.
const isDuplicateKey = (e: unknown): boolean =>
    typeof e === 'object' && e !== null && (e as { code?: unknown }).code === '23505';

// The slice of the message store these mutations write to. The refs are the store's own mirrors of
// its state, so a callback can read the latest rows without being re-created on every message.
export type SendStore = {
    setChanRows: React.Dispatch<React.SetStateAction<Record<string, ChatMessageRow[]>>>;
    setReactions: React.Dispatch<React.SetStateAction<Record<string, ReactionRow[]>>>;
    setReads: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
    setPendingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setFailedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    chanRowsRef: React.RefObject<Record<string, ChatMessageRow[]>>;
    reactionsRef: React.RefObject<Record<string, ReactionRow[]>>;
    readsRef: React.RefObject<Record<string, Record<string, string>>>;
    pendingRef: React.RefObject<Set<string>>;
    failedRef: React.RefObject<Set<string>>;
    startVanish: (id: string) => void;
    cancelVanish: (id: string) => void;
};

// The write side of the chat store. `allChanRef` is every channel I may talk in (world text + DM),
// used as the guard that a conversation id is real before anything is sent or marked read.
export function useOptimisticSend(
    store: SendStore,
    allChanRef: React.RefObject<Channel[]>,
    uidRef: React.RefObject<string | null>
) {
    const {
        setChanRows,
        setReactions,
        setReads,
        setPendingIds,
        setFailedIds,
        chanRowsRef,
        reactionsRef,
        readsRef,
        pendingRef,
        failedRef,
        startVanish,
        cancelVanish
    } = store;

    // Edits, deletes, reactions and read cursors are optimistic too, but they have no failed state
    // to show: a refused write rolls the local change back and says so in one line, briefly.
    const [writeError, setWriteError] = useState<string | null>(null);
    const noticeTimer = useRef(0);
    const notify = useCallback((text: string) => {
        setWriteError(text);
        window.clearTimeout(noticeTimer.current);
        noticeTimer.current = window.setTimeout(() => setWriteError(null), NOTICE_MS);
    }, []);
    useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

    // Run one write under the optimistic bookkeeping: mark the id pending, clear any earlier
    // failure, and flip it to failed if the write throws. `exec` is the real write (text or
    // sticker) so both kinds share one ledger. Content is never dropped implicitly (D-2 / D-7) —
    // a failed bubble waits for an explicit retry or discard.
    const deliver = useCallback(
        (id: string, label: string, exec: () => Promise<void>) => {
            setPendingIds((s) => new Set(s).add(id));
            setFailedIds((s) => without(s, id));
            exec().catch((e: unknown) => {
                setPendingIds((s) => without(s, id));
                if (isDuplicateKey(e)) {
                    // a retry of a write that had in fact landed (the failure was on the way back):
                    // the row exists, so this is a success, not a failed bubble stuck forever
                    Logman.log(TAG, `重试撞到已存在的消息，按已发出处理（${label}）`);
                    return;
                }
                Logman.error(TAG, `发送失败（${label}）：${errMsg(e)}`);
                setFailedIds((s) => new Set(s).add(id));
            });
        },
        [setPendingIds, setFailedIds]
    );

    // Put an optimistic row at the tail of a conversation before its write starts.
    const appendLocal = useCallback(
        (convId: string, row: ChatMessageRow) => {
            setChanRows((prev) => ({ ...prev, [convId]: [...(prev[convId] ?? []), row] }));
        },
        [setChanRows]
    );

    // Send text: the optimistic bubble appears now, the client-side id makes the echo land on it.
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
        [deliver, appendLocal, allChanRef, uidRef]
    );

    // Sticker send rides the exact same optimistic pipeline as text (B-3).
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
        [deliver, appendLocal, allChanRef, uidRef]
    );

    // Re-run the write for a failed message — text or sticker — keeping its id so the echo still
    // matches.
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
        [deliver, chanRowsRef]
    );

    // discard a failed (never persisted) message — the one explicit drop path
    const discardFailed = useCallback(
        (msgId: string) => {
            setChanRows((prev) => dropMessageEverywhere(prev, msgId));
            setFailedIds((s) => without(s, msgId));
        },
        [setChanRows, setFailedIds]
    );

    // The row an edit or delete is about, from the store's latest mirror.
    const rowOf = useCallback(
        (msgId: string): ChatMessageRow | undefined =>
            Object.values(chanRowsRef.current)
                .flat()
                .find((r) => r.id === msgId),
        [chanRowsRef]
    );

    // edit own message — optimistic content swap, echo confirms; a refused
    // write puts the old row back and says so
    const editMessage = useCallback(
        (msgId: string, content: string) => {
            const v = content.trim();
            const old = rowOf(msgId);
            if (!v || !old) return;
            setChanRows((prev) => {
                const next: Record<string, ChatMessageRow[]> = {};
                for (const [cid, rows] of Object.entries(prev))
                    next[cid] = rows.map((r) =>
                        r.id === msgId ? { ...r, content: v, edited_at: r.edited_at ?? new Date().toISOString() } : r
                    );
                return next;
            });
            updateMessage(msgId, v).catch((e: unknown) => {
                Logman.error(TAG, `编辑失败（${msgId}）：${errMsg(e)}`);
                setChanRows((prev) => ({
                    ...prev,
                    [old.channel_id]: (prev[old.channel_id] ?? []).map((r) => (r.id === msgId ? old : r))
                }));
                notify('刚才的修改没保存上，已恢复原文。');
            });
        },
        [setChanRows, rowOf, notify]
    );

    // delete own message — vanish locally right away (particles play), the
    // DELETE broadcast makes the other end vanish too; a refused delete
    // cancels the vanish and puts the row back if it was already purged
    const deleteMsg = useCallback(
        (msgId: string) => {
            const row = rowOf(msgId);
            startVanish(msgId);
            deleteMessage(msgId).catch((e: unknown) => {
                Logman.error(TAG, `删除失败（${msgId}）：${errMsg(e)}`);
                cancelVanish(msgId);
                if (row)
                    setChanRows((prev) => ({
                        ...prev,
                        [row.channel_id]: mergeRows(prev[row.channel_id] ?? [], [row])
                    }));
                notify('删除没成功，消息还在。');
            });
        },
        [startVanish, cancelVanish, rowOf, setChanRows, notify]
    );

    // optimistic reaction flip; the broadcast echo settles the final state,
    // a refused write flips it straight back
    const toggleReaction = useCallback(
        (msgId: string, emoji: string) => {
            const me = uidRef.current;
            if (!me) return;
            const mine = (reactionsRef.current[msgId] ?? []).some((r) => r.user_id === me && r.emoji === emoji);
            // `present` = my reaction is in the bucket after the flip
            const flip = (present: boolean) =>
                setReactions((prev) => {
                    const rows = (prev[msgId] ?? []).filter((r) => !(r.user_id === me && r.emoji === emoji));
                    return {
                        ...prev,
                        [msgId]: present
                            ? [
                                  ...rows,
                                  {
                                      message_id: msgId,
                                      user_id: me,
                                      world_id: null,
                                      emoji,
                                      created_at: new Date().toISOString()
                                  }
                              ]
                            : rows
                    };
                });
            flip(!mine);
            (mine ? removeReaction(msgId, emoji) : addReaction(msgId, emoji)).catch((e: unknown) => {
                Logman.warn(TAG, `reaction 失败：${errMsg(e)}`);
                flip(mine);
                notify(mine ? '表情没撤回来。' : '表情没发出去。');
            });
        },
        [setReactions, reactionsRef, uidRef, notify]
    );

    // mark a conversation as read up to now — throttled by the cursor itself:
    // skip when our cursor already covers the newest message
    const markRead = useCallback(
        (convId: string) => {
            const me = uidRef.current;
            if (!me || !allChanRef.current.some((c) => c.id === convId)) return;
            const rows = chanRowsRef.current[convId] ?? [];
            // unconfirmed locals don't count as "something new to read"
            const newest = rows.filter((r) => !pendingRef.current.has(r.id) && !failedRef.current.has(r.id)).at(-1);
            if (!newest) return;
            const mineAt = readsRef.current[convId]?.[me];
            // the cursor is the newest message's own (server) timestamp, never the device clock
            const at = newest.created_at;
            if (mineAt && Date.parse(mineAt) >= Date.parse(at)) return;
            // optimistic local cursor so repeat calls stop immediately; a refused
            // write restores the previous cursor (the unread pip comes back)
            setReads((prev) => ({ ...prev, [convId]: { ...prev[convId], [me]: at } }));
            markChannelRead(convId, at).catch((e: unknown) => {
                Logman.warn(TAG, `已读上报失败：${errMsg(e)}`);
                setReads((prev) => {
                    const mine = { ...prev[convId] };
                    if (mineAt) mine[me] = mineAt;
                    else delete mine[me];
                    return { ...prev, [convId]: mine };
                });
            });
        },
        [setReads, allChanRef, chanRowsRef, pendingRef, failedRef, readsRef, uidRef]
    );

    return {
        send,
        sendStickerTo,
        retrySend,
        discardFailed,
        editMessage,
        deleteMsg,
        toggleReaction,
        markRead,
        writeError
    };
}
