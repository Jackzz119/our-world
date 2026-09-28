// cast.ts — who is who on this device: the viewer (their own sleeves in front,
// their avatar on their messages) and the partner across the table. First
// iteration is her view (user direction 2026-09-27); choosing it per account
// comes with his view (ai/features/study-room/study-room.md ST-9).

import type { AvatarId } from '@/themes/cinnaglass/room/room-types';

export const VIEWER: AvatarId = 'xiaoman';
export const PARTNER: AvatarId = 'ayu';

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
