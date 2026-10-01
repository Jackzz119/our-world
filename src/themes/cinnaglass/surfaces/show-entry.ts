// show-entry.ts — bring a journal entry ([data-post-id]) to the middle of its scroller and let its
// edge glow once; shared by every journal view (memory-views.ts) for jumps from the calendar index,
// the photo wall and the lightbox.
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';

// False when the entry is not loaded.
export function showEntry(scroll: HTMLElement, postId: string): boolean {
    const entry = scroll.querySelector<HTMLElement>(`[data-post-id="${CSS.escape(postId)}"]`);
    if (!entry) return false;
    const reduced = motionReduced();
    const top = entry.offsetTop - (scroll.clientHeight - entry.offsetHeight) / 2;
    scroll.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
    entry.animate(
        [
            { boxShadow: '0 0 0 0 rgb(241 209 154 / 0)' },
            { boxShadow: '0 0 0 4px rgb(241 209 154 / 0.85)', offset: 0.35 },
            { boxShadow: '0 0 0 0 rgb(241 209 154 / 0)' }
        ],
        { duration: reduced ? 900 : 1300, delay: reduced ? 0 : 320, easing: 'ease-out' }
    );
    return true;
}
