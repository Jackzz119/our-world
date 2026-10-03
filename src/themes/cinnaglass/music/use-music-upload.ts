// use-music-upload.ts — the upload panel's state: files the listener picked become drafts (read on
// this device: format, tags, cover, lyrics, CUE), then upload one after another into the world's
// library. The parsers and the encoder load only when the panel is used.
// Feature doc: ai/features/music/music.md §上传与入库, details in ai/features/music/impl.md §上传.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Logman } from '@/lib/logman';
import type { DraftStatus, IngestDraft } from '@/lib/music/ingest';
import type { PickedFile } from '@/lib/music/ingest-plan';
import type { CopyFormat } from '@/lib/music/transcode';
import type { MusicBackend, MusicVisibility } from '@/types/music';

const TAG = '[music][web][use-music-upload]';

export type IgnoredFile = { name: string; reason: string };

// Statuses that are finished one way or another (no more work for this draft).
export const SETTLED: DraftStatus[] = ['done', 'duplicate', 'taken', 'failed'];

export function useMusicUpload(worldId: string | null, backend: MusicBackend | null, onIngested: () => void) {
    const [drafts, setDrafts] = useState<IngestDraft[]>([]);
    const [ignored, setIgnored] = useState<IgnoredFile[]>([]);
    const [visibility, setVisibility] = useState<MusicVisibility>('world');
    const [running, setRunning] = useState(false);
    const [reading, setReading] = useState(0);
    const [copyFormat, setCopyFormat] = useState<CopyFormat | null | undefined>(undefined);
    const abort = useRef<AbortController | null>(null);
    const draftsRef = useRef<IngestDraft[]>([]);

    useEffect(() => {
        draftsRef.current = drafts;
    }, [drafts]);

    const patch = useCallback((key: string, change: Partial<IngestDraft>) => {
        setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...change } : d)));
    }, []);

    // Can this device make compact copies? Asked once, when the panel first needs it.
    const probeCopies = useCallback(async () => {
        if (copyFormat !== undefined) return copyFormat;
        try {
            const { pickCopyFormat } = await import('@/lib/music/transcode');
            const format = await pickCopyFormat();
            setCopyFormat(format);
            return format;
        } catch {
            setCopyFormat(null);
            return null;
        }
    }, [copyFormat]);

    // Read the picked files into drafts (in order; a phone stays responsive with one at a time).
    const add = useCallback(
        async (files: PickedFile[]) => {
            if (!files.length) return;
            void probeCopies();
            const [{ planIngest }, { analyzeItem }] = await Promise.all([
                import('@/lib/music/ingest-plan'),
                import('@/lib/music/ingest')
            ]);
            const plan = await planIngest(files);
            setIgnored((list) => [...list, ...plan.ignored.map((i) => ({ name: i.file.file.name, reason: i.reason }))]);
            const known = new Set(draftsRef.current.map((d) => d.key));
            const fresh = plan.items.filter((item) => !known.has(item.key));
            setDrafts((list) => [
                ...list,
                ...fresh.map(
                    (item): IngestDraft => ({
                        key: item.key,
                        item,
                        status: 'analyzing',
                        progress: 0,
                        error: null,
                        note: null,
                        sha256: null,
                        parsed: null,
                        sniff: null,
                        formatLabel: '',
                        badge: null,
                        playableHere: false,
                        title: item.audio.file.name.replace(/\.[^.]+$/, ''),
                        artists: [],
                        album: '',
                        albumArtist: '',
                        year: null,
                        lyrics: [],
                        cover: null,
                        slices: null,
                        trackIds: []
                    })
                )
            ]);
            setReading((n) => n + fresh.length);
            for (const item of fresh) {
                const draft = await analyzeItem(item, (f) => patch(item.key, { progress: f }));
                setDrafts((list) => list.map((d) => (d.key === item.key ? { ...draft, status: draft.status } : d)));
                setReading((n) => n - 1);
            }
        },
        [patch, probeCopies]
    );

    // Upload every ready draft, one after another. Stops at the first cancel.
    const start = useCallback(async () => {
        if (!backend || !worldId || running) return;
        const { uploadDraft } = await import('@/lib/music/ingest');
        const format = await probeCopies();
        const controller = new AbortController();
        abort.current = controller;
        setRunning(true);
        try {
            for (const draft of draftsRef.current) {
                if (draft.status !== 'ready' && draft.status !== 'unsupported' && draft.status !== 'failed') continue;
                if (draft.status === 'failed' && !draft.sha256) continue;
                if (controller.signal.aborted) break;
                patch(draft.key, { status: 'uploading', progress: 0, error: null });
                try {
                    const ids = await uploadDraft(draft, {
                        backend,
                        worldId,
                        visibility,
                        copyFormat: format,
                        signal: controller.signal,
                        onPhase: (status, progress, note) =>
                            patch(draft.key, note ? { status, progress, note } : { status, progress })
                    });
                    patch(draft.key, { trackIds: ids });
                    if (ids.length) onIngested();
                } catch (e) {
                    if ((e as Error).name === 'AbortError') {
                        patch(draft.key, { status: 'ready', progress: 0, note: '已暂停，可以继续上传' });
                        break;
                    }
                    const message = e instanceof Error ? e.message : '上传失败。';
                    Logman.warn(TAG, `上传失败：${draft.item.audio.file.name}：${message}`);
                    patch(draft.key, { status: 'failed', error: message });
                }
            }
        } finally {
            setRunning(false);
            abort.current = null;
        }
    }, [backend, worldId, running, visibility, patch, onIngested, probeCopies]);

    return {
        drafts,
        ignored,
        reading,
        running,
        visibility,
        setVisibility,
        copyFormat,
        add,
        start,
        cancel: () => abort.current?.abort(),
        edit: (key: string, change: Pick<Partial<IngestDraft>, 'title' | 'artists' | 'album'>) => patch(key, change),
        remove: (key: string) => setDrafts((list) => list.filter((d) => d.key !== key)),
        clearSettled: () => {
            setDrafts((list) => list.filter((d) => !SETTLED.includes(d.status) || d.status === 'failed'));
            setIgnored([]);
        }
    };
}
export type MusicUpload = ReturnType<typeof useMusicUpload>;
