// use-account-stream.ts — everything that arrives on the `user:{uid}` topic: my friendships, my DM
// channels with their first page, and the profiles of friends who may live outside this world. DMs
// are account-level rather than world-level, which is why they ride their own topic and stay present
// in the lobby. It publishes its reload through `reloadRef` so a friendships event can refetch the
// whole shape without the message store importing this hook. Feature doc: ai/features/chat.md §三.
import { useEffect, useState } from 'react';
import { getDmChannels, getMessages, getReactions, getReadsForChannels, subscribeUser } from '@/lib/chat';
import { listFriendships } from '@/lib/friends';
import { getProfilesByIds } from '@/lib/profiles';
import { Logman } from '@/lib/logman';
import { errMsg } from '@/themes/cinnaglass/chat-store';
import type { StreamSink } from '@/themes/cinnaglass/use-message-store';
import type { Channel, FriendshipRow } from '@/types/chat';
import type { FeedProfile } from '@/types/feed';

const TAG = '[chat][web][use-account-stream]';

/* eslint-disable react-hooks/set-state-in-effect -- verbatim move of the account effect in
   chat-data.ts: signing out clears the friend and DM lists, which is a state reset rather than
   derived state. The rule only became visible because the 605-line hook this effect used to live in
   was too large for the compiler-backed lint to analyse. */

// Subscribes to one account and pushes its DM pages into the shared message store. `reloadRef` is
// owned by the caller: this hook fills it while the account is mounted and clears it on unmount, so
// the reload always closes over the live `cancelled` flag.
export function useAccountStream(
    uid: string | null,
    sink: StreamSink,
    reloadRef: React.RefObject<(() => void) | null>
) {
    const [dmChannels, setDmChannels] = useState<Channel[]>([]);
    const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
    // profiles of friends (may live outside the world's member pair)
    const [friendProfiles, setFriendProfiles] = useState<Record<string, FeedProfile>>({});
    const { absorb, handleEvent } = sink;

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

        reloadRef.current = () => {
            load(true).catch((e: unknown) => {
                if (!cancelled) Logman.warn(TAG, `好友/私信刷新失败：${errMsg(e)}`);
            });
        };

        load(false).catch((e: unknown) => {
            if (!cancelled) Logman.error(TAG, `载入好友/私信失败：${errMsg(e)}`);
        });

        const unsub = subscribeUser(uid, handleEvent, (status) => {
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
            reloadRef.current = null;
            unsub();
        };
    }, [uid, handleEvent, absorb, reloadRef]);

    return { dmChannels, friendships, friendProfiles };
}
