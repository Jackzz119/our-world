// use-world-stream.ts — everything that arrives on the `world:{id}` broadcast topic: the world's
// channel list, the first page of each text channel, everyone's read cursors, and the live
// subscription that keeps them current. A reconnect refills the gap the broadcast could not cover,
// which is why the loader takes a `merge` flag. Feature doc: ai/features/chat.md §三.
import { useEffect, useState } from 'react';
import { getChannelReads, getChannels, getMessages, getReactions, subscribeWorld } from '@/lib/chat';
import { Logman } from '@/lib/logman';
import { errMsg } from '@/themes/cinnaglass/chat-store';
import type { StreamSink } from '@/themes/cinnaglass/use-message-store';
import type { Channel } from '@/types/chat';

const TAG = '[chat][web][use-world-stream]';

/* eslint-disable react-hooks/set-state-in-effect -- verbatim move of the world effect in
   chat-data.ts: leaving a world clears its channel list, which is a state reset rather than derived
   state (derivation would leave the previous world's channels on screen until the next load lands).
   The rule only became visible because the 605-line hook this effect used to live in was too large
   for the compiler-backed lint to analyse. */

// Subscribes to one world and pushes its pages into the shared message store. `sink.absorb` and
// `sink.handleEvent` must be stable references — they are in the effect's dependency list, so any
// churn in them would unsubscribe and resubscribe the topic on every render.
export function useWorldStream(worldId: string | null, sink: StreamSink) {
    const [channels, setChannels] = useState<Channel[]>([]); // world channels
    const { absorb, handleEvent } = sink;

    useEffect(() => {
        if (!worldId) {
            setChannels([]);
            return;
        }
        let cancelled = false;
        let everSubscribed = false;

        const load = async (merge: boolean) => {
            const chs = await getChannels(worldId);
            if (cancelled) return;
            setChannels(chs);
            const text = chs.filter((c) => c.type === 'text');
            const [pages, readRows] = await Promise.all([
                Promise.all(text.map((c) => getMessages(c.id))),
                getChannelReads(worldId)
            ]);
            if (cancelled) return;
            const rxRows = await getReactions(pages.flat().map((r) => r.id));
            if (cancelled) return;
            absorb(text, pages, rxRows, readRows, merge);
        };

        load(false).catch((e: unknown) => {
            if (!cancelled) Logman.error(TAG, `载入频道失败：${errMsg(e)}`);
        });

        const unsub = subscribeWorld(worldId, handleEvent, (status) => {
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
            unsub();
        };
    }, [worldId, handleEvent, absorb]);

    return { channels };
}
