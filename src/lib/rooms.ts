// rooms.ts — data access for rooms (the shared space, formerly "couple").
// A room is owned by one person (owner) and may later gain one invited member.
// A solo owner still gets a room, so the feed always has somewhere to post.
import { supabase } from '@/lib/supabase.ts';
import type { Room } from '@/types/feed.ts';

const ROOM_COLS = 'id, owner_id, member_id, intimacy_points, created_at';

// Fetch the current user's room (as owner or member), or null if they have
// none. Room creation is a separate, explicit action (see createRoom) — the
// feed assumes you have already entered a room, so a null here is an anomaly
// the caller should surface as an error.
export const getMyRoom = async (): Promise<{ room: Room | null; userId: string }> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('未登录，无法进入房间。');

    const { data, error } = await supabase
        .from('rooms')
        .select(ROOM_COLS)
        .or(`owner_id.eq.${userId},member_id.eq.${userId}`)
        .maybeSingle();
    if (error) throw error;
    return { room: (data as Room) ?? null, userId };
};

// Explicitly create a room owned by the current user (Discord-style "open a
// room"). Solo at first: member_id null, status defaults to 'pending'. A member
// is invited later. check_room_uniqueness rejects a second room per user.
export const createRoom = async (): Promise<Room> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('未登录，无法创建房间。');

    const { data, error } = await supabase.from('rooms').insert({ owner_id: userId }).select(ROOM_COLS).single();
    if (error) throw error;
    return data as Room;
};