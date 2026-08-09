// chat.ts — data access for channel chat (chat.md CH-12 / CH-17).
// Delivery model is Broadcast from Database: clients only write rows
// (messages / message_reactions / channel_reads); DB triggers fan every
// change out to the private realtime topic `world:{world_id}` (subscription
// authorized by RLS on realtime.messages). The DB is the single write path —
// clients never broadcast directly, and the sender's own change comes back
// through the same echo.
import { supabase } from '@/lib/supabase.ts';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Channel, ChannelReadRow, ChatMessageRow, ReactionRow, WorldEvent } from '@/types/chat.ts';

const CHANNEL_COLS = 'id, world_id, type, name, topic, scene_id, position, dm_user_a, dm_user_b';
const MESSAGE_COLS = 'id, channel_id, world_id, author_id, content, created_at, edited_at, kind, emote_id';
const REACTION_COLS = 'message_id, user_id, world_id, emoji, created_at';
const READ_COLS = 'channel_id, user_id, world_id, last_read_at';

const currentUserId = async (): Promise<string> => {
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id;
    if (!id) throw new Error('未登录。');
    return id;
};

// All channels of a world in sidebar order (RLS: members only).
export const getChannels = async (worldId: string): Promise<Channel[]> => {
    const { data, error } = await supabase.from('channels').select(CHANNEL_COLS).eq('world_id', worldId).order('position');
    if (error) throw error;
    return (data ?? []) as Channel[];
};

// My DM conversations (RLS scopes to channels where I'm a participant).
export const getDmChannels = async (): Promise<Channel[]> => {
    const { data, error } = await supabase.from('channels').select(CHANNEL_COLS).eq('type', 'dm');
    if (error) throw error;
    return (data ?? []) as Channel[];
};

export type MessagePage = {
    // Exclusive cursor: only messages strictly older than this created_at.
    before?: string | null;
    limit?: number;
};

export const MESSAGE_PAGE_SIZE = 50;

// A channel's latest messages (or the page before the cursor), returned
// oldest→newest so callers can render/prepend directly.
export const getMessages = async (channelId: string, page: MessagePage = {}): Promise<ChatMessageRow[]> => {
    let q = supabase
        .from('messages')
        .select(MESSAGE_COLS)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(page.limit ?? MESSAGE_PAGE_SIZE);
    if (page.before) q = q.lt('created_at', page.before);
    const { data, error } = await q;
    if (error) throw error;
    return ((data ?? []) as ChatMessageRow[]).reverse();
};

// Say something in a channel as the current user. The INSERT is the whole
// send — rendering happens when the broadcast echoes back. `id` is generated
// client-side so the optimistic bubble and the echo are the same message.
export const sendMessage = async (channelId: string, content: string, id: string): Promise<void> => {
    const authorId = await currentUserId();
    const { error } = await supabase.from('messages').insert({ id, channel_id: channelId, author_id: authorId, content });
    if (error) throw error;
};

// Send a sticker: same pipeline, kind='sticker' + the emote reference;
// content carries the :name: fallback (dock line / tombstone).
export const sendSticker = async (channelId: string, emoteId: string, emoteName: string, id: string): Promise<void> => {
    const authorId = await currentUserId();
    const { error } = await supabase
        .from('messages')
        .insert({ id, channel_id: channelId, author_id: authorId, content: `:${emoteName}:`, kind: 'sticker', emote_id: emoteId });
    if (error) throw error;
};

// Edit own message; the guard trigger stamps edited_at server-side.
export const updateMessage = async (id: string, content: string): Promise<void> => {
    const { error } = await supabase.from('messages').update({ content }).eq('id', id);
    if (error) throw error;
};

// Delete own message (both ends learn via the DELETE broadcast).
export const deleteMessage = async (id: string): Promise<void> => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) throw error;
};

export const addReaction = async (messageId: string, emoji: string): Promise<void> => {
    const userId = await currentUserId();
    const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
    if (error) throw error;
};

export const removeReaction = async (messageId: string, emoji: string): Promise<void> => {
    const userId = await currentUserId();
    const { error } = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji);
    if (error) throw error;
};

// Reactions for a batch of messages (initial load / pagination merge).
export const getReactions = async (messageIds: string[]): Promise<ReactionRow[]> => {
    if (!messageIds.length) return [];
    const { data, error } = await supabase.from('message_reactions').select(REACTION_COLS).in('message_id', messageIds);
    if (error) throw error;
    return (data ?? []) as ReactionRow[];
};

// Move own read cursor of a channel to now (guard keeps it monotonic).
export const markChannelRead = async (channelId: string): Promise<void> => {
    const userId = await currentUserId();
    const { error } = await supabase
        .from('channel_reads')
        .upsert({ channel_id: channelId, user_id: userId, last_read_at: new Date().toISOString() }, { onConflict: 'channel_id,user_id' });
    if (error) throw error;
};

// Everyone's read cursors in a world.
export const getChannelReads = async (worldId: string): Promise<ChannelReadRow[]> => {
    const { data, error } = await supabase.from('channel_reads').select(READ_COLS).eq('world_id', worldId);
    if (error) throw error;
    return (data ?? []) as ChannelReadRow[];
};

// Read cursors of specific channels (DM conversations have no world).
export const getReadsForChannels = async (channelIds: string[]): Promise<ChannelReadRow[]> => {
    if (!channelIds.length) return [];
    const { data, error } = await supabase.from('channel_reads').select(READ_COLS).in('channel_id', channelIds);
    if (error) throw error;
    return (data ?? []) as ChannelReadRow[];
};

// Subscribe to one broadcast topic. onEvent fires for every change, our own
// included. onStatus reports the subscription lifecycle ('SUBSCRIBED' |
// 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') so the caller can refetch after
// a reconnect. Returns the unsubscribe function.
const subscribeTopic = (topic: string, onEvent: (ev: WorldEvent) => void, onStatus?: (status: string) => void): (() => void) => {
    let disposed = false;
    let ch: RealtimeChannel | null = null;
    const handle = (operation: WorldEvent['operation']) => (msg: { payload?: unknown }) => {
        const p = msg.payload as { table?: string; record?: unknown; old_record?: unknown } | undefined;
        if (!p?.table) return;
        onEvent({ table: p.table, operation, record: p.record ?? null, old_record: p.old_record ?? null } as WorldEvent);
    };
    // private channels authorize with the user token — joining before setAuth
    // resolves gets denied once and only self-heals on the retry, so wait
    void supabase.realtime.setAuth().then(() => {
        if (disposed) return;
        ch = supabase
            .channel(topic, { config: { private: true } })
            .on('broadcast', { event: 'INSERT' }, handle('INSERT'))
            .on('broadcast', { event: 'UPDATE' }, handle('UPDATE'))
            .on('broadcast', { event: 'DELETE' }, handle('DELETE'))
            .subscribe((status) => onStatus?.(status));
    });
    return () => {
        disposed = true;
        if (ch) void supabase.removeChannel(ch);
    };
};

// world topic: the world's channel messages / reactions / read cursors
export const subscribeWorld = (worldId: string, onEvent: (ev: WorldEvent) => void, onStatus?: (status: string) => void) =>
    subscribeTopic(`world:${worldId}`, onEvent, onStatus);

// account topic: all my DM traffic + friendship changes (DM 是账号级)
export const subscribeUser = (userId: string, onEvent: (ev: WorldEvent) => void, onStatus?: (status: string) => void) =>
    subscribeTopic(`user:${userId}`, onEvent, onStatus);
