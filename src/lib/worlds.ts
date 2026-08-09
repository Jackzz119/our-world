// worlds.ts — data access for worlds (the couple's shared space; DB `worlds`,
// formerly "rooms"/"couples" — terminology in ai/Features/channel.md).
// A world is owned by one person (owner) and may later gain one invited
// member. A solo owner still gets a world, so the feed always has somewhere
// to post.
import { supabase } from '@/lib/supabase.ts';
import type { World } from '@/types/feed.ts';

const WORLD_COLS = 'id, owner_id, member_id, name, anniversary, icon_emoji, icon_path, intimacy_points, created_at';

// Fetch the current user's world (as owner or member), or null if they have
// none. World creation is a separate, explicit action (see createWorld) — the
// feed assumes you have already entered a world, so a null here is an anomaly
// the caller should surface as an error.
export const getMyWorld = async (): Promise<{ world: World | null; userId: string }> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('未登录，无法进入世界。');

    const { data, error } = await supabase
        .from('worlds')
        .select(WORLD_COLS)
        .or(`owner_id.eq.${userId},member_id.eq.${userId}`)
        .maybeSingle();
    if (error) throw error;
    return { world: (data as World) ?? null, userId };
};

// Explicitly create a world owned by the current user (Discord-style "open a
// server"). Solo at first: member_id null, status defaults to 'pending'. A
// member is invited later. check_world_uniqueness rejects a second world per
// user.
export const createWorld = async (): Promise<World> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('未登录，无法创建世界。');

    const { data, error } = await supabase.from('worlds').insert({ owner_id: userId }).select(WORLD_COLS).single();
    if (error) throw error;
    return data as World;
};

// Editable world identity (world settings modal). RLS lets either member
// write, so edits sync between the couple through the DB row.
export type WorldPatch = Partial<Pick<World, 'name' | 'anniversary' | 'icon_emoji' | 'icon_path'>>;

// Persist world-settings edits and return the fresh row (the caller swaps it
// into state so the chrome updates immediately).
export const updateWorld = async (worldId: string, patch: WorldPatch): Promise<World> => {
    const { data, error } = await supabase.from('worlds').update(patch).eq('id', worldId).select(WORLD_COLS).single();
    if (error) throw error;
    return data as World;
};
