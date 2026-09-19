// photo-wall.tsx — the 照片墙 surface body: every post image as a tilted
// polaroid, grouped by month, with its own progressive lightbox. Moved out of
// screens.tsx verbatim (only the component name changed).
import { useEffect, useState } from 'react';
import { signImageUrls, thumbPathOf } from '@/lib/storage.ts';
import type { FeedPost } from '@/types/feed.ts';
import { fmtDay } from './date-format';
import { hashOf } from './author-tone';

type LightboxPhoto = { path: string; thumb?: string; date: string };

// Photo wall: every image from every post, newest first, grouped by month and
// laid out as tilted polaroids. Clicking one opens a progressive lightbox —
// the signed thumbnail shows at once, the signed original swaps in when ready.
export function PhotoWall({ posts, thumbUrls }: { posts: FeedPost[]; thumbUrls: Record<string, string> }) {
    const [view, setView] = useState<LightboxPhoto | null>(null);
    const [fullUrl, setFullUrl] = useState<string | null>(null);
    // fullUrl resets in the open/close handlers (not the effect) so the effect
    // only talks to external systems: signing + the Esc listener.
    const openView = (p: LightboxPhoto) => {
        setFullUrl(null);
        setView(p);
    };
    const closeView = () => {
        setFullUrl(null);
        setView(null);
    };

    // Progressive lightbox: show the (already-signed) thumbnail immediately,
    // sign the original on demand and swap it in when ready. Esc closes.
    useEffect(() => {
        if (!view) return;
        let cancelled = false;
        signImageUrls([view.path])
            .then((m) => {
                if (!cancelled) setFullUrl(m[view.path] ?? null);
            })
            .catch(() => {
                /* keep showing the thumbnail */
            });
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeView();
        window.addEventListener('keydown', onKey);
        return () => {
            cancelled = true;
            window.removeEventListener('keydown', onKey);
        };
    }, [view]);

    // Flatten every post's images into polaroids, keeping only ones whose
    // thumbnail is already signed. Newest moments first, grouped by month.
    const now = new Date();
    const photos = [...posts]
        .reverse()
        .flatMap((p) =>
            (p.visible_images ?? []).map((path) => {
                const d = new Date(p.created_at);
                const day = fmtDay(p.created_at);
                const md = `${d.getMonth() + 1}.${d.getDate()}`;
                return {
                    key: `${p.post_id}:${path}`,
                    path,
                    src: thumbUrls[thumbPathOf(path)],
                    date: day,
                    // pencil note on the paper rim: "7.5 · 今天" for fresh ones
                    cap: day === '今天' || day === '昨天' ? `${md} · ${day}` : md,
                    month: `${d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()} 年 `}${d.getMonth() + 1} 月`,
                    // stable per-photo tilt (straightened on hover)
                    rot: ((hashOf(`${p.post_id}:${path}`) % 5) - 2) * 1.2
                };
            })
        )
        .filter((ph) => !!ph.src);
    const months: { label: string; items: typeof photos }[] = [];
    for (const ph of photos) {
        const g = months[months.length - 1];
        if (g && g.label === ph.month) g.items.push(ph);
        else months.push({ label: ph.month, items: [ph] });
    }
    return (
        <div>
            <div className="pw-head">来自时间线的 {photos.length} 个瞬间</div>
            {months.map((g) => (
                <div key={g.label}>
                    <div className="pw-month">
                        <b>{g.label}</b>
                        {g.items.length} 个瞬间
                    </div>
                    <div className="pw">
                        {g.items.map((ph) => (
                            <figure
                                className="pola"
                                key={ph.key}
                                style={{ '--rot': `${ph.rot}deg` } as React.CSSProperties}
                                onClick={() => openView({ path: ph.path, thumb: ph.src, date: ph.date })}
                            >
                                <i className="tape"></i>
                                <img src={ph.src} alt="" loading="lazy" />
                                <figcaption>{ph.cap}</figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            ))}
            {photos.length === 0 && (
                <div className="empty-hint">
                    {posts.some((p) => (p.visible_images ?? []).length > 0)
                        ? '正在加载照片…' // images exist, their signed URLs are still in flight
                        : '还没有照片 · 发一条带图的回忆吧'}
                </div>
            )}
            {view && (
                <div className="lb" onClick={closeView}>
                    <img src={fullUrl ?? view.thumb} alt="" />
                    <div className="lb-cap">
                        {view.date}
                        {!fullUrl && ' · 正在加载原图…'}
                    </div>
                </div>
            )}
        </div>
    );
}
