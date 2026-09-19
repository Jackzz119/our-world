// journal-room-book.tsx — React host for the chestnut journal.
// It measures the paper, asks journal-layout to build real DOM leaves from the
// feed, and hands those same leaves to JournalTurnController — the turning
// faces are clones of the real pages, never re-rendered stand-ins.
// Feature doc: ai/features/timeline.md
import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseFeed } from '@/hooks/useFeed';
import type { FeedPost } from '@/types/feed';
import { thumbPathOf } from '@/lib/storage';
import { applyThumbUrls, buildJournalPages, type JournalPage } from '@/themes/cinnaglass/journal-layout';
import { JournalTurnController } from '@/themes/cinnaglass/journal-turn-controller';
import { Composer } from '@/themes/cinnaglass/composer';
import '@/themes/cinnaglass/journal-room.css';
import '@/themes/cinnaglass/journal-turn.css';

// Non-reactive book state: mutating it must not re-render (the leaves are
// plain DOM, owned by this file, not by React).
type BookState = { pages: JournalPage[]; page: number; step: number };

// active = this surface is the visible one; an inactive book cancels any turn
// in flight and stops handling arrow keys.
export function JournalRoomBook({
    feed,
    thumbUrls,
    active,
    onDetail
}: {
    feed: UseFeed;
    thumbUrls: Record<string, string>;
    active: boolean;
    onDetail: (post: FeedPost) => void;
}) {
    const slot = useRef<HTMLDivElement>(null);
    const turnHost = useRef<HTMLDivElement>(null);
    const turner = useRef<JournalTurnController | null>(null);
    const book = useRef<BookState>({ pages: [], page: 0, step: 2 });
    const anchor = useRef<{ id: string; offset: number } | null>(null);
    const urls = useRef(thumbUrls);
    const [layout, setLayout] = useState({ width: 0, height: 0, single: false });
    const [reading, setReading] = useState({ page: 0, total: 2 });
    const [target, setTarget] = useState(0);
    const [turning, setTurning] = useState(false);
    const [indexOpen, setIndexOpen] = useState(false);
    const [dates, setDates] = useState<{ label: string; page: number }[]>([]);

    // Show the spread that contains `target`, snapped to the step (1 leaf on
    // phones, 2 otherwise). Hides every other leaf and records a reading anchor
    // so a resize or a reload can land the reader back on the same sentence.
    const showPage = useCallback((target: number) => {
        const state = book.current;
        if (!state.pages.length || !slot.current) return;
        const page = Math.max(
            0,
            Math.min(state.pages.length - state.step, Math.floor(target / state.step) * state.step)
        );
        state.page = page;
        state.pages.forEach((leaf, i) => {
            const visible = i >= page && i < page + state.step;
            leaf.element.hidden = !visible;
            leaf.element.inert = !visible;
            leaf.element.setAttribute('aria-hidden', String(!visible));
            leaf.element.classList.toggle('--left', state.step === 2 && i === page);
            leaf.element.classList.toggle('--right', state.step === 1 || i === page + 1);
        });
        const part = state.pages[page]?.parts[0];
        if (part) anchor.current = { id: part.post.post_id, offset: part.start };
        setReading({ page, total: state.pages.length });
    }, []);

    // Signed URLs arrive after the leaves are built: patch the <img> elements in
    // place (both the static leaves and any face currently mid-turn).
    useEffect(() => {
        urls.current = thumbUrls;
        const urlFor = (path: string) => thumbUrls[thumbPathOf(path)];
        if (slot.current) applyThumbUrls(slot.current, urlFor);
        turner.current?.updateImages(urlFor);
    }, [thumbUrls]);

    useEffect(() => {
        if (!active && turner.current?.busy) turner.current.cancel();
    }, [active]);

    useEffect(() => {
        const node = slot.current;
        if (!node) return;
        const update = () => {
            const single = matchMedia('(max-width: 767px), (max-height: 599px)').matches;
            const width = node.clientWidth;
            const height = node.clientHeight;
            setLayout((old) =>
                old.width === width && old.height === height && old.single === single ? old : { width, height, single }
            );
        };
        const observer = new ResizeObserver(update);
        observer.observe(node);
        update();
        return () => observer.disconnect();
    }, []);

    // Rebuild the whole book whenever the feed or the measured box changes.
    // Waits for the journal font first — paginating with a fallback face would
    // measure the wrong line count and reflow on swap. Restores the reading
    // anchor if that post is still on a page, else opens at the newest entry.
    // The folio/heading rectangles are read from the live DOM so the turning
    // clones print their page numbers in exactly the same spot.
    useEffect(() => {
        const host = slot.current;
        if (!host || layout.width < 100 || layout.height < 180) return;
        let cancelled = false;
        void document.fonts
            .load('22px "Journal WenKai"')
            .catch(() => [])
            .then(() => {
                if (cancelled) return;
                if (turner.current?.busy) turner.current.cancel();
                turner.current?.destroy();
                turner.current = null;
                const step = layout.single ? 1 : 2;
                const pages = buildJournalPages(feed.posts, Math.floor(layout.width / step), layout.height, {
                    profiles: feed.profiles,
                    userId: feed.currentUserId,
                    urls: urls.current,
                    roomArt: true
                });
                const saved = anchor.current;
                const found = saved
                    ? pages.findIndex((p) =>
                          p.parts.some(
                              (part) =>
                                  part.post.post_id === saved.id &&
                                  part.start <= saved.offset &&
                                  part.start + part.text.length >= saved.offset
                          )
                      )
                    : -1;
                const newest = feed.posts.at(-1)?.post_id;
                const latest = pages.findIndex((p) => p.parts.some((part) => part.post.post_id === newest));
                book.current = { pages, step, page: 0 };
                host.replaceChildren(...pages.map((p) => p.element));
                // Date directory, deduped by the same localised label the button
                // shows. This label doubles as the dedupe key — it must stay
                // derived from post.created_at, like the running title in
                // journal-layout.
                const seen = new Set<string>();
                const list: { label: string; page: number }[] = [];
                pages.forEach((p, page) =>
                    p.parts.forEach(({ post }) => {
                        const label = new Date(post.created_at).toLocaleDateString('zh-CN');
                        if (!seen.has(label)) {
                            seen.add(label);
                            list.push({ label, page });
                        }
                    })
                );
                setDates(list);
                showPage(found >= 0 ? found : Math.max(0, latest));
                setTarget(book.current.page);
                const animationHost = turnHost.current;
                const surface = host.closest<HTMLElement>('.diary-surface');
                if (!animationHost || !surface) return;
                const paper = host.getBoundingClientRect();
                const cover = surface.getBoundingClientRect();
                const pageWidth = Math.floor(layout.width / step);
                const title = surface.querySelector<HTMLElement>('.object-hd h2');
                const titleRect = title?.getBoundingClientRect();
                const titleStyle = title && getComputedStyle(title);
                const folios = ['.journal-room-prev span', '.journal-room-next span'].map((selector, index) => {
                    const label = surface.querySelector<HTMLElement>(selector)!;
                    const rect = label.getBoundingClientRect();
                    const style = getComputedStyle(label);
                    const lineHeight = parseFloat(style.lineHeight) || 20;
                    return {
                        x: rect.x + rect.width / 2 - paper.x - (!layout.single && index === 1 ? pageWidth : 0),
                        y: rect.y + (rect.height - lineHeight) / 2 - paper.y,
                        font: style.font
                    };
                });
                turner.current = new JournalTurnController({
                    host: animationHost,
                    pages: pages.map((page) => page.element),
                    page: book.current.page,
                    geometry: {
                        width: pageWidth,
                        height: layout.height,
                        bookWidth: cover.width,
                        bookHeight: cover.height,
                        left: paper.x - cover.x,
                        top: paper.y - cover.y,
                        single: layout.single,
                        heading:
                            titleRect && titleStyle
                                ? {
                                      x: titleRect.x - paper.x,
                                      y: titleRect.y - paper.y,
                                      font: titleStyle.font,
                                      spacing: titleStyle.letterSpacing
                                  }
                                : undefined,
                        folios
                    },
                    onCommit: showPage,
                    onTarget: setTarget,
                    onBusy: (busy) => {
                        // Update both in the same frame: no ghost text below a moving face.
                        host.inert = busy;
                        host.style.visibility = busy ? 'hidden' : '';
                        host.parentElement!.dataset.turning = String(busy);
                        setTurning(busy);
                    }
                });
            });
        return () => {
            cancelled = true;
        };
    }, [feed.posts, feed.profiles, feed.currentUserId, layout, showPage]);

    useEffect(
        () => () => {
            turner.current?.destroy();
            turner.current = null;
        },
        []
    );

    // A new entry invalidates the anchor: drop it so the rebuild opens at the
    // newest page instead of where the reader was.
    const published = useCallback(() => {
        anchor.current = null;
        feed.reload();
    }, [feed]);
    const step = layout.single ? 1 : 2;
    return (
        <div
            className="journal-book journal-room-book"
            data-single={layout.single}
            data-turning={turning}
            data-page={reading.page}
            data-target={target}
            onClickCapture={(event) => {
                // Reaching for the composer or the bookmark means the reader
                // stopped turning: settle the sheet on the nearest spread
                // rather than letting it fly on.
                if ((event.target as HTMLElement).closest('.compose,.journal-bookmark')) turner.current?.cancel();
            }}
            onKeyDown={(event) => {
                if (
                    !active ||
                    !(event.target instanceof HTMLElement) ||
                    event.target.closest('input,textarea,.compose,.journal-index') ||
                    event.altKey ||
                    event.ctrlKey ||
                    event.metaKey
                )
                    return;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    turner.current?.by(event.key === 'ArrowRight' ? 1 : -1);
                }
            }}
        >
            <img
                className="journal-room-art"
                src="/ui/journal/book-open.webp"
                alt=""
                aria-hidden="true"
                draggable={false}
            />
            <div
                className="journal-engine-slot journal-room-pages"
                ref={slot}
                aria-label="日记书页"
                onClick={(event) => {
                    if (window.getSelection()?.toString()) return;
                    const entry = (event.target as HTMLElement).closest<HTMLElement>('.journal-entry');
                    const post = entry && feed.posts.find((p) => p.post_id === entry.dataset.postId);
                    if (post) onDetail(post);
                }}
            />
            <div className="journal-turn-host" ref={turnHost} aria-hidden="true" />
            <button
                type="button"
                className="journal-bookmark"
                aria-expanded={indexOpen}
                onClick={() => setIndexOpen((v) => !v)}
            >
                目录
            </button>
            {indexOpen && (
                <div
                    className="journal-index"
                    role="dialog"
                    aria-label="日记日期目录"
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                            event.stopPropagation();
                            setIndexOpen(false);
                        }
                    }}
                >
                    <header>
                        <b>按日子翻阅</b>
                        <button type="button" aria-label="关闭目录" onClick={() => setIndexOpen(false)}>
                            ×
                        </button>
                    </header>
                    <p>已载入的回忆</p>
                    <div className="journal-index-dates">
                        {dates.map((date) => (
                            <button
                                type="button"
                                key={date.label}
                                data-page={date.page}
                                onClick={() => {
                                    turner.current?.to(date.page);
                                    setIndexOpen(false);
                                }}
                            >
                                {date.label}
                                <span>翻到这里 →</span>
                            </button>
                        ))}
                    </div>
                    {!dates.length && <p>第一段回忆，从今天开始。</p>}
                    <button
                        type="button"
                        className="journal-load"
                        onClick={() => {
                            turner.current?.to(reading.total - 1);
                            setIndexOpen(false);
                        }}
                    >
                        翻到末页
                    </button>
                    {feed.hasMore && (
                        <button
                            type="button"
                            className="journal-load"
                            disabled={feed.loadingOlder}
                            onClick={feed.loadOlder}
                        >
                            {feed.loadingOlder ? '正在载入…' : '载入更早的回忆'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="journal-load"
                        onClick={feed.reload}
                        disabled={feed.status === 'loading'}
                    >
                        刷新回忆
                    </button>
                </div>
            )}
            <div className="journal-room-pager" aria-label="日记页码">
                <button
                    className="journal-room-prev"
                    type="button"
                    aria-label="上一页"
                    disabled={target === 0}
                    onClick={() => turner.current?.by(-1)}
                >
                    ‹ <span>{reading.page + 1}</span>
                </button>
                <span className="journal-room-page-status" role="status" aria-live="polite">
                    第 {reading.page + 1}
                    {!layout.single && `、${reading.page + 2}`} 页，共 {reading.total} 页
                </span>
                <button
                    className="journal-room-next"
                    type="button"
                    aria-label="下一页"
                    disabled={target >= reading.total - step}
                    onClick={() => turner.current?.by(1)}
                >
                    <span>{reading.page + step}</span> ›
                </button>
            </div>
            {feed.status !== 'ready' && (
                <div className="journal-status" role={feed.status === 'error' ? 'alert' : 'status'}>
                    {feed.status === 'error' ? (
                        <>
                            回忆暂时没能载入。<button onClick={feed.reload}>重试</button>
                        </>
                    ) : (
                        '正在收好你们的回忆…'
                    )}
                </div>
            )}
            <Composer worldId={feed.worldId} onPublished={published} />
            <img
                className="journal-quill journal-room-quill"
                src="/ui/journal/quill.webp"
                alt=""
                aria-hidden="true"
                draggable={false}
            />
        </div>
    );
}
