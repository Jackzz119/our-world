// memory-views.ts — the ways to look at our memories. The memory page (a content page: full screen
// on a phone, a centred window on a desktop) shows one journal view and one photo view; the reader
// switches between them in the page header and the choice is remembered (tweaks.ts journalStyle /
// photoStyle). 2026-10-01 the user asked for every comparison direction as a way to look
// (ai/design_system/codex-visual/memories/memories.md). Every view fills the body it is given,
// scrolls itself, and adapts to a phone with useCompactUi().
import type { FeedStatus, UseFeed } from '@/hooks/useFeed';
import type { MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import type { JournalStyle, PhotoStyle } from '@/themes/cinnaglass/tweaks';

export type { JournalStyle, PhotoStyle };

export type JournalViewProps = {
    feed: UseFeed;
    thumbUrls: Record<string, string>;
    /** the page is open; views stay mounted (hidden) while it is closed */
    open: boolean;
    /** open the shared lightbox on these photos at this index */
    onPhoto: (photos: MemoryPhoto[], index: number) => void;
    /** show this entry (a jump from the photo wall); a fresh object for every request */
    focus: { postId: string } | null;
};

export type PhotoViewProps = {
    /** names, avatars and loading state */
    feed: UseFeed;
    /** every photo, newest first (memory-photos.ts wallPhotos) */
    photos: MemoryPhoto[];
    status: FeedStatus;
    /** some post carries images, even if none is signed yet */
    anyImages: boolean;
    open: boolean;
    /** open the shared lightbox on `photos` at this index */
    onPhoto: (index: number) => void;
    /** sound is playing in the room (the projector says it is showing to the music) */
    musicPlaying?: boolean;
};

export const JOURNAL_VIEWS: { key: JournalStyle; label: string; hint: string }[] = [
    { key: 'scrapbook', label: '手帐', hint: '一页页贴成的长卷' },
    { key: 'calendar', label: '日历', hint: '按日子翻' },
    { key: 'book', label: '书本', hint: '原来那本棕皮书' }
];

export const PHOTO_VIEWS: { key: PhotoStyle; label: string; hint: string }[] = [
    { key: 'polaroid', label: '拍立得', hint: '按月贴成拍立得' },
    { key: 'cork', label: '软木板', hint: '钉在软木板上，可以摆' },
    { key: 'album', label: '相册', hint: '方格相册，按月跳' },
    { key: 'projector', label: '放映', hint: '一张张放给你看' }
];
