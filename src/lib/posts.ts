// posts.ts — data access for the memory feed (回忆存储 ①).
// Reads go through the get_feed_posts RPC, which applies privacy / unlock
// rules server-side and returns the post rows for a world.
// Writes insert into the posts table (author = current user).
import { supabase } from '@/lib/supabase.ts';
import type { FeedPost, PostPrivacy } from '@/types/feed.ts';

export type FeedPage = {
    // Exclusive cursor: only posts strictly older than this created_at.
    before?: string | null;
    // Page size; omit for all rows (legacy behavior).
    limit?: number;
};

// Fetch a world's memory posts, newest first. With no worldId, the RPC
// returns every post the caller may see (RLS-scoped). Throws on error so the
// UI can show error state.
export const getFeedPosts = async (worldId?: string, page: FeedPage = {}): Promise<FeedPost[]> => {
    const { data, error } = await supabase.rpc('get_feed_posts', {
        p_world_id: worldId ?? null,
        p_before: page.before ?? null,
        p_limit: page.limit ?? null
    });
    if (error) throw error;
    return (data ?? []) as FeedPost[];
};

export type NewPost = {
    worldId: string;
    content: string;
    images?: string[];
    privacy?: PostPrivacy;
};

// Create a memory post authored by the current user in the given world.
export const createPost = async ({ worldId, content, images = [], privacy = 'shared' }: NewPost): Promise<void> => {
    const { data: auth } = await supabase.auth.getUser();
    const authorId = auth.user?.id;
    if (!authorId) throw new Error('未登录，无法发帖。');

    const { error } = await supabase.from('posts').insert({
        author_id: authorId,
        world_id: worldId,
        content,
        images,
        privacy
    });
    if (error) throw error;
};
