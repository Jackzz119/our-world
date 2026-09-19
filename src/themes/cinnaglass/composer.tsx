// composer.tsx — the write path for a memory. Collapsed it is a one-line
// doorway; open it is a textarea plus the picked-image row that IS the upload
// list. Moved out of screens.tsx verbatim.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPost } from '@/lib/posts.ts';
import { uploadMemoryImage } from '@/lib/storage.ts';
import { IPhoto, ISparkle } from './icons';

// Controlled multi-image pick: the thumbnail row IS the upload list — what
// you see is exactly what gets published. Object URLs are revoked on remove
// and on cancel, never on collapse (a collapsed composer still holds a draft).
type Picked = { file: File; url: string };
const MAX_IMGS = 9;

// The write path. Collapsed it is a one-line doorway; open it is a textarea +
// image row. Publishing uploads every picked file to Storage first, then
// inserts one post, then calls onPublished (the caller reloads the feed).
// Clicking outside or Esc only collapses — the draft survives; only 取消 clears.
export function Composer({ worldId, onPublished }: { worldId: string | null; onPublished: () => void }) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [picked, setPicked] = useState<Picked[]>([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [over, setOver] = useState(false);
    const taRef = useRef<HTMLTextAreaElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    // Implicit dismissal never destroys content: clicking anywhere outside the
    // composer (or Esc) just collapses it — text and picked images stay as a
    // draft. Only the explicit 取消 button clears.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation(); // Do not also dismiss the diary at window level.
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // Grow with the writing (capped, then the textarea scrolls internally).
    const autogrow = () => {
        const el = taRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    };
    useLayoutEffect(() => {
        if (open) autogrow();
    }, [open]);

    // Accept only images, cap at MAX_IMGS, mint one object URL per pick.
    const addFiles = (files: Iterable<File>) => {
        if (busy) return;
        const imgs = [...files].filter((f) => f.type.startsWith('image/'));
        if (!imgs.length) return;
        setPicked((prev) => [
            ...prev,
            ...imgs.slice(0, Math.max(0, MAX_IMGS - prev.length)).map((f) => ({ file: f, url: URL.createObjectURL(f) }))
        ]);
    };
    // Revoke before dropping, or the blob leaks for the page's lifetime.
    const removeAt = (i: number) =>
        setPicked((prev) => {
            URL.revokeObjectURL(prev[i].url);
            return prev.filter((_, j) => j !== i);
        });
    // Explicit discard: revoke every object URL and empty the row.
    const clearPicked = () =>
        setPicked((prev) => {
            prev.forEach((p) => URL.revokeObjectURL(p.url));
            return [];
        });

    // The whole open composer is a drop target — no more pixel-hunting.
    const dropProps = {
        onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            setOver(false);
            addFiles(e.dataTransfer.files);
        }
    };

    // Uploads run sequentially so a mid-way failure leaves a known prefix in the
    // bucket rather than an unknown scatter; the post row is written only after
    // every image lands. On failure nothing is cleared — the draft stays.
    const publish = async () => {
        const v = text.trim();
        if ((!v && picked.length === 0) || !worldId || busy) return;
        setBusy(true);
        setErr(null);
        try {
            const images: string[] = [];
            for (const p of picked) {
                const { originalPath } = await uploadMemoryImage(worldId, p.file);
                images.push(originalPath);
            }
            await createPost({ worldId, content: v, images });
            setText('');
            setOpen(false);
            clearPicked();
            onPublished();
        } catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        const hasDraft = !!text.trim() || picked.length > 0;
        return (
            <div className="compose">
                <button
                    type="button"
                    className={`compose-collapsed${hasDraft ? ' draft' : ''}`}
                    onClick={() => setOpen(true)}
                >
                    {hasDraft ? (
                        <>
                            <span className="draft-chip">✎ 草稿</span>
                            <span className="ph">{text.trim() ? text.trim().split('\n')[0] : '（还没写文字）'}</span>
                            {picked.length > 0 && (
                                <span className="draft-imgs">
                                    <IPhoto size={13} /> {picked.length} 张
                                </span>
                            )}
                            <span className="go">点击继续 ✎</span>
                        </>
                    ) : (
                        <>
                            <span className="ph">写一页</span>
                        </>
                    )}
                </button>
            </div>
        );
    }
    return (
        <div className={`compose is-open${over ? ' dropping' : ''}`} ref={rootRef}>
            <div className="compose-open" {...dropProps}>
                <textarea
                    ref={taRef}
                    disabled={busy}
                    autoFocus
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        autogrow();
                    }}
                    placeholder="今天发生了什么温柔的事？"
                />
                {picked.length === 0 ? (
                    <button type="button" className="pk-strip" onClick={() => fileRef.current?.click()}>
                        <IPhoto size={20} />
                        分享几张此刻的照片 · 拖进来，或 <u>选择文件</u>
                    </button>
                ) : (
                    <div className="pk-row">
                        {picked.map((p, i) => (
                            <span className="pk" key={p.url}>
                                <img src={p.url} alt="" />
                                <button className="x" aria-label="移除这张" onClick={() => removeAt(i)}>
                                    ×
                                </button>
                            </span>
                        ))}
                        {picked.length < MAX_IMGS && (
                            <button
                                className="pk-add"
                                aria-label="继续添加图片"
                                onClick={() => fileRef.current?.click()}
                            >
                                ＋
                            </button>
                        )}
                        <span className="pk-cnt">
                            {picked.length} / {MAX_IMGS}
                        </span>
                    </div>
                )}
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = '';
                    }}
                />
                <div className="compose-row">
                    <div className="compose-actions">
                        <button
                            className="btn-ghost"
                            disabled={busy}
                            onClick={() => {
                                setOpen(false);
                                setText('');
                                setErr(null);
                                clearPicked();
                            }}
                        >
                            取消
                        </button>
                        <button
                            className="btn-primary btn-pub"
                            onClick={publish}
                            disabled={(!text.trim() && picked.length === 0) || !worldId || busy}
                        >
                            {busy ? (
                                '正在收进小世界…'
                            ) : (
                                <>
                                    <ISparkle size={15} /> 记下这一刻
                                </>
                            )}
                        </button>
                    </div>
                </div>
                {err && <div className="empty-hint">发布失败：{err}</div>}
            </div>
        </div>
    );
}
