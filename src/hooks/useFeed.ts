// useFeed.ts — loads the memory feed for the current user's world.
// The feed assumes you have already entered a world (creation is a separate,
// explicit action), so it only *fetches* the world — a missing world is an
// error (not created yet, or the owner deleted it). Posts load newest-first
// from the get_feed_posts RPC (privacy rules run server-side) one page at a
// time; loadOlder() walks the created_at cursor backwards for the chat-style
// scroll-up history. Posts are exposed oldest → newest (rendering order).
import { useState, useEffect, useCallback, useRef } from 'react';
import { getFeedPosts } from '@/lib/posts.ts';
import { getProfilesByIds } from '@/lib/profiles.ts';
import { getMyWorld } from '@/lib/worlds.ts';
import type { World, FeedPost, FeedProfile } from '@/types/feed.ts';

export type FeedStatus = 'loading' | 'ready' | 'error';

const PAGE_SIZE = 20;

export type UseFeed = {
    status: FeedStatus;
    world: World | null;
    worldId: string | null;
    currentUserId: string | null;
    posts: FeedPost[]; // oldest → newest
    profiles: Record<string, FeedProfile>;
    hasMore: boolean;
    loadingOlder: boolean;
    loadOlder: () => void;
    error: string | null;
    reload: () => void;
};

// Profiles for everyone who appears in the feed (not just the world's two
// members — authors are open-ended). Decoration only: failures degrade to {}.
const fetchProfiles = (ids: (string | null | undefined)[]): Promise<Record<string, FeedProfile>> =>
    getProfilesByIds(ids.filter((id): id is string => !!id)).catch(() => ({}));

// `enabled` gates the initial fetch: hooks run even while their host renders
// null (e.g. SubScreen mounted with screen=null), which used to fire the feed
// query on page load. Armed on the first enabled render, then latched — the
// feed loads once on first open, later opens reuse it (reload() refreshes).
export const useFeed = (enabled = true): UseFeed => {
    const [status, setStatus] = useState<FeedStatus>('loading');
    const [world, setWorld] = useState<World | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [profiles, setProfiles] = useState<Record<string, FeedProfile>>({});
    const [hasMore, setHasMore] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);
    // render-time latch (not an effect): once enabled, stays armed
    const [armed, setArmed] = useState(enabled);
    if (enabled && !armed) setArmed(true);

    // Reset to the loading state in the event handler (not in the effect body,
    // which would trigger cascading renders); the initial state covers mount.
    const reload = useCallback(() => {
        setStatus('loading');
        setError(null);
        setTick((t) => t + 1);
    }, []);

    useEffect(() => {
        if (!armed) return;
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
            const page = await getFeedPosts(world.id, { limit: PAGE_SIZE });
            const profiles = await fetchProfiles([world.owner_id, world.member_id, ...page.map((p) => p.author_id)]);
            if (cancelled) return;
            setWorld(world);
            setCurrentUserId(userId);
            setPosts([...page].reverse()); // RPC is newest-first; render oldest-first
            setHasMore(page.length === PAGE_SIZE);
            setProfiles(profiles);
            setStatus('ready');
        })().catch((e: unknown) => {
            if (cancelled) return;
            setError(e instanceof Error ? e.message : String(e));
            setStatus('error');
        });
        return () => {
            cancelled = true;
        };
    }, [tick, armed]);

    // Older-page fetch guards live in a ref so loadOlder stays identity-stable
    // for scroll listeners; synced after every render.
    const olderCtx = useRef({ status, world, posts, profiles, hasMore, loadingOlder });
    useEffect(() => {
        olderCtx.current = { status, world, posts, profiles, hasMore, loadingOlder };
    });

    const loadOlder = useCallback(() => {
        const { status, world, posts, profiles, hasMore, loadingOlder } = olderCtx.current;
        if (status !== 'ready' || !world || !hasMore || loadingOlder || !posts.length) return;
        setLoadingOlder(true);
        (async () => {
            const page = await getFeedPosts(world.id, { before: posts[0].created_at, limit: PAGE_SIZE });
            const missing = [...new Set(page.map((p) => p.author_id))].filter((id) => !profiles[id]);
            const extra = missing.length ? await fetchProfiles(missing) : {};
            setPosts((cur) => [...[...page].reverse(), ...cur]);
            setHasMore(page.length === PAGE_SIZE);
            if (Object.keys(extra).length) setProfiles((cur) => ({ ...extra, ...cur }));
        })()
            .catch(() => {
                /* keep the current pages; the user can scroll again to retry */
            })
            .finally(() => setLoadingOlder(false));
    }, []);

    return {
        status,
        world,
        worldId: world?.id ?? null,
        currentUserId,
        posts,
        profiles,
        hasMore,
        loadingOlder,
        loadOlder,
        error,
        reload
    };
};
