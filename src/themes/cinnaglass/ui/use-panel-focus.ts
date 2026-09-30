// Focus for non-modal panels (phone sheets, desktop docks): keyboard users land
// in the panel when it opens, touch users keep their place, and focus goes back
// to the opener when it closes — unless the reader has moved on to something else.
import { useEffect, type RefObject } from 'react';

export function usePanelFocus(open: boolean, ref: RefObject<HTMLElement | null>) {
    useEffect(() => {
        if (!open) return;
        const opener = document.activeElement;
        const el = ref.current;
        if (matchMedia('(pointer: fine)').matches) el?.focus({ preventScroll: true });
        return () => {
            if (
                opener instanceof HTMLElement &&
                opener.isConnected &&
                (document.activeElement === document.body || el?.contains(document.activeElement))
            )
                opener.focus({ preventScroll: true });
        };
    }, [open, ref]);
}
