// useFeed.ts — loads the memory feed for the current user's room.
// The feed assumes you have already entered a room (creation is a separate,
// explicit action), so it only *fetches* the room — a missing room is an error
// (not created yet, or the owner deleted it). Then it loads the room's posts
// via the get_feed_posts RPC (privacy rules run server-side).
import { useState, useEffect, useCallback } from 'react';
import { getFeedPosts } from '@/lib/posts.ts';
import { getMyRoom } from '@/lib/rooms.ts';
import type { Room, FeedPost } from '@/types/feed.ts';

export type FeedStatus = 'loading' | 'ready' | 'error';

export type UseFeed = {
    status: FeedStatus;
    room: Room | null;
    roomId: string | null;
    currentUserId: string | null;
    posts: FeedPost[];
    error: string | null;
    reload: () => void;
};

export const useFeed = (): UseFeed => {
    const [status, setStatus] = useState<FeedStatus>('loading');
    const [room, setRoom] = useState<Room | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    // Reset to the loading state in the event handler (not in the effect body,
    // which would trigger cascading renders); the initial state covers mount.
    const reload = useCallback(() => {
        setStatus('loading');
        setError(null);
        setTick((t) => t + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { room, userId } = await getMyRoom();
            if (!room) {
                if (cancelled) return;
                // Reached the feed without a room: not created yet, or the owner
                // deleted it. Surfaced as an error state rather than a prompt.
                setCurrentUserId(userId);
                setError('找不到你的房间——可能还没创建，或已被房主删除。');
                setStatus('error');
                return;
            }
            const posts = await getFeedPosts(room.id);
            if (cancelled) return;
            setRoom(room);
            setCurrentUserId(userId);
            setPosts(posts);
            setStatus('ready');
        })().catch((e: unknown) => {
            if (cancelled) return;
            setError(e instanceof Error ? e.message : String(e));
            setStatus('error');
        });
        return () => {
            cancelled = true;
        };
    }, [tick]);

    return { status, room, roomId: room?.id ?? null, currentUserId, posts, error, reload };
};
