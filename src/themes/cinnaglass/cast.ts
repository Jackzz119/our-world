// cast.ts — who is who on this device: the viewer (their own sleeves in front,
// their avatar on their messages) and the partner across the table. The first
// iteration was her view; 2026-09-29 briefly his view, and since 2026-09-30 her
// view again, with 阿屿 across the table (user direction). `?as=ayu` or `?as=xiaoman` picks the viewer for this
// page, until accounts carry an avatar (ai/features/study-room/study-room.md ST-9).

import type { AvatarId } from '@/themes/cinnaglass/room/room-types';

const DEFAULT_VIEWER: AvatarId = 'xiaoman';
const asked = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('as');

export const VIEWER: AvatarId = asked === 'xiaoman' || asked === 'ayu' ? asked : DEFAULT_VIEWER;
export const PARTNER: AvatarId = VIEWER === 'ayu' ? 'xiaoman' : 'ayu';

/** Round portrait for chat and memory cards (public/avatars). */
export const avatarSrc = (id: AvatarId) => `/avatars/${id}.webp`;

/** Paper-medallion portrait drawn to sit inside the diary book (public/ui/journal). */
export const journalAvatarSrc = (id: AvatarId) => `/ui/journal/avatar-${id}.webp`;

/**
 * A profile's own avatar, or `who`'s portrait when it has none. Stored paths
 * under /avatars/ are the old built-in defaults (the retired puppy files), so
 * they resolve to the current portrait too instead of a missing image.
 */
export const profileAvatar = (url: string | null | undefined, who: AvatarId) =>
    url && !url.startsWith('/avatars/') ? url : avatarSrc(who);
