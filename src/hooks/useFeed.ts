// useFeed.ts — loads the memory feed for the current user's world.
// The feed assumes you have already entered a world (creation is a separate,
// explicit action), so it only *fetches* the world — a missing world is an
// error (not created yet, or the owner deleted it). Then it loads the world's
// posts via the get_feed_posts RPC (privacy rules run server-side).
import { useState, useEffect, useCallback } from 'react';
import { getFeedPosts } from '@/lib/posts.ts';
import { getMyWorld } from '@/lib/worlds.ts';
import type { World, FeedPost } from '@/types/feed.ts';

export type FeedStatus = 'loading' | 'ready' | 'error';

export type UseFeed = {
    status: FeedStatus;
    world: World | null;
    worldId: string | null;
    currentUserId: string | null;
    posts: FeedPost[];
    error: string | null;
    reload: () => void;
};

export const useFeed = (): UseFeed => {
    const [status, setStatus] = useState<FeedStatus>('loading');
    const [world, setWorld] = useState<World | null>(null);
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
            const { world, userId } = await getMyWorld();
            if (!world) {
                if (cancelled) return;
                // Reached the feed without a world: not created yet, or the
                // owner deleted it. Surfaced as an error state, not a prompt.
                setCurrentUserId(userId);
                setError('找不到你们的世界——可能还没创建，或已被删除。');
                setStatus('error');
                return;
            }
            const posts = await getFeedPosts(world.id);
            if (cancelled) return;
            setWorld(world);
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

    return { status, world, worldId: world?.id ?? null, currentUserId, posts, error, reload };
};
