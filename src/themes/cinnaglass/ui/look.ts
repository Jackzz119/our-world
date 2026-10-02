// look.ts — which glass the UI wears (ui-system.css, 2026-10-01 contrast redesign). The default is
// the deep glass; 描金暗夜 (gilded) and 暖瓷 (porcelain, the light look: look-porcelain.css) are picked in
// Settings (界面风格). ?look=gilded | porcelain | classic (the glass before the redesign, for a review
// only) tries one on any page, and the choice sticks on this device until ?look=default.
const KEY = 'ow-look';
const LOOKS = ['gilded', 'porcelain', 'classic'] as const;
export type Look = (typeof LOOKS)[number];

const isLook = (value: string | null | undefined): value is Look =>
    !!value && (LOOKS as readonly string[]).includes(value);
const listeners = new Set<() => void>();

function show(look: Look | 'default') {
    if (look === 'default') delete document.documentElement.dataset.look;
    else document.documentElement.dataset.look = look;
    listeners.forEach((listener) => listener());
}

// html[data-look] from ?look= or the stored choice, before the first frame (main.tsx, the fixtures).
export function applyLook() {
    const asked = new URLSearchParams(location.search).get('look');
    let stored: string | null = null;
    try {
        if (asked === 'default') localStorage.removeItem(KEY);
        else if (isLook(asked)) localStorage.setItem(KEY, asked);
        stored = localStorage.getItem(KEY);
    } catch {
        // storage blocked: only ?look= applies, for this page
    }
    show(asked === 'default' ? 'default' : isLook(asked) ? asked : isLook(stored) ? stored : 'default');
}

export function currentLook(): Look | 'default' {
    const look = document.documentElement.dataset.look;
    return isLook(look) ? look : 'default';
}

// Settings' choice: on at once, and kept on this device under the same key ?look= writes.
export function setLook(look: Look | 'default') {
    try {
        if (look === 'default') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, look);
    } catch {
        // storage blocked: the look still changes, for this visit
    }
    show(look);
}

// for use-look.ts (useSyncExternalStore)
export function subscribeLook(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
