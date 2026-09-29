// Keep a closing surface mounted long enough to play its exit (the part CSS
// alone cannot do for React-unmounted nodes). `closing` is the window in which
// the caller renders its exit state (data-state="closing"); low motion shortens it.
import { useEffect, useState } from 'react';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';

export function usePresence(open: boolean, exitMs: number) {
    const [lingering, setLingering] = useState(false);
    const [wasOpen, setWasOpen] = useState(open);
    // adjust during render when `open` flips (react.dev: storing information from previous renders)
    if (open !== wasOpen) {
        setWasOpen(open);
        setLingering(!open);
    }
    useEffect(() => {
        if (!lingering) return;
        const id = window.setTimeout(() => setLingering(false), motionReduced() ? Math.min(exitMs, 110) : exitMs);
        return () => window.clearTimeout(id);
    }, [lingering, exitMs]);
    return { mounted: open || lingering, closing: !open && lingering };
}
