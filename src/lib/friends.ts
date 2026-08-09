// friends.ts — data access for the account-level friend system (chat.md DM
// 阶段). Friendships are canonical pairs (user_a < user_b); accepting a
// request triggers the DM channel creation server-side. Changes reach both
// accounts through their `user:{uid}` broadcast topics.
import { supabase } from '@/lib/supabase.ts';
import type { FriendshipRow } from '@/types/chat.ts';

const COLS = 'user_a, user_b, requested_by, status, created_at, responded_at';

const currentUserId = async (): Promise<string> => {
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id;
    if (!id) throw new Error('未登录。');
    return id;
};

const pairOf = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

// All my friendships, both pending and accepted (RLS scopes to mine).
export const listFriendships = async (): Promise<FriendshipRow[]> => {
    const { data, error } = await supabase.from('friendships').select(COLS);
    if (error) throw error;
    return (data ?? []) as FriendshipRow[];
};

// Send a friend request by email (the only add entry while there's no user
// directory). Resolves the email server-side — clients can't read auth.users.
export const sendFriendRequest = async (email: string): Promise<string> => {
    const me = await currentUserId();
    const { data, error } = await supabase.rpc('find_profile_by_email', { p_email: email });
    if (error) throw error;
    const other = (data as { id: string; display_name: string }[] | null)?.[0];
    if (!other) throw new Error('没有找到这个邮箱的用户');
    if (other.id === me) throw new Error('这是你自己的邮箱呀');
    const [a, b] = pairOf(me, other.id);
    const { error: e2 } = await supabase.from('friendships').insert({ user_a: a, user_b: b, requested_by: me });
    if (e2) throw e2.code === '23505' ? new Error('已经是好友，或申请已在路上') : e2;
    return other.display_name;
};

// Accept a pending request from otherId (the guard trigger rejects the
// requester accepting their own).
export const acceptFriend = async (otherId: string): Promise<void> => {
    const me = await currentUserId();
    const [a, b] = pairOf(me, otherId);
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('user_a', a).eq('user_b', b);
    if (error) throw error;
};

// Decline / cancel / unfriend — all end the row. The DM channel (history)
// stays; it just disappears from lists until the pair befriends again.
export const removeFriendship = async (otherId: string): Promise<void> => {
    const me = await currentUserId();
    const [a, b] = pairOf(me, otherId);
    const { error } = await supabase.from('friendships').delete().eq('user_a', a).eq('user_b', b);
    if (error) throw error;
};
