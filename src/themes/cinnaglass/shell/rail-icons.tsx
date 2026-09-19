// Navigation silhouettes traced as native paths, retaining currentColor so
// real icon strokes, not rectangular image bounds, receive the warm glow.
import { Ico, type IcoProps } from '@/themes/cinnaglass/icons';

export const RailHome = (p: IcoProps) => (
    <Ico {...p}>
        <path d="m2.2 10.5 9.1-8a1.1 1.1 0 0 1 1.4 0l9.1 8-2 2-1.2-1v9h-4.5v-7H9.9v7H5.4v-9l-1.2 1z" />
    </Ico>
);
export const RailChat = (p: IcoProps) => (
    <Ico {...p}>
        <path d="M20.4 16.8a9.7 9.7 0 0 0 1.1-4.7c0-5.6-4.2-9.6-9.5-9.6S2.5 6.4 2.5 11.8c0 2.1.7 4 1.8 5.4l-1 4.1 4.2-1.8c1.4.7 2.9 1 4.5 1 2.2 0 4-.6 5.6-1.8l4.4 1.7z" />
        <circle cx="7.2" cy="11.7" r=".55" fill="currentColor" stroke="none" />
        <circle cx="12" cy="11.7" r=".55" fill="currentColor" stroke="none" />
        <circle cx="16.8" cy="11.7" r=".55" fill="currentColor" stroke="none" />
    </Ico>
);
export const RailMusic = (p: IcoProps) => (
    <Ico {...p}>
        <path d="M9 18V5.5L21 3v13M9 10l12-2.5" />
        <ellipse cx="5.5" cy="18.5" rx="3.5" ry="2.8" transform="rotate(-16 5.5 18.5)" />
        <ellipse cx="17.5" cy="16.5" rx="3.5" ry="2.8" transform="rotate(-16 17.5 16.5)" />
    </Ico>
);
export const RailTools = (p: IcoProps) => (
    <Ico {...p}>
        <path d="m13.7 3.3 4.1-1.1-3.2 4.2 3 3 4.2-3.2-1.1 4.1a6.3 6.3 0 0 1-7.7 3.4L5 21.5c-.6.6-1.5.6-2.1 0l-.4-.4c-.6-.6-.6-1.5 0-2.1l7.8-8a6.3 6.3 0 0 1 3.4-7.7Z" />
    </Ico>
);
export const RailSettings = (p: IcoProps) => (
    <Ico {...p}>
        <path d="m10 2-.7 2.8-2 .9-2.5-.8-2 3.3 2 2.1v2.9l-2 2.1 2 3.3 2.5-.8 2 .9.7 2.8h4l.7-2.8 2-.9 2.5.8 2-3.3-2-2.1v-2.9l2-2.1-2-3.3-2.5.8-2-.9L14 2z" />
        <circle cx="12" cy="11.8" r="3.5" />
    </Ico>
);
