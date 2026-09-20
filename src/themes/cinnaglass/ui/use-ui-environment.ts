// Read the approved navigation palette once per environment change, never per scene frame.
import { useEffect, useRef, useState } from 'react';
import type { Mood } from '@/themes/cinnaglass/tweaks';

export function useUiEnvironment(mood: Mood, inWorld: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const host = ref.current;
        const rail = host?.querySelector('.rail-wrap');
        if (!host || !rail) return;
        const palette = getComputedStyle(rail);
        for (const name of ['tint', 'top', 'cold', 'rim']) {
            host.style.setProperty(`--ui-${name}`, palette.getPropertyValue(`--nav-${name}`));
        }
    }, [mood, inWorld]);
    return ref;
}

// Match navigation's compact layout rather than inventing a second breakpoint.
export function useCompactUi() {
    const [compact, setCompact] = useState(() => matchMedia('(max-width: 767px), (max-height: 599px)').matches);
    useEffect(() => {
        const query = matchMedia('(max-width: 767px), (max-height: 599px)');
        const update = () => setCompact(query.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return compact;
}
