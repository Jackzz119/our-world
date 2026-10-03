// The upload page: pick files or a folder (or drop them on desktop); every song becomes a card that
// says what was found — format, lyrics, cover, CUE slices — and then how its upload goes (读取中 ·
// 待上传 · 上传中 · 入库中 · 生成省流版 · 已入库 · 已有 · 失败). Uploads keep running when the page
// is left; the sheet's close button only hides it. Feature doc: ai/features/music/music.md §上传与入库.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import type { DraftStatus, IngestDraft } from '@/lib/music/ingest';
import type { PickedFile } from '@/lib/music/ingest-plan';
import { formatBytes } from '@/lib/music/quality';
import { IChevron, IClose, IFolder, ITrash, IUpload } from '@/themes/cinnaglass/icons';
import { badgeText } from '@/themes/cinnaglass/music/music-model';
import { SETTLED, type MusicUpload } from '@/themes/cinnaglass/music/use-music-upload';

const ACCEPT =
    'audio/*,.flac,.m4a,.alac,.aac,.mp3,.wav,.aif,.aiff,.aifc,.ogg,.oga,.opus,.webm,.ape,.wv,.dsf,.dff,.tta,.cue,.lrc,.txt,image/*';

const STATUS_TEXT: Record<DraftStatus, string> = {
    analyzing: '读取中',
    ready: '待上传',
    unsupported: '待上传',
    uploading: '上传中',
    processing: '入库中',
    copying: '生成省流版',
    done: '已入库',
    duplicate: '曲库里已有',
    taken: 'TA 已传过',
    failed: '失败'
};

// Every file inside a dropped folder, with its path relative to the drop.
const entryFiles = async (entry: FileSystemEntry): Promise<PickedFile[]> => {
    if (entry.isFile)
        return new Promise((resolve) =>
            (entry as FileSystemFileEntry).file(
                (file) => resolve([{ file, path: entry.fullPath.replace(/^\//, '') }]),
                () => resolve([])
            )
        );
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const all: FileSystemEntry[] = [];
    // readEntries hands out at most ~100 entries per call
    for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])));
        if (!batch.length) break;
        all.push(...batch);
    }
    return (await Promise.all(all.map(entryFiles))).flat();
};

// A blob URL for a draft's cover, released when the card goes away.
function DraftCover({ draft }: { draft: IngestDraft }) {
    const url = useMemo(() => (draft.cover ? URL.createObjectURL(draft.cover.blob) : null), [draft.cover]);
    useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
    return url ? (
        <img className="mp-draft-cover" src={url} alt="" draggable={false} />
    ) : (
        <span className="mp-draft-cover mp-cover-blank" aria-hidden="true">
            ♪
        </span>
    );
}

function DraftCard({ draft, upload }: { draft: IngestDraft; upload: MusicUpload }) {
    const working = ['analyzing', 'uploading', 'processing', 'copying'].includes(draft.status);
    const badge = badgeText(draft.badge);
    const lyrics = draft.lyrics[0];
    const editable = (draft.status === 'ready' || draft.status === 'unsupported') && !upload.running;
    return (
        <li className="mp-draft" data-status={draft.status}>
            <DraftCover draft={draft} />
            <div className="mp-draft-body">
                {editable ? (
                    <input
                        className="mp-draft-title"
                        value={draft.title}
                        aria-label="歌名"
                        onChange={(event) => upload.edit(draft.key, { title: event.target.value })}
                    />
                ) : (
                    <b className="mp-draft-title">{draft.title}</b>
                )}
                <span className="mp-draft-sub">
                    {[draft.artists.join(' / '), draft.album].filter(Boolean).join(' · ') || draft.item.audio.file.name}
                </span>
                {draft.status !== 'analyzing' && (
                    <span className="mp-draft-tags">
                        {draft.formatLabel && (
                            <i className="mp-fmt" data-badge={draft.badge ?? undefined}>
                                {badge ? `${badge} · ` : ''}
                                {draft.formatLabel}
                            </i>
                        )}
                        <i>{lyrics ? `歌词 · ${lyrics.label}${lyrics.synced ? '' : '（不滚动）'}` : '没有歌词'}</i>
                        {draft.cover && <i>封面 · {draft.cover.source === 'folder' ? '图片文件' : '内嵌'}</i>}
                        {draft.slices && <i>CUE 整轨 · {draft.slices.length} 首</i>}
                        <i>{formatBytes(draft.item.audio.file.size)}</i>
                    </span>
                )}
                {(draft.note || draft.error) && (
                    <span className="mp-draft-note" data-error={draft.error ? true : undefined}>
                        {draft.error ?? draft.note}
                    </span>
                )}
                {working && (
                    <span
                        className="mp-prep-bar"
                        style={{ '--p': `${Math.round(draft.progress * 100)}%` } as CSSProperties}
                        aria-hidden="true"
                    >
                        <span />
                    </span>
                )}
            </div>
            <span className="mp-draft-status" role="status">
                {STATUS_TEXT[draft.status]}
                {working && draft.status !== 'processing' ? ` ${Math.round(draft.progress * 100)}%` : ''}
                {draft.status === 'done' ? ' ✓' : ''}
            </span>
            {!upload.running && !working && !SETTLED.includes(draft.status) && (
                <button
                    type="button"
                    className="ui-icon-button mp-ghost mp-draft-remove"
                    aria-label={`从这批里去掉 ${draft.title}`}
                    onClick={() => upload.remove(draft.key)}
                >
                    <ITrash size={16} />
                </button>
            )}
        </li>
    );
}

export function UploadView({
    upload,
    onBack,
    onClose
}: {
    upload: MusicUpload;
    onBack: () => void;
    onClose?: () => void;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const folderRef = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);
    // folders can be picked where the input supports it (desktop browsers; not iOS)
    const [folders] = useState(
        () => 'webkitdirectory' in document.createElement('input') && !/iPhone|iPad/.test(navigator.userAgent)
    );
    const pending = upload.drafts.filter((d) => d.status === 'ready' || d.status === 'unsupported').length;
    const settled = upload.drafts.filter((d) => SETTLED.includes(d.status) && d.status !== 'failed').length;

    const pick = (list: FileList | null) => {
        const files = [...(list ?? [])].map((file) => ({
            file,
            path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
        }));
        void upload.add(files);
    };
    const drop = async (event: DragEvent) => {
        event.preventDefault();
        setOver(false);
        const items = [...event.dataTransfer.items];
        const entries = items.map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
        const files = entries.length
            ? (await Promise.all(entries.map(entryFiles))).flat()
            : [...event.dataTransfer.files].map((file) => ({ file, path: file.name }));
        void upload.add(files);
    };

    return (
        <div className="mp-upload">
            <header className="mp-subhead" data-sheet-grab>
                <button
                    type="button"
                    className="ui-icon-button mp-ghost mp-back"
                    aria-label="回到播放器"
                    onClick={onBack}
                >
                    <IChevron size={18} />
                </button>
                <h3>上传音乐</h3>
                {onClose && (
                    <button type="button" className="ui-icon-button mp-ghost" aria-label="收起播放器" onClick={onClose}>
                        <IClose size={18} />
                    </button>
                )}
            </header>
            <div
                className="mp-drop"
                data-over={over || undefined}
                onDragOver={(event) => {
                    event.preventDefault();
                    setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(event) => void drop(event)}
            >
                <div className="mp-drop-actions">
                    <button
                        type="button"
                        className="ui-button ui-button-primary"
                        onClick={() => fileRef.current?.click()}
                    >
                        <IUpload size={17} />
                        选择文件
                    </button>
                    {folders && (
                        <button type="button" className="ui-button" onClick={() => folderRef.current?.click()}>
                            <IFolder size={17} />
                            选择文件夹
                        </button>
                    )}
                </div>
                <p>
                    FLAC、ALAC、WAV、AIFF、MP3、AAC、Opus 都行，原件原样保存。同名的 .lrc 歌词、封面图、整轨的 .cue
                    一起选上会自动配好{folders ? '；也可以直接把文件夹拖进来' : ''}。
                </p>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept={ACCEPT}
                    hidden
                    onChange={(event) => {
                        pick(event.target.files);
                        event.target.value = '';
                    }}
                />
                {folders && (
                    <input
                        ref={folderRef}
                        type="file"
                        multiple
                        hidden
                        {...({ webkitdirectory: '' } as Record<string, string>)}
                        onChange={(event) => {
                            pick(event.target.files);
                            event.target.value = '';
                        }}
                    />
                )}
            </div>
            <div className="mp-upload-opts">
                <label className="mp-switch">
                    <input
                        type="checkbox"
                        checked={upload.visibility === 'private'}
                        disabled={upload.running}
                        onChange={(event) => upload.setVisibility(event.target.checked ? 'private' : 'world')}
                    />
                    <span>
                        <b>这批只给自己听</b>
                        <small>默认两个人都能听；以后在曲库里随时改</small>
                    </span>
                </label>
                <p className="mp-note">
                    {upload.copyFormat === undefined
                        ? '会顺便看看这台设备能不能做省流版。'
                        : upload.copyFormat
                          ? `无损的歌会顺便做一份省流版（${upload.copyFormat.codec === 'aac' ? 'AAC' : 'Opus'} ${Math.round(upload.copyFormat.bitrate / 1000)} kbps），用流量时可以切过去。`
                          : '这台设备做不了省流版，原件照样入库；以后在电脑上补。'}
                </p>
            </div>
            {upload.drafts.length > 0 && (
                <ul className="mp-drafts" aria-label="这批要上传的歌">
                    {upload.drafts.map((draft) => (
                        <DraftCard key={draft.key} draft={draft} upload={upload} />
                    ))}
                </ul>
            )}
            {upload.ignored.length > 0 && (
                <details className="mp-ignored">
                    <summary>没有导入的文件 {upload.ignored.length} 个</summary>
                    <ul>
                        {upload.ignored.map((f, i) => (
                            <li key={`${f.name}-${i}`}>
                                {f.name} · {f.reason}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
            <footer className="mp-upload-ft">
                {upload.running ? (
                    <button type="button" className="ui-button" onClick={upload.cancel}>
                        暂停上传
                    </button>
                ) : (
                    <button
                        type="button"
                        className="ui-button ui-button-primary"
                        disabled={!pending || upload.reading > 0}
                        onClick={() => void upload.start()}
                    >
                        {upload.reading > 0
                            ? `正在读取 ${upload.reading} 首…`
                            : pending
                              ? `上传 ${pending} 首`
                              : settled
                                ? '都传完了'
                                : '先选几首歌'}
                    </button>
                )}
                {settled > 0 && !upload.running && (
                    <button type="button" className="ui-button mp-ghost" onClick={upload.clearSettled}>
                        清掉已完成的
                    </button>
                )}
            </footer>
        </div>
    );
}
