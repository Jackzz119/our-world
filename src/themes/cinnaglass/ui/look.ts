// look.ts — which glass the UI wears (ui-system.css, 2026-10-01 contrast redesign). The default is
// the deep glass; ?look=gilded or ?look=classic (the glass before the redesign) try the others for
// a review, on any page, and the choice sticks on this device until ?look=default.
const KEY = 'ow-look';
const LOOKS = ['gilded', 'classic'] as const;
type Look = (typeof LOOKS)[number];

export function applyLook() {
    let look: string | null = null;
    try {
        const asked = new URLSearchParams(location.search).get('look');
        if (asked === 'default') localStorage.removeItem(KEY);
        else if (asked && (LOOKS as readonly string[]).includes(asked)) localStorage.setItem(KEY, asked);
        look = localStorage.getItem(KEY);
    } catch {
        // storage blocked: the default glass
    }
    if (look && (LOOKS as readonly string[]).includes(look)) document.documentElement.dataset.look = look as Look;
    else delete document.documentElement.dataset.look;
}
