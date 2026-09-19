// usePersistedState.ts — useState plus a write-back to localStorage on every
// change. Replaces the four near-identical mirror effects WorldPage used to
// carry (shell-structure-review.md §2.2 S7).
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { saveJson } from '@/lib/local-store';

// Reading is the caller's job: the stored slices disagree on what a partial
// blob means (dates/alarms replace the seed wholesale, the profile merges over
// its defaults), so `initial` takes whichever loader that slice needs. Writing
// is uniform and best-effort — a blocked or full store just loses persistence,
// never the session.
export function usePersistedState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(initial);
    useEffect(() => {
        saveJson(key, value);
    }, [key, value]);
    return [value, setValue];
}
