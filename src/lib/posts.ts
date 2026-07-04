// posts.ts — data access for the memory feed (回忆存储 ①).
// Reads go through the get_feed_posts RPC, which applies privacy / unlock
// rules server-side and returns the post rows for a room.
// Writes insert into the posts table (author = current user).
import { supabase } from '@/lib/supabase.ts';
import type { FeedPost, PostPrivacy } from '@/types/feed.ts';

// Fetch a room's memory posts. With no roomId, the RPC returns every post the
// caller may see (RLS-scoped). Throws on error so the UI can show error state.
export const getFeedPosts = async (roomId?: string): Promise<FeedPost[]> => {
    const { data, error } = await supabase.rpc('get_feed_posts', {
        p_room_id: roomId ?? null
    });
    if (error) throw error;
    return (data ?? []) as FeedPost[];
};

export type NewPost = {
    roomId: string;
    content: string;
    images?: string[];
    privacy?: PostPrivacy;
};

// Create a memory post authored by the current user in the given room.
export const createPost = async ({ roomId, content, images = [], privacy = 'shared' }: NewPost): Promise<void> => {
    const { data: auth } = await supabase.auth.getUser();
    const authorId = auth.user?.id;
    if (!authorId) throw new Error('未登录，无法发帖。');

    const { error } = await supabase.from('posts').insert({
        author_id: authorId,
        room_id: roomId,
        content,
        images,
        privacy
    });
    if (error) throw error;
};