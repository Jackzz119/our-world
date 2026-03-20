export type PostPrivacy = 'shared' | 'locked' | 'private';

export type FeedProfile = {
    id: string;
    display_name: string;
    avatar_url: string;
};

export type FeedPost = {
    post_id: string;
    couple_id: string;
    author_id: string;
    author: FeedProfile;
    privacy: PostPrivacy;
    created_at: string;
    unlock_cost: number;
    is_unlocked: boolean;
    is_placeholder: boolean;
    visible_content: string | null;
    visible_images: string[];
};

export type CoupleMeta = {
    couple_id: string;
    user1: FeedProfile;
    user2: FeedProfile;
    intimacy_points: number;
    created_at: string;
};

export type CoupleFeedResponse = {
    couple: CoupleMeta;
    current_user_id: string;
    posts: FeedPost[];
};
