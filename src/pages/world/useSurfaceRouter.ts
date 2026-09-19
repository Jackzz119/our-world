// useSurfaceRouter.ts — which surface is on screen, and the two entry channels
// that open one: the rail and the room's furniture hotspots
// (ai/design_system/props.md, ai/design_system/uiux/uiux.md). Split out of
// WorldPage (shell-structure-review.md §2.2 S4).
import { useState } from 'react';
import type { SurfaceOrigin, TabKey } from '@/themes/cinnaglass/screens';
import type { RailKey } from '@/themes/cinnaglass/shell/rail';
import type { HotspotOpenEvent } from '@/themes/cinnaglass/room/room-types';

// The three surfaces SubScreen owns; every other screen key maps to its own modal.
const MODAL_TABS: TabKey[] = ['timeline', 'photos', 'wishlist'];

type SurfaceRouterOptions = {
    /** Candidate screen key for the first render (?surface=<tab>); honoured
     *  only when it names a SubScreen tab, ignored otherwise. */
    initialScreen: string | null;
    /** The chat card and the music player are not surfaces — they keep their
     *  own open flags in WorldPage, so the rail/hotspot routes call back out. */
    onOpenChat: () => void;
    onOpenMusic: () => void;
};

export function useSurfaceRouter({ initialScreen, onOpenChat, onOpenMusic }: SurfaceRouterOptions) {
    const [screen, setScreen] = useState<string | null>(() =>
        initialScreen && MODAL_TABS.includes(initialScreen as TabKey) ? initialScreen : null
    );
    const [surfaceOrigin, setSurfaceOrigin] = useState<SurfaceOrigin | null>(null);

    // Open a surface. SubScreen tabs additionally record where the click came
    // from, so the modal can grow out of that point; other screens ignore origin.
    const open = (k: string, origin?: SurfaceOrigin) => {
        if (MODAL_TABS.includes(k as TabKey))
            setSurfaceOrigin(origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2, source: 'keyboard' });
        setScreen(k);
    };
    const close = () => setScreen(null);

    // rail actions → surfaces (both entry channels open the same surface)
    const onRail = (k: RailKey, origin: { x: number; y: number; source: 'rail' }) => {
        if (k === 'chat') onOpenChat();
        else if (k === 'photos') open('photos', origin);
        else if (k === 'calendar') open('calendar');
        else if (k === 'music') onOpenMusic();
        else if (k === 'settings') open('settings');
    };
    // furniture hotspots → the very same surfaces
    const onHotspot = ({ id, clientX, clientY }: HotspotOpenEvent) => {
        if (id === 'timeline' || id === 'photos' || id === 'wishlist')
            open(id, { x: clientX, y: clientY, source: 'object' });
        else if (id === 'clock') open('clock');
        else if (id === 'music') onOpenMusic();
    };

    return {
        screen,
        /** `screen` when it is one of SubScreen's own tabs, null otherwise */
        tab: MODAL_TABS.includes(screen as TabKey) ? (screen as TabKey) : null,
        surfaceOrigin,
        open,
        close,
        onRail,
        onHotspot
    };
}
