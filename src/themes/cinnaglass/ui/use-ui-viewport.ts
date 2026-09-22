// Publish the visible viewport for A/B UI only; scene rendering and journal geometry stay untouched.
import { useEffect } from 'react';
import '@/themes/cinnaglass/ui/mobile-layout.css';

// Coalesce browser chrome/keyboard events; pinch zoom keeps native browser panning instead of relayout.
export function useUiViewport() {
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;
        const root = document.documentElement;
        let frame = 0;
        const update = () => {
            frame = 0;
            const zoomed = Math.abs(viewport.scale - 1) > 0.05;
            const inset = zoomed ? 0 : Math.max(0, innerHeight - viewport.height - viewport.offsetTop);
            const active = document.activeElement;
            const editing =
                active instanceof HTMLElement &&
                active.matches('input:not([type="range"]), textarea, [contenteditable="true"]');
            root.style.setProperty('--ui-visible-height', zoomed ? '100dvh' : `${viewport.height}px`);
            root.style.setProperty('--ui-visible-top', zoomed ? '0px' : `${viewport.offsetTop}px`);
            root.style.setProperty('--ui-keyboard-inset', `${inset}px`);
            root.dataset.uiKeyboard = String(editing && inset > 120);
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        viewport.addEventListener('resize', schedule);
        viewport.addEventListener('scroll', schedule);
        window.addEventListener('resize', schedule);
        document.addEventListener('focusin', schedule);
        document.addEventListener('focusout', schedule);
        return () => {
            cancelAnimationFrame(frame);
            viewport.removeEventListener('resize', schedule);
            viewport.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            document.removeEventListener('focusin', schedule);
            document.removeEventListener('focusout', schedule);
            for (const name of ['--ui-visible-height', '--ui-visible-top', '--ui-keyboard-inset'])
                root.style.removeProperty(name);
            delete root.dataset.uiKeyboard;
        };
    }, []);
}
