// A tiny store for the room's load share (0–1): RoomScene writes, the entry
// loader reads (useSyncExternalStore). Keeping it outside React state means the
// frequent asset ticks re-render only the loader, never the whole world page.
export type LoadProgress = {
    get: () => number;
    set: (fraction: number) => void;
    reset: () => void;
    subscribe: (listener: () => void) => () => void;
};

// Progress never runs backwards and only publishes steps of at least 1%.
export function createLoadProgress(): LoadProgress {
    let value = 0;
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((listener) => listener());
    return {
        get: () => value,
        set: (fraction) => {
            const next = Math.max(0, Math.min(1, fraction));
            if (next < value || (next - value < 0.01 && next < 1)) return;
            value = next;
            emit();
        },
        reset: () => {
            value = 0;
            emit();
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
}
