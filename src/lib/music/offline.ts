// offline.ts — audio kept on this device: downloads for offline listening, and whole-album images
// that had to be fetched in full before they could play (files stored in parts on the Free plan).
// IndexedDB rather than the Cache API: it also works on plain-http LAN addresses during phone
// testing, and browsers keep its blobs on disk. Each stored object (or each part of a file stored in
// parts) is one record, so a download never needs the whole file in memory; reading a file back
// stitches its parts into one Blob without copying them.
// Feature doc: ai/features/music/music.md, details in ai/features/music/impl.md §离线.

const DB_NAME = 'ow-music';
const DB_VERSION = 1;
const BLOBS = 'blobs';
const ENTRIES = 'entries';

// Why a file is on this device: the listener downloaded it, or the player needed it whole.
export type OfflineReason = 'download' | 'cache';

export type OfflineEntry = {
    /** logical storage path (rendition path) */
    path: string;
    size: number;
    parts: number;
    reason: OfflineReason;
    savedAt: number;
    /** library tracks that play from this file (CUE slices share one) */
    trackIds: string[];
};

let opening: Promise<IDBDatabase> | null = null;

// Open (once) the database; rejects where IndexedDB is unavailable (some private modes).
const db = (): Promise<IDBDatabase> => {
    if (!opening) {
        opening = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') return reject(new Error('这台设备不能离线保存音乐。'));
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const d = request.result;
                if (!d.objectStoreNames.contains(BLOBS)) d.createObjectStore(BLOBS);
                if (!d.objectStoreNames.contains(ENTRIES)) d.createObjectStore(ENTRIES, { keyPath: 'path' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error('打不开本机音乐存储。'));
        });
        opening.catch(() => {
            opening = null;
        });
    }
    return opening;
};

// Run one request inside a transaction and resolve with its result.
const run = async <T>(store: string, mode: IDBTransactionMode, act: (s: IDBObjectStore) => IDBRequest): Promise<T> => {
    const d = await db();
    return new Promise<T>((resolve, reject) => {
        const tx = d.transaction(store, mode);
        const request = act(tx.objectStore(store));
        tx.oncomplete = () => resolve(request.result as T);
        tx.onerror = () => reject(tx.error ?? new Error('本机音乐存储出错。'));
        tx.onabort = () => reject(tx.error ?? new Error('本机音乐存储空间不够了。'));
    });
};

const partKey = (path: string, index: number) => `${path}#${String(index).padStart(3, '0')}`;

// The stored file as one Blob, or null when it is not (completely) on this device.
export async function readOffline(path: string): Promise<Blob | null> {
    const entry = await run<OfflineEntry | undefined>(ENTRIES, 'readonly', (s) => s.get(path)).catch(() => undefined);
    if (!entry) return null;
    const parts: Blob[] = [];
    for (let i = 0; i < entry.parts; i++) {
        const part = await run<Blob | undefined>(BLOBS, 'readonly', (s) => s.get(partKey(path, i)));
        if (!part) return null;
        parts.push(part);
    }
    return parts.length === 1 ? parts[0] : new Blob(parts, { type: parts[0]?.type });
}

// Every file kept on this device.
export async function listOffline(): Promise<OfflineEntry[]> {
    return run<OfflineEntry[]>(ENTRIES, 'readonly', (s) => s.getAll()).catch(() => []);
}

// Forget a file (all of its parts).
export async function removeOffline(path: string): Promise<void> {
    const entry = await run<OfflineEntry | undefined>(ENTRIES, 'readonly', (s) => s.get(path)).catch(() => undefined);
    for (let i = 0; i < (entry?.parts ?? 1); i++) await run(BLOBS, 'readwrite', (s) => s.delete(partKey(path, i)));
    await run(ENTRIES, 'readwrite', (s) => s.delete(path));
}

// Mark a kept file as the listener's own download (it is then never evicted as a cache).
export async function pinOffline(path: string, trackIds: string[]): Promise<void> {
    const entry = await run<OfflineEntry | undefined>(ENTRIES, 'readonly', (s) => s.get(path));
    if (!entry) return;
    const next: OfflineEntry = {
        ...entry,
        reason: 'download',
        trackIds: [...new Set([...entry.trackIds, ...trackIds])]
    };
    await run(ENTRIES, 'readwrite', (s) => s.put(next));
}

// Ask the browser not to clear our storage under pressure (granted silently on most browsers once
// the site is used a lot or installed to the home screen).
export async function persistOffline(): Promise<boolean> {
    try {
        return (await navigator.storage?.persist?.()) ?? false;
    } catch {
        return false;
    }
}

// How much this site stores and may store, in bytes (null when the browser does not say).
export async function offlineEstimate(): Promise<{ usage: number; quota: number } | null> {
    try {
        const estimate = await navigator.storage?.estimate?.();
        return estimate ? { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 } : null;
    } catch {
        return null;
    }
}

// Fetch one URL into a Blob, reporting bytes as they arrive.
const fetchBlob = async (url: string, onBytes: (n: number) => void, signal?: AbortSignal): Promise<Blob> => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`下载失败（${response.status}）。`);
    if (!response.body) {
        const blob = await response.blob();
        onBytes(blob.size);
        return blob;
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        onBytes(value.byteLength);
    }
    return new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') ?? '' });
};

// Download a file (one URL, or one per part in order) onto this device. Parts already stored by an
// earlier, interrupted download are kept and skipped. Reports progress as a 0..1 fraction of `size`.
export async function saveOffline(
    path: string,
    urls: string[],
    meta: { size: number; reason: OfflineReason; trackIds: string[] },
    onProgress?: (fraction: number) => void,
    signal?: AbortSignal
): Promise<Blob> {
    let received = 0;
    const tick = (n: number) => {
        received += n;
        onProgress?.(meta.size ? Math.min(1, received / meta.size) : 0);
    };
    for (let i = 0; i < urls.length; i++) {
        const existing = await run<Blob | undefined>(BLOBS, 'readonly', (s) => s.get(partKey(path, i))).catch(
            () => undefined
        );
        if (existing) {
            tick(existing.size);
            continue;
        }
        const blob = await fetchBlob(urls[i], tick, signal);
        await run(BLOBS, 'readwrite', (s) => s.put(blob, partKey(path, i)));
    }
    const previous = await run<OfflineEntry | undefined>(ENTRIES, 'readonly', (s) => s.get(path)).catch(
        () => undefined
    );
    const entry: OfflineEntry = {
        path,
        size: meta.size,
        parts: urls.length,
        // a download stays a download even when the player later needs the same file
        reason: previous?.reason === 'download' ? 'download' : meta.reason,
        savedAt: Date.now(),
        trackIds: [...new Set([...(previous?.trackIds ?? []), ...meta.trackIds])]
    };
    await run(ENTRIES, 'readwrite', (s) => s.put(entry));
    const whole = await readOffline(path);
    if (!whole) throw new Error('本机保存失败。');
    if (whole.size !== meta.size) {
        await removeOffline(path);
        throw new Error('下载不完整，请重试。');
    }
    return whole;
}

// Drop files the player cached (never the listener's downloads), oldest first, until at most
// `keepBytes` of cache remain.
export async function trimOfflineCache(keepBytes: number): Promise<void> {
    const cached = (await listOffline()).filter((e) => e.reason === 'cache').sort((a, b) => b.savedAt - a.savedAt);
    let total = 0;
    for (const entry of cached) {
        total += entry.size;
        if (total > keepBytes) await removeOffline(entry.path);
    }
}
