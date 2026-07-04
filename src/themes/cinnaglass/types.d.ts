// types.d.ts — JSX typing for the <image-slot> custom element (see image-slot.js).

import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type ImageSlotAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
    id?: string;
    shape?: 'rect' | 'rounded' | 'circle' | 'pill';
    radius?: string | number;
    mask?: string;
    fit?: 'cover' | 'contain' | 'fill';
    position?: string;
    placeholder?: string;
    src?: string;
};

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'image-slot': ImageSlotAttributes;
        }
    }
}
