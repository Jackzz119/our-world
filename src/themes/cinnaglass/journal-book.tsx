import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { PageFlip } from 'page-flip';
import type { UseFeed } from '@/hooks/useFeed';
import type { FeedPost } from '@/types/feed';
import { thumbPathOf } from '@/lib/storage';
import { buildJournalPages, type JournalPage } from './journal-layout';

type Engine = { flip: PageFlip; pages: JournalPage[]; step: number; target: number; turns: number; frame: number };
type IndexItem = { date: string; page: number };

export function JournalQuill() {
    return (
        <svg className="journal-quill" viewBox="0 0 72 146" fill="none" aria-hidden="true">
            <path
                d="M17 113C14 78 29 34 64 5C67 38 56 70 35 92L17 113Z"
                fill="#ded3bc"
                stroke="#a69b82"
                strokeWidth=".8"
            />
            <path d="M18 111C28 69 45 34 63 7C48 49 35 88 18 111Z" fill="#eee4cf" />
            <path
                d="M18 112Q35 53 64 5M26 84L23 65M32 67L31 48M40 49L41 32M23 96L41 81M28 79L49 64M36 59L58 43M46 37L63 25"
                stroke="#b6aa91"
                strokeWidth=".8"
            />
            <path d="M17 108L24 111L15 137L10 145L11 134Z" fill="#9a7a46" stroke="#655139" />
            <path d="M17 110L21 112L13 136" stroke="#ebd5a6" strokeWidth="1.4" />
            <path d="M12 137L10 144" stroke="#40372e" />
        </svg>
    );
}

export function JournalBook({
    feed,
    thumbUrls,
    active,
    onDetail,
    ComposerComponent
}: {
    feed: UseFeed;
    thumbUrls: Record<string, string>;
    active: boolean;
    onDetail: (post: FeedPost) => void;
    ComposerComponent: ComponentType<{ worldId: string | null; onPublished: () => void }>;
}) {
    const slot = useRef<HTMLDivElement>(null);
    const engine = useRef<Engine | null>(null);
    const anchor = useRef<{ id: string; offset: number } | null>(null);
    const onDetailRef = useRef(onDetail);
    const urls = useRef(thumbUrls);
    const [layout, setLayout] = useState({ width: 0, height: 0, single: false });
    const [reading, setReading] = useState({ page: 0, total: 2, turning: false });
    const [index, setIndex] = useState<IndexItem[]>([]);
    const [indexOpen, setIndexOpen] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(false);
    const [loadNotice, setLoadNotice] = useState('');
    const reduced = useRef(false);

    useEffect(() => {
        onDetailRef.current = onDetail;
    }, [onDetail]);
    useEffect(() => {
        urls.current = thumbUrls;
        slot.current?.querySelectorAll<HTMLImageElement>('img[data-image-path]').forEach((image) => {
            const url = thumbUrls[thumbPathOf(image.dataset.imagePath!)];
            if (url && image.src !== url) {
                image.src = url;
                image.alt = '回忆照片';
            }
        });
    }, [thumbUrls]);

    useEffect(() => {
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => {
            reduced.current = media.matches;
        };
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        const host = slot.current;
        if (!host) return;
        const update = () => {
            const width = host.clientWidth;
            const height = host.clientHeight;
            const single = matchMedia('(max-width: 767px), (max-height: 599px)').matches;
            setLayout((old) =>
                old.width === width && old.height === height && old.single === single ? old : { width, height, single }
            );
        };
        const observer = new ResizeObserver(update);
        observer.observe(host);
        window.addEventListener('resize', update);
        update();
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    const sync = useCallback(() => {
        const state = engine.current;
        if (!state) return;
        const page = state.flip.getCurrentPageIndex();
        const part = state.pages[page]?.parts[0];
        if (part) anchor.current = { id: part.post.post_id, offset: part.start };
        state.pages.forEach((p, i) => {
            const visible = i >= page && i < page + state.step;
            p.element.inert = !visible;
            p.element.setAttribute('aria-hidden', String(!visible));
        });
        setReading({ page, total: state.pages.length, turning: state.flip.getState() !== 'read' });
    }, []);

    // Newest intent wins. Nearby jumps flip every intervening leaf. Distant
    // jumps show four consecutive leaves, then settle on the real destination.
    const advance = useCallback(
        function advanceTurn() {
            const state = engine.current;
            if (!state || state.flip.getState() !== 'read') return;
            const current = state.flip.getCurrentPageIndex();
            if (state.target < 0) {
                state.target = current;
                sync();
                return;
            }
            if (current === state.target) {
                sync();
                return;
            }
            if (reduced.current) {
                state.flip.getRender().start();
                state.flip.turnToPage(state.target);
                sync();
                return;
            }
            const remaining = Math.abs(state.target - current) / state.step;
            if (state.turns >= 3 && remaining > 1) {
                state.flip.turnToPage(state.target - Math.sign(state.target - current) * state.step);
            }
            state.flip.getSettings().flippingTime = remaining === 1 && state.turns === 0 ? 420 : 210;
            state.flip.getRender().start();
            state.turns++;
            if (state.target > state.flip.getCurrentPageIndex()) state.flip.flipNext('bottom');
            else state.flip.flipPrev('bottom');
            sync();
        },
        [sync]
    );

    const navigate = useCallback(
        (target: number) => {
            const state = engine.current;
            if (!state) return;
            state.target = Math.min(
                state.pages.length - state.step,
                Math.max(0, Math.floor(target / state.step) * state.step)
            );
            state.turns = 0;
            advance();
        },
        [advance]
    );

    useEffect(() => {
        const host = slot.current;
        if (!host || layout.width < 100 || layout.height < 120) return;
        let cancelled = false;
        let cleanup = () => {};
        void document.fonts.ready.then(() => {
            if (cancelled) return;
            const step = layout.single ? 1 : 2;
            const width = Math.floor(layout.width / step);
            const pages = buildJournalPages(feed.posts, width, layout.height, {
                profiles: feed.profiles,
                userId: feed.currentUserId,
                urls: urls.current
            });
            const block = document.createElement('div');
            block.className = 'journal-engine';
            host.replaceChildren(block);
            const newestId = feed.posts.at(-1)?.post_id;
            let startPage = Math.max(
                0,
                pages.findIndex((page) => page.parts.some((part) => part.post.post_id === newestId))
            );
            const saved = anchor.current;
            if (saved) {
                const found = pages.findIndex((p) =>
                    p.parts.some(
                        (part) =>
                            part.post.post_id === saved.id &&
                            part.start <= saved.offset &&
                            part.start + part.text.length >= saved.offset
                    )
                );
                if (found >= 0) startPage = found;
            }
            startPage = Math.floor(startPage / step) * step;
            const flip = new PageFlip(block, {
                width,
                height: layout.height,
                size: 'fixed',
                usePortrait: layout.single,
                autoSize: false,
                startPage,
                flippingTime: 420,
                maxShadowOpacity: 0.24,
                showCover: false,
                useMouseEvents: false,
                showPageCorners: false,
                mobileScrollSupport: false,
                disableFlipByClick: true
            });
            const state: Engine = { flip, pages, step, target: startPage, turns: 0, frame: 0 };
            engine.current = state;
            if (import.meta.env.DEV) (block as HTMLElement & { journalEngine?: PageFlip }).journalEngine = flip;
            flip.on('flip', sync);
            flip.on('changeState', (event) => {
                sync();
                if (event.data === 'read') state.frame = requestAnimationFrame(advance);
            });
            flip.loadFromHTML(pages.map((p) => p.element));
            sync();
            const seen = new Set<string>();
            const dates: IndexItem[] = [];
            pages.forEach((p, page) =>
                p.parts.forEach(({ post }) => {
                    const date = new Date(post.created_at).toLocaleDateString('zh-CN');
                    if (!seen.has(date)) {
                        seen.add(date);
                        dates.push({ date, page });
                    }
                })
            );
            setIndex(dates);
            const click = (event: MouseEvent) => {
                if (window.getSelection()?.toString()) return;
                const target = (event.target as HTMLElement).closest<HTMLElement>('.journal-entry');
                const post = target && feed.posts.find((p) => p.post_id === target.dataset.postId);
                if (post && flip.getState() === 'read') onDetailRef.current(post);
            };
            block.addEventListener('click', click);
            let drag: { x: number; y: number; moved: boolean; direction: number } | null = null;
            const point = (e: PointerEvent) => {
                const rect = flip.getUI().getDistElement().getBoundingClientRect();
                return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            };
            const down = (e: PointerEvent) => {
                const r = host.getBoundingClientRect();
                const x = e.clientX - r.left;
                if (
                    e.button !== 0 ||
                    e.clientY < r.bottom - 52 ||
                    (x > 42 && x < r.width - 42) ||
                    flip.getState() !== 'read'
                )
                    return;
                e.preventDefault();
                state.target = flip.getCurrentPageIndex();
                drag = { x: e.clientX, y: e.clientY, moved: false, direction: x < 42 ? -1 : 1 };
                host.setPointerCapture(e.pointerId);
                flip.getRender().start();
                if (!reduced.current) flip.startUserTouch(point(e));
            };
            const move = (e: PointerEvent) => {
                if (!drag || reduced.current) return;
                if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5) drag.moved = true;
                if (drag.moved) {
                    flip.getRender().start();
                    flip.userMove(point(e), true);
                }
            };
            const up = (e: PointerEvent) => {
                if (!drag) return;
                const previous = drag;
                drag = null;
                if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
                if (previous.moved && !reduced.current) {
                    flip.userStop(point(e));
                    // A user drag chooses its own destination; don't drive the
                    // automatic queue back to the old page after it settles.
                    state.target = -1;
                } else navigate(flip.getCurrentPageIndex() + previous.direction * step);
            };
            host.addEventListener('pointerdown', down);
            host.addEventListener('pointermove', move);
            host.addEventListener('pointerup', up);
            host.addEventListener('pointercancel', up);
            cleanup = () => {
                cancelAnimationFrame(state.frame);
                flip.getRender().stop();
                block.removeEventListener('click', click);
                host.removeEventListener('pointerdown', down);
                host.removeEventListener('pointermove', move);
                host.removeEventListener('pointerup', up);
                host.removeEventListener('pointercancel', up);
                flip.destroy();
                if (engine.current === state) engine.current = null;
            };
        });
        return () => {
            cancelled = true;
            cleanup();
        };
    }, [feed.posts, feed.profiles, feed.currentUserId, layout, sync, advance, navigate]);

    useEffect(() => {
        if (!active) {
            const state = engine.current;
            if (state) {
                state.target = state.flip.getCurrentPageIndex();
                state.flip.getRender().finishAnimation();
                state.target = state.flip.getCurrentPageIndex();
                cancelAnimationFrame(state.frame);
                state.flip.getRender().stop();
            }
        }
    }, [active]);

    const loadOlder = () => {
        setLoadAttempt(true);
        setLoadNotice('');
        feed.loadOlder();
    };
    useEffect(() => {
        if (!loadAttempt || feed.loadingOlder) return;
        const timer = window.setTimeout(
            () => setLoadNotice('若日期还未出现，可继续载入更早回忆；网络中断时请重试。'),
            500
        );
        return () => clearTimeout(timer);
    }, [loadAttempt, feed.loadingOlder, feed.posts]);

    const handlePublished = useCallback(() => {
        anchor.current = null;
        feed.reload();
    }, [feed]);
    const last = reading.total - (layout.single ? 1 : 2);
    return (
        <div
            className="journal-book"
            data-turning={reading.turning}
            data-single={layout.single}
            onKeyDown={(event) => {
                if (
                    event.target instanceof HTMLElement &&
                    (event.target.closest('input,textarea,.compose-open,.pd,.journal-index') ||
                        event.altKey ||
                        event.ctrlKey ||
                        event.metaKey)
                )
                    return;
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    const state = engine.current;
                    navigate(
                        (state?.target ?? reading.page) +
                            (event.key === 'ArrowRight' ? 1 : -1) * (layout.single ? 1 : 2)
                    );
                }
            }}
        >
            <div className="journal-engine-slot" ref={slot} aria-label="日记书页" />
            <span className="journal-binding" aria-hidden="true" />
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
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.stopPropagation();
                            setIndexOpen(false);
                        }
                    }}
                >
                    <header>
                        <b>按日子翻阅</b>
                        <button type="button" onClick={() => setIndexOpen(false)} aria-label="关闭目录">
                            ×
                        </button>
                    </header>
                    <p>已载入的回忆</p>
                    <div className="journal-index-dates">
                        {index.map((item) => (
                            <button
                                type="button"
                                key={item.date}
                                data-page={item.page}
                                onClick={() => {
                                    navigate(item.page);
                                    setIndexOpen(false);
                                }}
                            >
                                {item.date}
                                <span>翻到这里 →</span>
                            </button>
                        ))}
                    </div>
                    {!index.length && <p>第一段回忆，从今天开始。</p>}
                    <button
                        type="button"
                        className="journal-load"
                        onClick={() => {
                            navigate(reading.total - 1);
                            setIndexOpen(false);
                        }}
                    >
                        翻到末页
                    </button>
                    {feed.hasMore && (
                        <button type="button" className="journal-load" disabled={feed.loadingOlder} onClick={loadOlder}>
                            {feed.loadingOlder ? '正在载入…' : '载入更早的回忆'}
                        </button>
                    )}
                    {loadNotice && <p role="status">{loadNotice}</p>}
                    <button
                        type="button"
                        className="journal-load"
                        disabled={feed.status === 'loading'}
                        onClick={feed.reload}
                    >
                        刷新回忆
                    </button>
                </div>
            )}
            <div className="journal-pager">
                <button
                    type="button"
                    aria-label="上一页"
                    disabled={reading.page === 0 && !reading.turning}
                    onClick={() => navigate((engine.current?.target ?? reading.page) - (layout.single ? 1 : 2))}
                >
                    ‹
                </button>
                <span role="status" aria-live="polite">
                    {String(reading.page + 1).padStart(2, '0')}
                    {!layout.single && ` — ${String(reading.page + 2).padStart(2, '0')}`}{' '}
                    <small>/ {reading.total}</small>
                </span>
                <button
                    type="button"
                    aria-label="下一页"
                    disabled={reading.page >= last && !reading.turning}
                    onClick={() => navigate((engine.current?.target ?? reading.page) + (layout.single ? 1 : 2))}
                >
                    ›
                </button>
            </div>
            {feed.status === 'error' && (
                <div className="journal-status" role="alert">
                    回忆暂时没能载入。<button onClick={feed.reload}>重试</button>
                </div>
            )}
            {feed.status === 'loading' && (
                <div className="journal-status" role="status">
                    正在收好你们的回忆…
                </div>
            )}
            <ComposerComponent worldId={feed.worldId} onPublished={handlePublished} />
        </div>
    );
}
