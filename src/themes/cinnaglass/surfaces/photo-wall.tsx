// photo-wall.tsx — 照片墙 (concept H1 in ai/design_system/codex-visual/memories/):
// every photo in the journal as a taped polaroid, newest first, under month
// tags, two to a row. A polaroid opens the shared lightbox, which can jump back
// to the entry it came from. Stays mounted while hidden, like the journal.
import type { CSSProperties } from 'react';
import type { FeedStatus } from '@/hooks/useFeed';
import { hashOf } from '@/themes/cinnaglass/surfaces/author-tone';
import { monthKey, monthLabel, type MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';

const TAPES = ['#b9d3e6', '#efc3cf', '#efe1b4'];

// "9.21", with 今天 / 昨天 for fresh ones — the pencil note on the polaroid's rim.
function caption(iso: string): string {
    const d = new Date(iso);
    const md = `${d.getMonth() + 1}.${d.getDate()}`;
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return `${md} · 今天`;
    if (d.toDateString() === yesterday.toDateString()) return `${md} · 昨天`;
    return md;
}

export function PhotoWall({
    photos,
    status,
    anyImages,
    hidden,
    onPhoto
}: {
    /** every photo, newest first (memory-photos.ts wallPhotos) */
    photos: MemoryPhoto[];
    status: FeedStatus;
    /** some post carries images, even if none is signed yet */
    anyImages: boolean;
    hidden: boolean;
    onPhoto: (index: number) => void;
}) {
    const months: { key: string; label: string; items: { photo: MemoryPhoto; index: number }[] }[] = [];
    photos.forEach((photo, index) => {
        const key = monthKey(photo.post.created_at);
        const last = months[months.length - 1];
        if (last?.key === key) last.items.push({ photo, index });
        else months.push({ key, label: monthLabel(photo.post.created_at), items: [{ photo, index }] });
    });
    return (
        <div
            className="mem-view mem-photos-view"
            role="tabpanel"
            id="mem-photos"
            aria-labelledby="mem-tab-photos"
            hidden={hidden}
        >
            <div className="mem-scroll">
                {months.map((month) => (
                    <section
                        className="mem-month"
                        key={month.key}
                        aria-label={`${month.label}，${month.items.length} 张`}
                    >
                        <h3 className="mem-month-tag">
                            <span>
                                {month.label} · {month.items.length} 张
                            </span>
                        </h3>
                        <div className="mem-wall">
                            {month.items.map(({ photo, index }, i) => {
                                const hash = hashOf(photo.key);
                                const style = {
                                    '--tilt': `${((hash % 5) - 2) * 1.3}deg`,
                                    '--tape': TAPES[hash % TAPES.length],
                                    '--order': Math.min(i, 9)
                                } as CSSProperties;
                                return (
                                    <button
                                        type="button"
                                        key={photo.key}
                                        className="mem-pola"
                                        style={style}
                                        aria-label={`查看 ${caption(photo.post.created_at)} 的照片`}
                                        onClick={() => onPhoto(index)}
                                    >
                                        <span className="mem-pola-pic">
                                            {photo.thumb ? (
                                                <img
                                                    src={photo.thumb}
                                                    alt=""
                                                    loading="lazy"
                                                    decoding="async"
                                                    draggable={false}
                                                    data-photo-key={photo.key}
                                                />
                                            ) : (
                                                <span className="mem-photo-wait" aria-hidden="true" />
                                            )}
                                        </span>
                                        <span className="mem-pola-cap">{caption(photo.post.created_at)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
                {!photos.length && (
                    <div className="mem-note mem-paper" role={status === 'error' ? 'alert' : undefined}>
                        {status === 'loading' || anyImages ? (
                            <p>正在把照片一张张贴上墙…</p>
                        ) : status === 'error' ? (
                            <p>照片暂时没能载入。</p>
                        ) : (
                            <>
                                <p className="mem-note-title">墙上还空着。</p>
                                <p>在日记里写一页带照片的回忆，它就会贴到这里。</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
