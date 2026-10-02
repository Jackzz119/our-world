// photo-album.tsx — 相册 (concept H3 in ai/design_system/codex-visual/memories/): every photo in the
// journal as a dense square grid, newest first, under sticky month titles — six to a row on a
// desktop, three on a phone. A chip bar on top jumps to a month and lights up the month in view
// as you scroll; a square opens the shared lightbox. Stays mounted while the page is closed, with
// its observers resting.
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { FeedPost } from '@/types/feed';
import { fmtDay, fmtFullDate } from '@/themes/cinnaglass/surfaces/date-format';
import { monthKey, monthLabel, type MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import type { PhotoViewProps } from '@/themes/cinnaglass/surfaces/memory-views';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import '@/themes/cinnaglass/surfaces/photo-album.css';

type Month = {
    key: string;
    /** "9 月", or "2025 年 9 月" for another year — the sticky title */
    label: string;
    month: number;
    year: number;
    items: { photo: MemoryPhoto; index: number }[];
};

const ARROWS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down'
};

// "9.21", the pencil-note date the polaroids use too.
const shortDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}.${d.getDate()}`;
};

export function PhotoAlbum({ feed, photos, status, anyImages, open, onPhoto }: PhotoViewProps) {
    const compact = useCompactUi();
    const scrollRef = useRef<HTMLDivElement>(null);
    const chipsRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const olderRef = useRef<HTMLButtonElement>(null);
    // a jump from the chip bar owns the highlight until its scroll settles
    const jumpUntil = useRef(0);
    const [active, setActive] = useState<string | null>(null);

    const months: Month[] = [];
    photos.forEach((photo, index) => {
        const iso = photo.post.created_at;
        const key = monthKey(iso);
        const last = months[months.length - 1];
        if (last?.key === key) last.items.push({ photo, index });
        else {
            const d = new Date(iso);
            const month = d.getMonth() + 1;
            months.push({ key, label: monthLabel(iso), month, year: d.getFullYear(), items: [{ photo, index }] });
        }
    });
    const current = months.some((m) => m.key === active) ? active : (months[0]?.key ?? null);
    // years show in the chip bar once the album reaches past this one
    const years = months.some((m) => m.label.includes('年'));
    const monthKeys = months.map((m) => m.key).join(',');
    const oldest = photos.at(-1);

    const nameOf = (post: FeedPost) =>
        post.author_id === feed.currentUserId ? '我' : feed.profiles[post.author_id]?.display_name || 'TA';

    // The month in view is the one under the sticky title at the top of the scroller; at the very
    // bottom the last months can never reach the top, so the last one counts as in view.
    useEffect(() => {
        const root = scrollRef.current;
        const end = endRef.current;
        if (!root || !end || !open || !monthKeys) return;
        const sections = [...root.querySelectorAll<HTMLElement>('.pa-month')];
        const inBand = new Set<Element>();
        let atEnd = false;
        const pick = () => {
            if (performance.now() < jumpUntil.current) return;
            const section = atEnd ? sections.at(-1) : sections.find((s) => inBand.has(s));
            if (section?.dataset.month) setActive(section.dataset.month);
        };
        const band = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) inBand.add(entry.target);
                    else inBand.delete(entry.target);
                }
                pick();
            },
            { root, rootMargin: '-1px 0px -62% 0px' }
        );
        const bottom = new IntersectionObserver(
            ([entry]) => {
                atEnd = entry.isIntersecting && root.scrollHeight > root.clientHeight + 1;
                pick();
            },
            { root }
        );
        sections.forEach((section) => band.observe(section));
        bottom.observe(end);
        return () => {
            band.disconnect();
            bottom.disconnect();
        };
    }, [open, monthKeys]);

    // Keep the lit chip in sight when the bar scrolls sideways (a phone, or many months). The page
    // mounts its views closed, so a bar that only gets its size later lands on the chip at once.
    useEffect(() => {
        const bar = chipsRef.current;
        if (!bar || !open || !current) return;
        const centre = (smooth: boolean) => {
            const chip = bar.querySelector<HTMLElement>(`[data-month="${CSS.escape(current)}"]`);
            if (!chip || !bar.clientWidth || bar.scrollWidth <= bar.clientWidth) return;
            const left = chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2;
            bar.scrollTo({ left: Math.max(0, left), behavior: smooth && !motionReduced() ? 'smooth' : 'auto' });
        };
        centre(true);
        let width = bar.clientWidth;
        const observer = new ResizeObserver(() => {
            if (bar.clientWidth === width) return;
            width = bar.clientWidth;
            centre(false);
        });
        observer.observe(bar);
        return () => observer.disconnect();
    }, [current, open]);

    // A mouse wheel over a chip bar that runs off the edge scrolls it sideways; once scrolled,
    // its left edge fades too.
    useEffect(() => {
        const bar = chipsRef.current;
        if (!bar) return;
        const onWheel = (event: WheelEvent) => {
            if (bar.scrollWidth <= bar.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
            event.preventDefault();
            bar.scrollLeft += event.deltaY;
        };
        const onScroll = () => bar.toggleAttribute('data-scrolled', bar.scrollLeft > 2);
        bar.addEventListener('wheel', onWheel, { passive: false });
        bar.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            bar.removeEventListener('wheel', onWheel);
            bar.removeEventListener('scroll', onScroll);
        };
    }, [monthKeys]);

    // `at` is the click's timestamp (the same clock as performance.now in the observer)
    const jump = (key: string, first: boolean, at: number) => {
        const root = scrollRef.current;
        const section = root?.querySelector<HTMLElement>(`.pa-month[data-month="${CSS.escape(key)}"]`);
        if (!root || !section) return;
        setActive(key);
        jumpUntil.current = at + 1400;
        const settle = (event: Event) => {
            jumpUntil.current = event.timeStamp + 120;
        };
        root.addEventListener('scrollend', settle, { once: true });
        root.scrollTo({ top: first ? 0 : section.offsetTop, behavior: motionReduced() ? 'auto' : 'smooth' });
    };

    const loadOlder = () => {
        if (feed.hasMore && !feed.loadingOlder) feed.loadOlder();
    };
    const loadOlderRef = useRef(loadOlder);
    useLayoutEffect(() => {
        loadOlderRef.current = loadOlder;
    });
    // Reaching the oldest photo turns up older pages on its own (the button stays for keyboards).
    useEffect(() => {
        const target = olderRef.current;
        const root = scrollRef.current;
        if (!target || !root || !open || !feed.hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) loadOlderRef.current();
            },
            { root, rootMargin: '0px 0px 160px' }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [open, feed.hasMore, feed.loadingOlder]);

    // Arrow keys walk the grid: sideways through the order, up and down to the nearest square of
    // the row above or below (across months too).
    const onKeyDown = (event: React.KeyboardEvent) => {
        const dir = ARROWS[event.key];
        const from = (event.target as Element).closest<HTMLElement>('.pa-cell');
        const root = scrollRef.current;
        if (!dir || !from || !root || event.altKey || event.ctrlKey || event.metaKey) return;
        const cells = [...root.querySelectorAll<HTMLElement>('.pa-cell')];
        let target: HTMLElement | undefined;
        if (dir === 'left' || dir === 'right') target = cells[cells.indexOf(from) + (dir === 'right' ? 1 : -1)];
        else {
            const a = from.getBoundingClientRect();
            let best = Infinity;
            for (const cell of cells) {
                const b = cell.getBoundingClientRect();
                const dy = dir === 'down' ? b.top - a.top : a.top - b.top;
                if (dy < 1) continue;
                const score = dy * 10000 + Math.abs(b.left - a.left);
                if (score < best) {
                    best = score;
                    target = cell;
                }
            }
        }
        if (!target) return;
        event.preventDefault();
        target.focus();
    };

    return (
        <div className="pa-view" data-compact={compact}>
            {months.length > 0 && (
                <nav className="pa-chips" aria-label="按月份跳转">
                    <div className="pa-chips-track" ref={chipsRef}>
                        {months.map((month, i) => (
                            <Fragment key={month.key}>
                                {years && (i === 0 || months[i - 1].year !== month.year) && (
                                    <span className="pa-year" aria-hidden="true">
                                        {month.year}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className="pa-chip"
                                    data-month={month.key}
                                    aria-current={month.key === current || undefined}
                                    aria-label={`${month.label}，${month.items.length} 张`}
                                    onClick={(event) => jump(month.key, i === 0, event.timeStamp)}
                                >
                                    {month.month} 月<small>{month.items.length}</small>
                                </button>
                            </Fragment>
                        ))}
                    </div>
                    <span className="pa-total">共 {photos.length} 张</span>
                </nav>
            )}
            <div className="pa-scroll" ref={scrollRef} onKeyDown={onKeyDown}>
                {months.map((month) => (
                    <section
                        className="pa-month"
                        key={month.key}
                        data-month={month.key}
                        aria-label={`${month.label}，${month.items.length} 张`}
                    >
                        <h3 className="pa-month-hd">
                            <span className="pa-month-tag">
                                <span className="pa-month-name">{month.label}</span>
                                <span className="pa-month-count">{month.items.length} 张</span>
                            </span>
                        </h3>
                        <div className="pa-grid">
                            {month.items.map(({ photo, index }, i) => (
                                <AlbumCell
                                    key={photo.key}
                                    photo={photo}
                                    order={Math.min(i, 17)}
                                    name={nameOf(photo.post)}
                                    mine={photo.post.author_id === feed.currentUserId}
                                    onOpen={() => onPhoto(index)}
                                />
                            ))}
                        </div>
                    </section>
                ))}
                {photos.length > 0 &&
                    (feed.hasMore ? (
                        <button
                            type="button"
                            ref={olderRef}
                            className="mem-older pa-older"
                            disabled={feed.loadingOlder}
                            onClick={loadOlder}
                        >
                            {feed.loadingOlder && <span className="ui-spinner" aria-hidden="true" />}
                            {feed.loadingOlder ? '正在往前翻…' : '翻出更早的照片'}
                        </button>
                    ) : (
                        oldest && (
                            <p className="pa-end">
                                这本相册从 {fmtFullDate(oldest.post.created_at).split(' · ')[0]} 开始，一共{' '}
                                {photos.length} 张
                            </p>
                        )
                    ))}
                {!photos.length && (
                    <div className="mem-note mem-paper pa-note" role={status === 'error' ? 'alert' : undefined}>
                        {status === 'loading' || anyImages ? (
                            <p>
                                <span className="ui-spinner" aria-hidden="true" />
                                正在把照片一张张收进相册…
                            </p>
                        ) : status === 'error' ? (
                            <>
                                <p>照片暂时没能载入。</p>
                                <button type="button" className="mem-note-btn" onClick={feed.reload}>
                                    再试一次
                                </button>
                            </>
                        ) : (
                            <>
                                {/* ART-REQUEST ART-05: a spot illustration goes above the title */}
                                <p className="mem-note-title">相册还空着。</p>
                                <p>在日记里写一页带照片的回忆，它就会收进这里。</p>
                                {feed.hasMore && (
                                    <button
                                        type="button"
                                        className="mem-note-btn"
                                        disabled={feed.loadingOlder}
                                        onClick={loadOlder}
                                    >
                                        {feed.loadingOlder ? '正在往前翻…' : '翻翻更早的日记'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
                <div className="pa-end-mark" ref={endRef} aria-hidden="true" />
            </div>
        </div>
    );
}

// One square: the photo fades in once it has loaded; a fine pointer brings up the date and who.
function AlbumCell({
    photo,
    order,
    name,
    mine,
    onOpen
}: {
    photo: MemoryPhoto;
    order: number;
    name: string;
    mine: boolean;
    onOpen: () => void;
}) {
    const [ready, setReady] = useState(false);
    const iso = photo.post.created_at;
    return (
        <button
            type="button"
            className="pa-cell"
            style={{ '--order': order } as CSSProperties}
            aria-label={`查看 ${fmtDay(iso)}的照片，${name}`}
            onClick={onOpen}
        >
            {photo.thumb ? (
                <img
                    src={photo.thumb}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    data-photo-key={photo.key}
                    data-ready={ready || undefined}
                    onLoad={() => setReady(true)}
                />
            ) : (
                <span className="mem-photo-wait" aria-hidden="true" />
            )}
            <span className="pa-cap" aria-hidden="true">
                <time dateTime={iso}>{shortDate(iso)}</time>
                <b data-author={mine ? 'mine' : 'theirs'}>{name}</b>
            </span>
        </button>
    );
}

export default PhotoAlbum;
