// upload.ts — resumable uploads into Supabase Storage with the TUS protocol, plus the part layout
// that keeps every stored object under the plan's per-object limit (Free: 50 MB).
// Supabase's TUS endpoint takes chunks of exactly 6 MiB (the last one may be shorter) and keeps an
// unfinished upload for 24 hours; the upload URL is remembered in localStorage so a reload or a
// dropped connection continues where it stopped. An object that already exists answers 409, which
// counts as stored: the database checks the bytes afterwards (music_finish_upload).
// Feature doc: ai/features/music/music.md, details in ai/features/music/impl.md §上传.
import { loadJson, saveJson } from '@/lib/local-store';

export const TUS_CHUNK = 6 * 1024 * 1024;

// The per-object cap the library stores under. Supabase Free refuses objects over 50 MB, so larger
// files (Hi-Res originals, whole-album images, album-length copies) are stored as numbered parts
// of this size; 45 MiB stays clear of the limit whether it means 50 MiB or 50,000,000 bytes.
export const DEFAULT_MAX_OBJECT_BYTES = 45 * 1024 * 1024;

// How a file of `size` bytes is stored: whole (no parts) or in parts of the cap.
export const partLayout = (
    size: number,
    maxObject = DEFAULT_MAX_OBJECT_BYTES
): { partSize: number | null; partCount: number | null } =>
    size <= maxObject
        ? { partSize: null, partCount: null }
        : { partSize: maxObject, partCount: Math.ceil(size / maxObject) };

// The object names behind a logical path: itself, or `<path>/000`, `<path>/001`, ….
export const objectPaths = (path: string, partCount: number | null): string[] =>
    partCount ? Array.from({ length: partCount }, (_, i) => `${path}/${String(i).padStart(3, '0')}`) : [path];

// Base64 of a UTF-8 string, for TUS Upload-Metadata values.
const b64 = (text: string): string => {
    let bin = '';
    for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
    return btoa(bin);
};

// An Error that callers can tell apart from a failed request.
const abortError = (): Error => Object.assign(new Error('上传已取消。'), { name: 'AbortError' });

export type TusTarget = {
    /** the resumable endpoint, e.g. https://<ref>.storage.supabase.co/storage/v1/upload/resumable */
    endpoint: string;
    /** a fresh bearer token for each request (sessions refresh while long uploads run) */
    token: () => Promise<string>;
    /** the project's public API key, sent as `apikey` */
    apiKey: string;
    bucket: string;
};

type Answer = { status: number; header: (name: string) => string | null };

// One HTTP request; XHR rather than fetch because only XHR reports upload progress.
const send = (
    method: string,
    url: string,
    headers: Record<string, string>,
    body: Blob | null,
    signal: AbortSignal | undefined,
    onSent?: (bytes: number) => void
): Promise<Answer> =>
    new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
        if (onSent) xhr.upload.onprogress = (event) => onSent(event.loaded);
        const onAbort = () => xhr.abort();
        signal?.addEventListener('abort', onAbort, { once: true });
        xhr.onload = () => {
            signal?.removeEventListener('abort', onAbort);
            resolve({ status: xhr.status, header: (name) => xhr.getResponseHeader(name) });
        };
        xhr.onerror = () => {
            signal?.removeEventListener('abort', onAbort);
            reject(new Error('网络中断，上传暂停。'));
        };
        xhr.onabort = () => reject(abortError());
        xhr.send(body);
    });

// Wait, unless the upload is cancelled first.
const pause = (ms: number, signal?: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        const id = setTimeout(resolve, ms);
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(id);
                reject(abortError());
            },
            { once: true }
        );
    });

const RESUME_KEY = 'ow-music-tus-v1';
const RETRY_MS = [1000, 3000, 6000, 12000];

type Resume = Record<string, { url: string; at: number }>;

// Upload one object. Resumes a remembered upload of the same object and size, retries transient
// failures with growing pauses, and treats "already exists" (409) as done.
export async function tusUpload(
    target: TusTarget,
    objectName: string,
    blob: Blob,
    options: { contentType: string; onProgress?: (sentBytes: number) => void; signal?: AbortSignal }
): Promise<void> {
    const { signal, onProgress } = options;
    const resumeId = `${target.bucket}/${objectName}:${blob.size}`;
    const remembered = loadJson<Resume>(RESUME_KEY, {});
    const auth = async (): Promise<Record<string, string>> => ({
        authorization: `Bearer ${await target.token()}`,
        apikey: target.apiKey,
        'tus-resumable': '1.0.0'
    });
    const forget = () => {
        const all = loadJson<Resume>(RESUME_KEY, {});
        delete all[resumeId];
        saveJson(RESUME_KEY, all);
    };

    let url: string | null = remembered[resumeId]?.url ?? null;
    let offset = 0;
    if (url) {
        const head = await send('HEAD', url, await auth(), null, signal).catch(() => null);
        const at = head?.header('upload-offset');
        if (head && head.status >= 200 && head.status < 300 && at !== null) offset = Number(at);
        else url = null;
    }
    if (!url) {
        const created = await send(
            'POST',
            target.endpoint,
            {
                ...(await auth()),
                'upload-length': String(blob.size),
                'upload-metadata': [
                    `bucketName ${b64(target.bucket)}`,
                    `objectName ${b64(objectName)}`,
                    `contentType ${b64(options.contentType)}`,
                    `cacheControl ${b64('31536000')}`
                ].join(','),
                'x-upsert': 'false'
            },
            null,
            signal
        );
        if (created.status === 409) return;
        const location = created.header('location');
        if (created.status !== 201 || !location) throw new Error(`没能开始上传（${created.status}）。`);
        url = new URL(location, target.endpoint).toString();
        const all = loadJson<Resume>(RESUME_KEY, {});
        all[resumeId] = { url, at: Date.now() };
        saveJson(RESUME_KEY, all);
    }
    onProgress?.(offset);

    let failures = 0;
    while (offset < blob.size) {
        const end = Math.min(blob.size, offset + TUS_CHUNK);
        try {
            const sent = await send(
                'PATCH',
                url,
                {
                    ...(await auth()),
                    'upload-offset': String(offset),
                    'content-type': 'application/offset+octet-stream'
                },
                blob.slice(offset, end),
                signal,
                (bytes) => onProgress?.(offset + bytes)
            );
            if (sent.status === 409 || sent.status === 412) {
                // our idea of the offset drifted (a retry landed twice): ask the server
                const head = await send('HEAD', url, await auth(), null, signal);
                offset = Number(head.header('upload-offset') ?? offset);
                continue;
            }
            if (sent.status === 404 || sent.status === 410) {
                forget();
                throw Object.assign(new Error('上传已过期，请重新上传。'), { expired: true });
            }
            if (sent.status < 200 || sent.status >= 300) throw new Error(`上传出错（${sent.status}）。`);
            offset = Number(sent.header('upload-offset') ?? end);
            failures = 0;
            onProgress?.(offset);
        } catch (error) {
            if ((error as Error).name === 'AbortError' || (error as { expired?: boolean }).expired) throw error;
            if (failures >= RETRY_MS.length) throw error;
            await pause(RETRY_MS[failures++], signal);
            const head = await send('HEAD', url, await auth(), null, signal).catch(() => null);
            if (head?.header('upload-offset')) offset = Number(head.header('upload-offset'));
        }
    }
    forget();
}

// Drop remembered uploads older than the server keeps them (24 h).
export function pruneTusResume(now = Date.now()): void {
    const all = loadJson<Resume>(RESUME_KEY, {});
    let changed = false;
    for (const [key, entry] of Object.entries(all)) {
        if (now - entry.at > 23 * 60 * 60 * 1000) {
            delete all[key];
            changed = true;
        }
    }
    if (changed) saveJson(RESUME_KEY, all);
}
