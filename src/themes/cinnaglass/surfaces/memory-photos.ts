// memory-photos.ts — the photos in the loaded feed as flat lists: one post's
// photos (the journal hands those to the lightbox) and every photo newest first
// (what the wall lays out and steps through). Also the shared month label.
import { thumbPathOf } from '@/lib/storage';
import type { FeedPost } from '@/types/feed';

export type MemoryPhoto = {
    /** `${post_id}:${path}` — also marks the thumbnail <img> the lightbox grows out of */
    key: string;
    /** Storage path of the original */
    path: string;
    /** signed thumbnail, once it has arrived */
    thumb?: string;
    post: FeedPost;
};

export function photosOf(post: FeedPost, thumbUrls: Record<string, string>): MemoryPhoto[] {
    return (post.visible_images ?? []).map((path) => ({
        key: `${post.post_id}:${path}`,
        path,
        thumb: thumbUrls[thumbPathOf(path)],
        post
    }));
}

// Every photo, newest post first; a post's own photos keep their order.
export function wallPhotos(posts: FeedPost[], thumbUrls: Record<string, string>): MemoryPhoto[] {
    return [...posts].reverse().flatMap((post) => photosOf(post, thumbUrls));
}

// "9 月" this year, "2025 年 9 月" otherwise — the journal's and the wall's month dividers.
export function monthLabel(iso: string, now = new Date()): string {
    const d = new Date(iso);
    return `${d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()} 年 `}${d.getMonth() + 1} 月`;
}

// Stable key for grouping by month, independent of the label's wording.
export const monthKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}`;
};
