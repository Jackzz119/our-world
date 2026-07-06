// profiles.ts — data access for user profiles (display identity for the feed).
// The feed RPC only returns author_id; author names come from public.profiles,
// fetched once per world (owner + member) and looked up per post.
import { supabase } from '@/lib/supabase.ts';
import type { FeedProfile } from '@/types/feed.ts';

// Fetch profiles by id, as an id -> profile map for author lookup.
export const getProfilesByIds = async (ids: (string | null)[]): Promise<Record<string, FeedProfile>> => {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    if (!unique.length) return {};
    const { data, error } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', unique);
    if (error) throw error;
    const map: Record<string, FeedProfile> = {};
    for (const row of (data ?? []) as FeedProfile[]) map[row.id] = row;
    return map;
};
