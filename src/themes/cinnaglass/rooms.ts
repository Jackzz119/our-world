// rooms.ts — shared room data + icon map (used by sidebar, space switcher, App).
import type { ReactNode } from 'react';
import type { IcoProps } from './icons';
import { IBed, IBook, ILeaf, ISofa } from './icons';
import type { Room } from './model';

export const ROOMS_DEFAULT: Room[] = [
    { id: 'living', name: '客厅', icon: 'sofa', mood: 'twilight', note: '窝在沙发上，谁也不想动' },
    { id: 'bedroom', name: '卧室', icon: 'bed', mood: 'night', note: '灯关了，说点悄悄话' },
    { id: 'balcony', name: '阳台', icon: 'leaf', mood: 'golden', note: '看日落，吹吹风' },
    { id: 'studio', name: '书房', icon: 'book', mood: 'twilight', note: '各做各的，但在一起' }
];

export const ROOM_ICONS: Record<string, (p: IcoProps) => ReactNode> = {
    sofa: ISofa,
    bed: IBed,
    leaf: ILeaf,
    book: IBook
};

export const VOICE_DEFAULT = [
    { id: 'music', name: '一起听歌' },
    { id: 'call', name: '煲电话粥' }
];

// shared localStorage loader for the theme's persisted slices
export function owLoad<T>(k: string, fb: T): T {
    try {
        const v = localStorage.getItem(k);
        return v ? (JSON.parse(v) as T) : fb;
    } catch {
        return fb;
    }
}