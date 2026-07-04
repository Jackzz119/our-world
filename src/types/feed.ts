export type PostPrivacy = 'shared' | 'locked' | 'private';

export type FeedProfile = {
    id: string;
    display_name: string;
    avatar_url: string;
};

// Shape of the get_feed_posts RPC rows (privacy resolved server-side).
export type FeedPost = {
    post_id: string;
    world_id: string;
    author_id: string;
    privacy: PostPrivacy;
    created_at: string;
    updated_at: string;
    unlock_cost: number;
    is_unlocked: boolean;
    is_placeholder: boolean;
    visible_content: string | null;
    visible_images: string[];
};

// A world (the couple's shared space, DB `worlds`) is owned by one person
// (owner_id, the creator) and may later gain one invited member (member_id,
// null while solo). A solo owner can still post.
export type World = {
    id: string;
    owner_id: string;
    member_id: string | null;
    intimacy_points: number;
    created_at: string | null;
};
