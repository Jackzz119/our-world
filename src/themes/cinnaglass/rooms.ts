// rooms.ts — early mock data for the in-world room list + its icon map.
// Terminology (see the database section of ai/PROJECT.md): rooms = scene-bound
// voice channels inside the world; VOICE_DEFAULT below = pure voice channels
// with no scene attached.
import type { ReactNode } from 'react';
import type { IcoProps } from './icons';
import { IBed, IBook, ILeaf, ISofa } from './icons';
import type { Room } from './model';

// The starter set of in-world rooms shown before any are stored.
export const ROOMS_DEFAULT: Room[] = [
    { id: 'living', name: '客厅', icon: 'sofa', mood: 'twilight', note: '窝在沙发上，谁也不想动' },
    { id: 'bedroom', name: '卧室', icon: 'bed', mood: 'night', note: '灯关了，说点悄悄话' },
    { id: 'balcony', name: '阳台', icon: 'leaf', mood: 'golden', note: '看日落，吹吹风' },
    { id: 'studio', name: '书房', icon: 'book', mood: 'twilight', note: '各做各的，但在一起' }
];

// Room icon key to the component that draws it.
export const ROOM_ICONS: Record<string, (p: IcoProps) => ReactNode> = {
    sofa: ISofa,
    bed: IBed,
    leaf: ILeaf,
    book: IBook
};

// Voice-only channels: no scene behind them, just a place to talk.
export const VOICE_DEFAULT = [
    { id: 'music', name: '一起听歌' },
    { id: 'call', name: '煲电话粥' }
];
