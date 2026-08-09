// chat.ts — chat backend types (DB `channels` + `messages` +
// `message_reactions` + `channel_reads`, see ai/Features/chat.md +
// ai/Features/channel.md).

// Single-table variant model: a room is a voice channel bound to a scene
// (scene_id non-null), a plain voice channel has none, text is text; a DM
// conversation is a channel owned by an account pair instead of a world
// (world_id null, dm_user_a < dm_user_b canonical order).
export type ChannelType = 'text' | 'voice' | 'room' | 'dm';

export type Channel = {
    id: string;
    world_id: string | null;
    type: ChannelType;
    name: string;
    topic: string | null;
    scene_id: string | null;
    position: number;
    dm_user_a: string | null;
    dm_user_b: string | null;
};

// One friendship row: canonical pair (user_a < user_b) + who asked.
export type FriendshipRow = {
    user_a: string;
    user_b: string;
    requested_by: string;
    status: 'pending' | 'accepted';
    created_at: string;
    responded_at: string | null;
};

// Raw `messages` row — also the `record` inside the broadcast payload.
// world_id null = DM message (fans out to both accounts' user topics).
// kind 'sticker': emote_id points into world_emotes (null = emote was
// removed → render tombstone), content carries the :name: fallback text.
export type ChatMessageRow = {
    id: string;
    channel_id: string;
    world_id: string | null;
    author_id: string;
    content: string;
    created_at: string;
    edited_at: string | null;
    kind: 'text' | 'sticker';
    emote_id: string | null;
};

// One entry of a world's shared emote (sticker) library.
export type EmoteRow = {
    id: string;
    world_id: string;
    name: string; // :name: alias, unique per world
    storage_path: string; // memories bucket, <worldId>/emotes/<uuid>.<ext>
    source_url: string | null;
    added_by: string;
    created_at: string;
};

// Tenor search result (via the `emotes` edge function).
export type EmoteSearchResult = { id: string; preview: string | null; url: string; title: string };

// Raw `message_reactions` row (PK message_id+user_id+emoji).
export type ReactionRow = {
    message_id: string;
    user_id: string;
    world_id: string | null;
    channel_id: string;
    emoji: string;
    created_at: string;
};

// Raw `channel_reads` row — one read cursor per user per channel.
export type ChannelReadRow = {
    channel_id: string;
    user_id: string;
    world_id: string | null;
    last_read_at: string;
};

// One event from a broadcast topic (world:{id} for world channels,
// user:{uid} for DM traffic + friendship changes). All tables fan out through
// the same trigger family; subscribers split on `table`.
export type WorldEvent =
    | { table: 'messages'; operation: 'INSERT' | 'UPDATE'; record: ChatMessageRow; old_record: ChatMessageRow | null }
    | { table: 'messages'; operation: 'DELETE'; record: null; old_record: ChatMessageRow }
    | { table: 'message_reactions'; operation: 'INSERT'; record: ReactionRow; old_record: null }
    | { table: 'message_reactions'; operation: 'DELETE'; record: null; old_record: ReactionRow }
    | { table: 'channel_reads'; operation: 'INSERT' | 'UPDATE'; record: ChannelReadRow; old_record: ChannelReadRow | null }
    | { table: 'friendships'; operation: 'INSERT' | 'UPDATE' | 'DELETE'; record: FriendshipRow | null; old_record: FriendshipRow | null }
    | { table: 'world_emotes'; operation: 'INSERT' | 'UPDATE' | 'DELETE'; record: EmoteRow | null; old_record: EmoteRow | null };
