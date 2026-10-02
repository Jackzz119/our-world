// The look (look.ts) as React state, for Settings' 界面风格 row: it follows setLook wherever it is called.
import { useSyncExternalStore } from 'react';
import { currentLook, subscribeLook } from '@/themes/cinnaglass/ui/look';

export function useLook() {
    return useSyncExternalStore(subscribeLook, currentLook);
}
