// photo-wall.tsx — 照片墙 as polaroids (concept H1 in ai/design_system/codex-visual/memories/), one
// of the memory page's photo views (memory-views.ts): every photo in the journal as a taped
// polaroid, newest first, under month tags — two to a row on a phone, as many as fit in the wide
// desktop window. A polaroid opens the shared lightbox, which can jump back to the entry it came
// from. Stays mounted while hidden, like the journal.
import type { CSSProperties } from 'react';
import { hashOf } from '@/themes/cinnaglass/surfaces/author-tone';
import { monthKey, monthLabel, photoCaption, type MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import type { PhotoViewProps } from '@/themes/cinnaglass/surfaces/memory-views';

const TAPES = ['#b9d3e6', '#efc3cf', '#efe1b4'];

export function PhotoWall({ photos, status, anyImages, onPhoto }: PhotoViewProps) {
    const months: { key: string; label: string; items: { photo: MemoryPhoto; index: number }[] }[] = [];
    photos.forEach((photo, index) => {
        const key = monthKey(photo.post.created_at);
        const last = months[months.length - 1];
        if (last?.key === key) last.items.push({ photo, index });
        else months.push({ key, label: monthLabel(photo.post.created_at), items: [{ photo, index }] });
    });
    return (
        <div className="mem-photos-view">
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
                                        aria-label={`查看 ${photoCaption(photo.post.created_at)} 的照片`}
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
                                        <span className="mem-pola-cap">{photoCaption(photo.post.created_at)}</span>
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
                                {/* ART-REQUEST ART-05: a spot illustration goes above the title */}
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

export default PhotoWall;
