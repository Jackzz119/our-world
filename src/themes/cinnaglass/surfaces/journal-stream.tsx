// journal-stream.tsx — our journal as a scrapbook (concept G1 in ai/design_system/codex-visual/memories/),
// one of the memory page's journal views (memory-views.ts): every entry is a paper card on the glass,
// oldest at the top and the newest at the bottom, right above the page being written; month tags
// stick while you scroll. It opens at the newest page, and scrolling up turns up older memories
// without the page jumping. In the centred desktop window the calendar index and the months sit in a
// side column beside the stream; on a phone the index pops over it from the page header. Who wrote
// what is ink colour, avatar and name — never a side of the page (ai/features/timeline.md §七).
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { UseFeed } from '@/hooks/useFeed';
import type { FeedPost } from '@/types/feed';
import { PARTNER, profileAvatar, VIEWER } from '@/themes/cinnaglass/cast';
import { IPencil } from '@/themes/cinnaglass/icons';
import { hashOf } from '@/themes/cinnaglass/surfaces/author-tone';
import { Composer } from '@/themes/cinnaglass/surfaces/composer';
import { fmtDay, fmtFullDate } from '@/themes/cinnaglass/surfaces/date-format';
import { JournalIndex } from '@/themes/cinnaglass/surfaces/journal-index';
import { monthKey, monthLabel, photosOf, type MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import type { JournalViewProps } from '@/themes/cinnaglass/surfaces/memory-views';
import { burst } from '@/themes/cinnaglass/ui/feedback';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import { showEntry } from '@/themes/cinnaglass/surfaces/show-entry';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';

type JournalStreamProps = JournalViewProps & {
    /** phone: the 目录 popover, opened from the page header */
    indexOpen: boolean;
    onIndexOpen: (open: boolean) => void;
};

// Past this much text an entry folds to a few lines with 展开全文.
const LONG_TEXT = 150;
const LONG_LINES = 5;
// Washi tape colours, picked per entry by hash (decoration, not identity).
const TAPES = ['#b9d3e6', '#efc3cf', '#efe1b4', '#cfe2c4'];

const clock = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function JournalStream({ feed, thumbUrls, open, onPhoto, focus, indexOpen, onIndexOpen }: JournalStreamProps) {
    const compact = useCompactUi();
    const scrollRef = useRef<HTMLDivElement>(null);
    const olderRef = useRef<HTMLButtonElement>(null);
    // distance from the bottom to keep while older entries are prepended
    const keepFromBottom = useRef<number | null>(null);
    const landed = useRef(false);
    const handledFocus = useRef<{ postId: string } | null>(null);
    const [writeSignal, setWriteSignal] = useState(0);
    // after 记下这一刻, the next new entry at the end is ours: it lands with a stamp
    const [awaiting, setAwaiting] = useState(false);
    const [fresh, setFresh] = useState<string | null>(null);
    const [seenPosts, setSeenPosts] = useState(feed.posts);
    if (feed.posts !== seenPosts) {
        setSeenPosts(feed.posts);
        const newest = feed.posts.at(-1);
        if (awaiting && newest && !seenPosts.some((p) => p.post_id === newest.post_id)) {
            setFresh(newest.post_id);
            setAwaiting(false);
        }
    }
    const posts = feed.posts;
    const ready = feed.status === 'ready' || posts.length > 0;

    const months: { key: string; label: string; posts: FeedPost[] }[] = [];
    for (const post of posts) {
        const key = monthKey(post.created_at);
        const last = months[months.length - 1];
        if (last?.key === key) last.posts.push(post);
        else months.push({ key, label: monthLabel(post.created_at), posts: [post] });
    }

    // Open at the newest page, once, the first time the stream is actually on screen with entries:
    // a closed page is still mounted but has no size, so wait for the scroller to get one.
    useEffect(() => {
        const scroll = scrollRef.current;
        if (!scroll || !open || !posts.length) return;
        const land = () => {
            if (landed.current || !scroll.clientHeight) return;
            landed.current = true;
            scroll.scrollTop = scroll.scrollHeight;
        };
        land();
        const observer = new ResizeObserver(land);
        observer.observe(scroll);
        return () => observer.disconnect();
    }, [open, posts.length]);

    // Older entries arrive above: keep the reader's distance from the bottom.
    useLayoutEffect(() => {
        const scroll = scrollRef.current;
        if (!scroll || keepFromBottom.current === null) return;
        scroll.scrollTop = scroll.scrollHeight - keepFromBottom.current;
        keepFromBottom.current = null;
    }, [posts]);

    const loadOlder = () => {
        const scroll = scrollRef.current;
        if (!scroll || !feed.hasMore || feed.loadingOlder) return;
        keepFromBottom.current = scroll.scrollHeight - scroll.scrollTop;
        feed.loadOlder();
    };
    const loadOlderRef = useRef(loadOlder);
    useLayoutEffect(() => {
        loadOlderRef.current = loadOlder;
    });

    // Reaching the top turns up older memories on its own (the button stays for keyboards).
    useEffect(() => {
        const target = olderRef.current;
        const root = scrollRef.current;
        if (!target || !root || !open || !feed.hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) loadOlderRef.current();
            },
            { root, rootMargin: '120px 0px 0px' }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [open, feed.hasMore, feed.loadingOlder]);

    // Our new entry: scroll down to it and let the stamp throw a little ink.
    useEffect(() => {
        const scroll = scrollRef.current;
        if (!scroll || !fresh) return;
        scroll.scrollTo({ top: scroll.scrollHeight, behavior: motionReduced() ? 'auto' : 'smooth' });
        const stamp = scroll.querySelector(`[data-post-id="${CSS.escape(fresh)}"] .mem-stamp`);
        const id = window.setTimeout(() => {
            if (stamp) burst(stamp, { glyphs: ['✦', '·', '✧'], count: 9, spread: 150, distance: 58, color: '#b3542f' });
        }, 420);
        return () => window.clearTimeout(id);
    }, [fresh]);

    // A jump from the calendar or the photo wall: bring the entry to the middle and let it glow.
    useLayoutEffect(() => {
        const scroll = scrollRef.current;
        if (!scroll || !open || !focus || handledFocus.current === focus) return;
        if (showEntry(scroll, focus.postId)) handledFocus.current = focus;
    }, [focus, open, posts]);

    const published = () => {
        setAwaiting(true);
        feed.reload();
    };
    const write = () => {
        setWriteSignal((n) => n + 1);
        const scroll = scrollRef.current;
        scroll?.scrollTo({ top: scroll.scrollHeight, behavior: motionReduced() ? 'auto' : 'smooth' });
    };

    // The month the reader is in, for the side column's month list.
    const [inMonth, setInMonth] = useState<string | null>(null);
    const scrollFrame = useRef(0);
    const trackMonth = () => {
        cancelAnimationFrame(scrollFrame.current);
        scrollFrame.current = requestAnimationFrame(() => {
            const scroll = scrollRef.current;
            if (!scroll) return;
            let current: string | null = null;
            for (const section of scroll.querySelectorAll<HTMLElement>('.mem-month'))
                if (section.offsetTop <= scroll.scrollTop + scroll.clientHeight / 3)
                    current = section.dataset.month ?? null;
            setInMonth(current);
        });
    };
    const goMonth = (key: string) => {
        const scroll = scrollRef.current;
        const section = scroll?.querySelector<HTMLElement>(`.mem-month[data-month="${key}"]`);
        if (!scroll || !section) return;
        scroll.scrollTo({ top: section.offsetTop - 4, behavior: motionReduced() ? 'auto' : 'smooth' });
    };
    const index = (docked: boolean) => (
        <JournalIndex
            posts={posts}
            currentUserId={feed.currentUserId}
            hasMore={feed.hasMore}
            loadingOlder={feed.loadingOlder}
            onLoadOlder={loadOlder}
            onReload={feed.reload}
            onPick={(postId) => {
                if (!docked) onIndexOpen(false);
                if (scrollRef.current) showEntry(scrollRef.current, postId);
            }}
            onClose={() => onIndexOpen(false)}
            docked={docked}
        />
    );

    return (
        <div className="mem-scrapbook" data-layout={compact ? 'stack' : 'docked'}>
            {!compact && (
                <aside className="mem-side" aria-label="目录">
                    {index(true)}
                    {months.length > 0 && (
                        <nav className="mem-months" aria-label="按月翻">
                            {[...months].reverse().map((month) => (
                                <button
                                    type="button"
                                    key={month.key}
                                    className="mem-month-link"
                                    aria-current={(inMonth ?? months.at(-1)?.key) === month.key || undefined}
                                    onClick={() => goMonth(month.key)}
                                >
                                    <span>{month.label}</span>
                                    <small>{month.posts.length} 页</small>
                                </button>
                            ))}
                        </nav>
                    )}
                </aside>
            )}
            <div className="mem-stream">
                <div className="mem-scroll" ref={scrollRef} onScroll={compact ? undefined : trackMonth}>
                    {feed.hasMore ? (
                        <button
                            type="button"
                            ref={olderRef}
                            className="mem-older"
                            disabled={feed.loadingOlder}
                            onClick={loadOlder}
                        >
                            {feed.loadingOlder && <span className="ui-spinner" aria-hidden="true" />}
                            {feed.loadingOlder ? '正在往前翻…' : '翻出更早的回忆'}
                        </button>
                    ) : (
                        posts.length > 0 && (
                            <p className="mem-first">
                                这本日记从 {fmtFullDate(posts[0].created_at).split(' · ')[0]} 开始
                            </p>
                        )
                    )}
                    {months.map((month) => (
                        <section className="mem-month" key={month.key} data-month={month.key} aria-label={month.label}>
                            <h3 className="mem-month-tag">
                                <span>{month.label}</span>
                            </h3>
                            {month.posts.map((post) => (
                                <JournalEntry
                                    key={post.post_id}
                                    post={post}
                                    feed={feed}
                                    thumbUrls={thumbUrls}
                                    onPhoto={onPhoto}
                                    fresh={post.post_id === fresh}
                                />
                            ))}
                        </section>
                    ))}
                    {!ready && feed.status === 'loading' && (
                        <div className="mem-skeleton" role="status" aria-label="正在收好你们的回忆">
                            <i />
                            <i />
                            <i />
                        </div>
                    )}
                    {feed.status === 'error' && !posts.length && (
                        <div className="mem-note mem-paper" role="alert">
                            <p>回忆暂时没能载入。</p>
                            <button type="button" className="mem-note-btn" onClick={feed.reload}>
                                再试一次
                            </button>
                        </div>
                    )}
                    {feed.status === 'ready' && !posts.length && (
                        // ART-REQUEST ART-05: a spot illustration goes above the title
                        <div className="mem-note mem-paper">
                            <p className="mem-note-title">第一页，从今天开始。</p>
                            <p>写下今天的一件小事，或者放一张照片进来。</p>
                            <button type="button" className="mem-note-btn" onClick={write}>
                                <IPencil size={16} /> 写下第一页
                            </button>
                        </div>
                    )}
                </div>
                <div className="mem-compose">
                    <Composer
                        worldId={feed.worldId}
                        onPublished={published}
                        openSignal={writeSignal}
                        submit={feed.publish}
                        draftKey="journal"
                    />
                </div>
            </div>
            {compact && indexOpen && index(false)}
        </div>
    );
}

// One page of the journal: who and when, the photos taped on, then the words. Every journal view
// that shows pages as paper uses this card.
export function JournalEntry({
    post,
    feed,
    thumbUrls,
    onPhoto,
    fresh
}: {
    post: FeedPost;
    feed: UseFeed;
    thumbUrls: Record<string, string>;
    onPhoto: (photos: MemoryPhoto[], index: number) => void;
    fresh: boolean;
}) {
    const [unfolded, setUnfolded] = useState(false);
    const mine = post.author_id === feed.currentUserId;
    const profile = feed.profiles[post.author_id];
    const name = mine ? '我' : profile?.display_name || 'TA';
    const text = post.visible_content ?? '';
    const photos = photosOf(post, thumbUrls);
    const long = text.length > LONG_TEXT || text.split('\n').length > LONG_LINES;
    const hash = hashOf(post.post_id);
    const style = {
        '--tilt': `${((hash % 7) - 3) * 0.22}deg`,
        '--tape': TAPES[hash % TAPES.length]
    } as CSSProperties;
    return (
        <article
            className="mem-entry mem-paper"
            data-author={mine ? 'mine' : 'theirs'}
            data-post-id={post.post_id}
            data-fresh={fresh || undefined}
            style={style}
        >
            <header className="mem-entry-hd">
                <img className="mem-ava" src={profileAvatar(profile?.avatar_url, mine ? VIEWER : PARTNER)} alt="" />
                <b className="mem-who">{name}</b>
                <time dateTime={post.created_at}>
                    {fmtDay(post.created_at)} · {clock(post.created_at)}
                </time>
            </header>
            {photos.length > 0 && <PhotoStrip photos={photos} onPhoto={onPhoto} />}
            {text && (
                <p className="mem-text" data-folded={(long && !unfolded) || undefined}>
                    {text}
                </p>
            )}
            {!text && !photos.length && post.is_placeholder && <p className="mem-text">这段回忆暂时珍藏着。</p>}
            {long && (
                <button
                    type="button"
                    className="mem-more"
                    aria-expanded={unfolded}
                    onClick={() => setUnfolded((open) => !open)}
                >
                    {unfolded ? '收起' : '展开全文'}
                </button>
            )}
            {fresh && (
                <span className="mem-stamp" aria-hidden="true">
                    记
                </span>
            )}
        </article>
    );
}

// The photos taped onto a page: one wide, two side by side, three as one big and two small,
// then a grid of up to six with the rest counted on the last.
export function PhotoStrip({
    photos,
    onPhoto
}: {
    photos: MemoryPhoto[];
    onPhoto: (photos: MemoryPhoto[], index: number) => void;
}) {
    const shown = photos.slice(0, 6);
    const extra = photos.length - shown.length;
    return (
        <div className="mem-photos" data-count={shown.length}>
            {shown.map((photo, i) => (
                <button
                    type="button"
                    key={photo.key}
                    className="mem-photo"
                    aria-label={`查看照片，第 ${i + 1} 张，共 ${photos.length} 张`}
                    onClick={() => onPhoto(photos, i)}
                >
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
                    {i === shown.length - 1 && extra > 0 && <span className="mem-photo-more">+{extra}</span>}
                </button>
            ))}
        </div>
    );
}
