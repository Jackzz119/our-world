// author-tone.ts — who wrote this, in colour. hashOf is the stable string hash
// behind every "looks random but never changes" pick; avaGrad is the avatar
// tint and toneOf the identity ring. Moved out of screens.tsx verbatim.
import type { World } from '@/types/feed.ts';

// Stable per-author avatar tint: same person, same gradient, any session.
const AVA_GRADS = [
    'linear-gradient(135deg,#BFE6FA,#6FBCE8)',
    'linear-gradient(135deg,#F8C8D6,#EF9DB4)',
    'linear-gradient(135deg,#FBE6A8,#F1C75A)',
    'linear-gradient(135deg,#C9E8C2,#86C99A)',
    'linear-gradient(135deg,#D9CBF2,#B39DE0)'
];
// Stable 32-bit string hash. Used for anything that must look random but stay
// identical across sessions: avatar tint, guest tone, photo tilt.
export const hashOf = (id: string): number => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h;
};
// Pick this author's avatar gradient. Same id, same gradient, forever.
export const avaGrad = (id: string): string => AVA_GRADS[hashOf(id) % AVA_GRADS.length];

// Identity color system: position carries time, color carries authorship.
// The diary uses a ring and author name, never a colored card edge.
// Me = theme accent (self first), the world's other member = the pink
// pairing, any future author = a stable hash pick from the theme palette.
export type AuthorTone = { ring: string; deep: string };
const MINE_TONE: AuthorTone = { ring: 'var(--accent)', deep: 'var(--accent-deep)' };
const PARTNER_TONE: AuthorTone = { ring: 'rgba(239,157,180,.85)', deep: '#D97A96' };
const GUEST_TONES: AuthorTone[] = [
    { ring: 'rgba(241,199,90,.85)', deep: '#B98A2E' },
    { ring: 'rgba(134,201,154,.85)', deep: '#5FA878' },
    { ring: 'rgba(179,157,224,.85)', deep: '#8E76C8' },
    { ring: 'rgba(111,188,232,.85)', deep: '#2F9AD3' }
];
// Me → accent, the world's other member → the pink pairing, anyone else →
// a stable hash pick. Never falls back to position.
export const toneOf = (authorId: string, currentUserId: string | null, world: World | null): AuthorTone => {
    if (currentUserId && authorId === currentUserId) return MINE_TONE;
    if (world && (authorId === world.owner_id || authorId === world.member_id)) return PARTNER_TONE;
    return GUEST_TONES[hashOf(authorId) % GUEST_TONES.length];
};
