// journal-calendar.tsx — 日历手账 (concept G3 in ai/design_system/codex-visual/memories/), one of the
// memory page's journal views (memory-views.ts): the journal looked up by its days. On a desktop the
// month is a paper page on the left — a day we wrote on carries a dot in the writer's ink and a tiny
// polaroid of its first photo — and the right holds that day's pages (the scrapbook's paper cards)
// with the page being written underneath. On a phone a strip of the month's days runs over the pages,
// and a sideways swipe turns to the written day before or after. Who wrote what is ink colour, avatar
// and name — never a side of the page (ai/features/timeline.md §七).
import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode
} from 'react';
import type { FeedPost } from '@/types/feed';
import { IChevron, IPencil } from '@/themes/cinnaglass/icons';
import { hashOf } from '@/themes/cinnaglass/surfaces/author-tone';
import { Composer } from '@/themes/cinnaglass/surfaces/composer';
import { JournalEntry } from '@/themes/cinnaglass/surfaces/journal-stream';
import { photosOf, type MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import type { JournalViewProps } from '@/themes/cinnaglass/surfaces/memory-views';
import { showEntry } from '@/themes/cinnaglass/surfaces/show-entry';
import { burst } from '@/themes/cinnaglass/ui/feedback';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import '@/themes/cinnaglass/surfaces/journal-calendar.css';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
// A swipe this far (px), or this fast (px per ms), turns to the next written day (as in the lightbox).
const TURN_PX = 64;
const FLICK = 0.45;
const TURN_OUT_MS = 170;
const LEAVE_MS = 160;

// Days are local midnights, so two of them compare by time.
const dayOf = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const lastOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
// The same date n months on; the 31st becomes the last day of a shorter month.
const shiftMonth = (d: Date, n: number) => {
    const first = addMonths(d, n);
    return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), lastOfMonth(first).getDate()));
};
// "9 月 21 日", with the year when it is not this one.
const dayLabel = (d: Date, today: Date) =>
    `${d.getFullYear() === today.getFullYear() ? '' : `${d.getFullYear()} 年 `}${d.getMonth() + 1} 月 ${d.getDate()} 日`;

type Day = { posts: FeedPost[]; mine: boolean; theirs: boolean; photo: MemoryPhoto | null; photos: number };
// What the reader chose: a day, a month (its newest written day), or nothing yet (the newest written day).
type Pick = { day: Date } | { month: Date } | null;
// a sideways drag on the pages: where it began, its last move and the speed of that move (px per ms)
type Drag = {
    id: number;
    x0: number;
    y0: number;
    x: number;
    t: number;
    vx: number;
    axis: 'x' | 'y' | null;
    dx: number;
};

// The loaded entries by day, and the written days in order (the feed is oldest → newest).
function byDay(posts: FeedPost[], currentUserId: string | null, thumbUrls: Record<string, string>) {
    const days = new Map<string, Day>();
    const written: Date[] = [];
    for (const post of posts) {
        const date = dayOf(post.created_at);
        const mine = post.author_id === currentUserId;
        const photos = photosOf(post, thumbUrls);
        let day = days.get(dayKey(date));
        if (!day) {
            day = { posts: [], mine: false, theirs: false, photo: null, photos: 0 };
            days.set(dayKey(date), day);
            written.push(date);
        }
        day.posts.push(post);
        day.mine ||= mine;
        day.theirs ||= !mine;
        day.photo ??= photos[0] ?? null;
        day.photos += photos.length;
    }
    return { days, written };
}

export function JournalCalendar({ feed, thumbUrls, open, onPhoto, focus }: JournalViewProps) {
    const compact = useCompactUi();
    const titleId = useId();
    const pagesRef = useRef<HTMLDivElement>(null);
    // the day's pages: the part a swipe carries
    const leafRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);
    // after a key press moved the roving day, focus follows it into the redrawn grid or strip
    const wantFocus = useRef<'grid' | 'strip' | null>(null);
    const handledFocus = useRef<{ postId: string } | null>(null);
    const askedOlder = useRef<FeedPost[] | null>(null);
    const centredMonth = useRef<string | null>(null);
    const drag = useRef<Drag | null>(null);
    const dragEndedAt = useRef(-1e9);

    const posts = feed.posts;
    const ready = feed.status === 'ready' || posts.length > 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const { days, written } = byDay(posts, feed.currentUserId, thumbUrls);
    const newest = written.at(-1);
    const oldest = written[0];

    const [pick, setPick] = useState<Pick>(null);
    // the desktop calendar turns to other months without changing the day that is open
    const [month, setMonth] = useState<Date | null>(null);
    const [cursor, setCursor] = useState<Date | null>(null);
    // which way the last turn went (1 = later): the pages and the month slide in from that side
    const [dayStep, setDayStep] = useState(0);
    const [monthStep, setMonthStep] = useState(0);
    const [writeSignal, setWriteSignal] = useState(0);
    // after 记下这一刻, the next new entry at the end is ours: its day opens and it lands with a stamp
    const [awaiting, setAwaiting] = useState(false);
    const [fresh, setFresh] = useState<string | null>(null);
    const [seenPosts, setSeenPosts] = useState(posts);
    const [jumped, setJumped] = useState<{ postId: string } | null>(null);

    // The calendar reaches from the earliest loaded month (one more while older pages remain) to this month.
    const latest = firstOfMonth(newest && newest > today ? newest : today);
    const earliest = oldest ? firstOfMonth(oldest) : latest;
    const floor = feed.hasMore ? addMonths(earliest, -1) : earliest;
    const lastDay = lastOfMonth(latest);
    const clampMonth = (m: Date) => (m < floor ? floor : m > latest ? latest : m);
    const clampDay = (d: Date) => (d < floor ? floor : d > lastDay ? lastDay : d);
    // the newest written day of a month, else today in this month, else its first day
    const dayIn = (m: Date) =>
        [...written].reverse().find((d) => sameMonth(d, m)) ?? (sameMonth(today, m) ? today : firstOfMonth(m));
    const selected = pick === null ? (newest ?? today) : 'day' in pick ? pick.day : dayIn(pick.month);
    const shown = clampMonth(!compact && month ? month : firstOfMonth(selected));
    const selectedKey = dayKey(selected);
    const shownKey = dayKey(shown);
    // Days before the oldest loaded entry are not known while older pages remain.
    const known = feed.hasMore && oldest ? oldest : null;
    const isUnknown = (d: Date) => !!known && d < known;
    const needOlder = open && isUnknown(shown);

    const select = (day: Date) => {
        if (sameDay(day, selected)) return;
        setDayStep(day > selected ? 1 : -1);
        if (!sameMonth(day, shown)) setMonthStep(day > shown ? 1 : -1);
        setPick({ day });
        setMonth(firstOfMonth(day));
        setCursor(day);
    };
    // The day being left fades out the other way while the next one comes in. React has already
    // replaced its page by the time the new day is drawn, so a snapshot of it does the leaving.
    const leave = (step: number) => {
        const scroll = pagesRef.current;
        const page = leafRef.current;
        if (!scroll || !page || motionReduced()) return;
        const ghost = page.cloneNode(true) as HTMLElement;
        ghost.className = 'jcal-leaf jcal-leaf-ghost';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.inert = true;
        // nothing may find the snapshot: not showEntry, not the lightbox growing out of a thumbnail
        for (const el of ghost.querySelectorAll('[data-post-id], [data-photo-key]')) {
            el.removeAttribute('data-post-id');
            el.removeAttribute('data-photo-key');
        }
        Object.assign(ghost.style, {
            top: `${page.offsetTop - scroll.scrollTop}px`,
            left: `${page.offsetLeft}px`,
            width: `${page.offsetWidth}px`
        });
        scroll.append(ghost);
        ghost
            .animate([{ opacity: 1 }, { opacity: 0, translate: `${-step * 28}px 0` }], {
                duration: LEAVE_MS,
                easing: 'cubic-bezier(0.4, 0, 1, 1)',
                fill: 'forwards'
            })
            .finished.catch(() => undefined)
            .then(() => ghost.remove());
    };
    // A day chosen by the reader (a tap, a key, a button): the snapshot leaves, the day opens.
    const go = (day: Date) => {
        if (sameDay(day, selected)) return;
        leave(day > selected ? 1 : -1);
        select(day);
    };

    if (posts !== seenPosts) {
        setSeenPosts(posts);
        const last = posts.at(-1);
        if (awaiting && last && !seenPosts.some((p) => p.post_id === last.post_id)) {
            setFresh(last.post_id);
            setAwaiting(false);
            select(dayOf(last.created_at));
        }
    }
    // A jump from the photo wall opens that entry's day (once it is loaded); an effect then centres it.
    if (focus && focus !== jumped) {
        const post = posts.find((p) => p.post_id === focus.postId);
        if (post) {
            setJumped(focus);
            select(dayOf(post.created_at));
        }
    }

    const prev = [...written].reverse().find((d) => d < selected) ?? null;
    const next = written.find((d) => d > selected) ?? null;
    const day = days.get(selectedKey);
    const isToday = sameDay(selected, today);
    const selectedUnknown = isUnknown(selected);
    const partnerId =
        feed.world && (feed.world.owner_id === feed.currentUserId ? feed.world.member_id : feed.world.owner_id);
    const partner = (partnerId && feed.profiles[partnerId]?.display_name) || 'TA';

    // The roving day of the grid: the one Tab lands on and the arrows move.
    const cursorDay =
        cursor && sameMonth(cursor, shown)
            ? cursor
            : sameMonth(selected, shown)
              ? selected
              : sameMonth(today, shown)
                ? today
                : shown;
    const flip = (n: 1 | -1) => {
        const to = addMonths(shown, n);
        if (to < floor || to > latest) return;
        setMonthStep(n);
        setMonth(to);
        if (compact) {
            // the strip is the month: its newest written day opens with it
            leave(n);
            setDayStep(n);
            setPick({ month: to });
            setCursor(null);
        } else setCursor(clampDay(shiftMonth(cursorDay, n)));
    };
    const moveCursor = (to: Date) => {
        const target = clampDay(to);
        wantFocus.current = 'grid';
        setCursor(target);
        if (!sameMonth(target, shown)) {
            setMonthStep(target > shown ? 1 : -1);
            setMonth(firstOfMonth(target));
        }
    };
    const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
        const at = cursorDay;
        const moves: Record<string, () => Date> = {
            ArrowLeft: () => addDays(at, -1),
            ArrowRight: () => addDays(at, 1),
            ArrowUp: () => addDays(at, -7),
            ArrowDown: () => addDays(at, 7),
            Home: () => addDays(at, -at.getDay()),
            End: () => addDays(at, 6 - at.getDay()),
            PageUp: () => shiftMonth(at, event.shiftKey ? -12 : -1),
            PageDown: () => shiftMonth(at, event.shiftKey ? 12 : 1)
        };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        moveCursor(move());
    };
    // The strip is a listbox: the arrows choose the day before or after.
    const onStripKey = (event: KeyboardEvent<HTMLDivElement>) => {
        const moves: Record<string, () => Date> = {
            ArrowLeft: () => addDays(selected, -1),
            ArrowRight: () => addDays(selected, 1),
            Home: () => shown,
            End: () => lastOfMonth(shown)
        };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        wantFocus.current = 'strip';
        go(clampDay(move()));
    };
    useLayoutEffect(() => {
        const where = wantFocus.current;
        if (!where) return;
        wantFocus.current = null;
        const host = where === 'grid' ? gridRef.current : stripRef.current;
        host?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true });
    });

    // Turning back past the loaded pages fetches older ones until the month is covered. A failed fetch
    // leaves the pages as they were and is not retried on its own (the calendar offers a button).
    const { loadOlder } = feed;
    useEffect(() => {
        if (!needOlder || feed.loadingOlder || askedOlder.current === posts) return;
        askedOlder.current = posts;
        loadOlder();
    }, [needOlder, feed.loadingOlder, posts, loadOlder]);

    // Phone: the chosen day's chip comes to the middle of the strip (at once in a newly drawn month).
    // The page opens after its views mount, so a strip without a size yet waits until it has one.
    useLayoutEffect(() => {
        const strip = stripRef.current;
        if (!compact || !open || !strip) return;
        const centre = () => {
            const chip = strip.querySelector<HTMLElement>('[aria-selected="true"]');
            if (!chip || !strip.clientWidth) return false;
            const jump = centredMonth.current !== shownKey || motionReduced();
            centredMonth.current = shownKey;
            strip.scrollTo({
                left: Math.max(0, chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2),
                behavior: jump ? 'auto' : 'smooth'
            });
            return true;
        };
        if (centre()) return;
        const sized = new ResizeObserver(() => {
            if (centre()) sized.disconnect();
        });
        sized.observe(strip);
        return () => sized.disconnect();
    }, [compact, open, selectedKey, shownKey]);

    // Our new entry: bring it into view and let the stamp throw a little ink.
    useEffect(() => {
        const scroll = pagesRef.current;
        const entry = fresh && scroll?.querySelector<HTMLElement>(`[data-post-id="${CSS.escape(fresh)}"]`);
        if (!scroll || !entry) return;
        scroll.scrollTo({ top: scroll.scrollHeight, behavior: motionReduced() ? 'auto' : 'smooth' });
        const stamp = entry.querySelector('.mem-stamp');
        const id = window.setTimeout(() => {
            if (stamp) burst(stamp, { glyphs: ['✦', '·', '✧'], count: 9, spread: 150, distance: 58, color: '#b3542f' });
        }, 420);
        return () => window.clearTimeout(id);
    }, [fresh]);

    // A newly opened day starts at its first page.
    useLayoutEffect(() => {
        pagesRef.current?.scrollTo({ top: 0 });
    }, [selectedKey]);

    // A jump from the photo wall: once its day is open, bring the entry to the middle and let it glow.
    useLayoutEffect(() => {
        const scroll = pagesRef.current;
        if (!scroll || !open || !focus || handledFocus.current === focus) return;
        if (showEntry(scroll, focus.postId)) handledFocus.current = focus;
    }, [focus, open, posts, selectedKey]);

    const published = () => {
        setAwaiting(true);
        go(today);
        feed.reload();
    };
    const write = () => setWriteSignal((n) => n + 1);

    // Phone: a sideways swipe on the pages turns to the written day before or after; the pages follow
    // the finger and spring back when the swipe is too short. Vertical drags stay the browser's scroll.
    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (!compact || event.pointerType === 'mouse' || !event.isPrimary) return;
        drag.current = {
            id: event.pointerId,
            x0: event.clientX,
            y0: event.clientY,
            x: event.clientX,
            t: event.timeStamp,
            vx: 0,
            axis: null,
            dx: 0
        };
    };
    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        const leaf = leafRef.current;
        if (!d || !leaf || event.pointerId !== d.id) return;
        d.dx = event.clientX - d.x0;
        const dt = event.timeStamp - d.t;
        if (dt > 0) {
            d.vx = 0.7 * ((event.clientX - d.x) / dt) + 0.3 * d.vx;
            d.x = event.clientX;
            d.t = event.timeStamp;
        }
        if (!d.axis) {
            const dy = event.clientY - d.y0;
            if (Math.hypot(d.dx, dy) < 8) return;
            d.axis = Math.abs(d.dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
            if (d.axis === 'y') {
                drag.current = null;
                return;
            }
            pagesRef.current?.setPointerCapture(event.pointerId);
            leaf.dataset.dragging = '';
        }
        if (motionReduced()) return;
        // resist where there is no written day to turn to
        const target = d.dx < 0 ? next : prev;
        leaf.style.translate = `${target ? d.dx : d.dx * 0.3}px 0`;
    };
    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        const leaf = leafRef.current;
        if (!d || event.pointerId !== d.id) return;
        drag.current = null;
        if (!leaf || d.axis !== 'x') return;
        dragEndedAt.current = event.timeStamp;
        delete leaf.dataset.dragging;
        const target = d.dx < 0 ? next : prev;
        // a flick counts by how fast the finger was still moving as it lifted
        const fast = Math.abs(d.vx) > FLICK && Math.sign(d.vx) === Math.sign(d.dx) && event.timeStamp - d.t < 90;
        if (!target || event.type === 'pointercancel' || (Math.abs(d.dx) < TURN_PX && !fast)) {
            leaf.style.translate = '';
            return;
        }
        if (motionReduced()) {
            select(target);
            return;
        }
        // carry on the way it was thrown; the day it turns to then comes in from the other side
        leaf.animate([{ opacity: 0, translate: `${Math.sign(d.dx) * leaf.offsetWidth * 0.7}px 0` }], {
            duration: TURN_OUT_MS,
            easing: 'cubic-bezier(0.4, 0, 1, 1)',
            fill: 'forwards'
        })
            .finished.catch(() => undefined)
            .then(() => select(target));
    };

    let sub: string;
    if (!ready) sub = feed.status === 'error' ? '可能是网络打了个盹。' : '正在翻开日记…';
    else if (selectedUnknown) sub = feed.loadingOlder ? '正在往前翻…' : '这一天还没翻到。';
    else if (day) sub = `${isToday ? '今天' : '这一天'}写了 ${day.posts.length} 页`;
    else if (awaiting && isToday) sub = '正在收好这一页…';
    else if (selected > today) sub = '这一天还没到。';
    else sub = isToday ? '今天还空着。' : '这一天还空着。';

    let leaf: ReactNode;
    if (!ready && feed.status === 'loading') leaf = <PaperSkeleton />;
    else if (feed.status === 'error' && !posts.length)
        leaf = (
            <div className="mem-note mem-paper" role="alert">
                <p>回忆暂时没能载入。</p>
                <button type="button" className="mem-note-btn" onClick={feed.reload}>
                    再试一次
                </button>
            </div>
        );
    else if (!posts.length)
        leaf = (
            <div className="mem-note mem-paper">
                <img className="mem-note-art" src="/ui/memory/empty-journal.webp" alt="" width={96} height={96} />
                <p className="mem-note-title">第一页，从今天开始。</p>
                <p>写下今天的一件小事，或者放一张照片进来。</p>
                <button type="button" className="mem-note-btn" onClick={write}>
                    <IPencil size={16} /> 写下第一页
                </button>
            </div>
        );
    else if (selectedUnknown)
        leaf = (
            <div className="jcal-blank">
                {feed.loadingOlder ? (
                    <p className="jcal-blank-title" role="status">
                        <span className="jcal-spin" aria-hidden="true" />
                        正在往前翻…
                    </p>
                ) : (
                    <>
                        <p className="jcal-blank-title">这一天还没翻到。</p>
                        <button type="button" className="mem-note-btn" onClick={loadOlder}>
                            载入更早的回忆
                        </button>
                    </>
                )}
            </div>
        );
    else if (day)
        leaf = day.posts.map((post) => (
            <JournalEntry
                key={post.post_id}
                post={post}
                feed={feed}
                thumbUrls={thumbUrls}
                onPhoto={onPhoto}
                fresh={post.post_id === fresh}
            />
        ));
    else if (awaiting && isToday) leaf = null;
    else if (selected > today)
        leaf = (
            <div className="jcal-blank">
                <p className="jcal-blank-hint">到那天再来写吧。</p>
            </div>
        );
    else if (isToday)
        leaf = (
            <div className="jcal-blank">
                <p className="jcal-blank-title">今天发生了什么？</p>
                <button type="button" className="mem-note-btn" onClick={write}>
                    <IPencil size={16} /> 写一页
                </button>
            </div>
        );
    else
        leaf = (
            <div className="jcal-blank">
                <p className="jcal-blank-title">空白的一页</p>
                <p className="jcal-blank-hint">有墨点的日子里写着日记。</p>
            </div>
        );

    const who = (info: Day) => (info.mine && info.theirs ? '我们都写了' : info.mine ? '我写的' : `${partner}写的`);
    const ariaDay = (date: Date, info: Day | undefined) =>
        `${dayLabel(date, today)} 星期${WEEKDAYS[date.getDay()]}${sameDay(date, today) ? '，今天' : ''}，${
            info
                ? `${who(info)} ${info.posts.length} 页${info.photos ? '，有照片' : ''}`
                : isUnknown(date)
                  ? '还没翻到'
                  : '还空着'
        }`;
    const ink = (info: Day) => (
        <>
            {info.mine && <i data-author="mine" />}
            {info.theirs && <i data-author="theirs" />}
        </>
    );
    const flipButtons = (className: string) => (
        <>
            <button
                type="button"
                className={className}
                aria-label="上个月"
                disabled={shown <= floor}
                onClick={() => flip(-1)}
            >
                <IChevron size={20} style={{ rotate: '180deg' }} />
            </button>
            <button
                type="button"
                className={className}
                aria-label="下个月"
                disabled={shown >= latest}
                onClick={() => flip(1)}
            >
                <IChevron size={20} />
            </button>
        </>
    );

    let calendar: ReactNode;
    if (compact) {
        const monthDays = Array.from({ length: lastOfMonth(shown).getDate() }, (_, i) => addDays(shown, i));
        const hasStop = monthDays.some((date) => sameDay(date, selected));
        calendar = (
            <div className="jcal-top">
                <header className="jcal-strip-hd">
                    <h3 className="jcal-title" id={titleId} aria-live="polite">
                        {shown.getFullYear()} 年 {shown.getMonth() + 1} 月
                    </h3>
                    {isUnknown(shown) && feed.loadingOlder && (
                        <span className="jcal-strip-note" role="status">
                            <span className="jcal-spin" aria-hidden="true" />
                            往前翻…
                        </span>
                    )}
                    {flipButtons('ui-icon-button jcal-flip')}
                </header>
                <div
                    ref={stripRef}
                    key={shownKey}
                    className="jcal-strip"
                    role="listbox"
                    aria-labelledby={titleId}
                    aria-orientation="horizontal"
                    style={{ '--from': `${monthStep * 48}px` } as CSSProperties}
                    onKeyDown={onStripKey}
                >
                    {monthDays.map((date, i) => {
                        const info = days.get(dayKey(date));
                        const chosen = sameDay(date, selected);
                        return (
                            <button
                                type="button"
                                role="option"
                                key={i}
                                className="jcal-chip"
                                aria-selected={chosen}
                                aria-current={sameDay(date, today) ? 'date' : undefined}
                                aria-label={ariaDay(date, info)}
                                tabIndex={chosen || (!hasStop && i === 0) ? 0 : -1}
                                data-written={!!info || undefined}
                                data-today={sameDay(date, today) || undefined}
                                data-future={date > today || undefined}
                                data-unknown={isUnknown(date) || undefined}
                                style={{ '--i': i } as CSSProperties}
                                onClick={() => go(date)}
                            >
                                <span className="jcal-chip-wd" aria-hidden="true">
                                    {WEEKDAYS[date.getDay()]}
                                </span>
                                <span className="jcal-chip-num" aria-hidden="true">
                                    {date.getDate()}
                                </span>
                                <span className="jcal-ink" aria-hidden="true">
                                    {info && ink(info)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    } else {
        const start = addDays(shown, -shown.getDay());
        const weeks = Array.from({ length: 6 }, (_, w) =>
            Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d))
        );
        const partial = isUnknown(shown);
        const monthPages = written
            .filter((d) => sameMonth(d, shown))
            .reduce((n, d) => n + (days.get(dayKey(d))?.posts.length ?? 0), 0);
        calendar = (
            <section className="jcal-cal mem-paper" aria-labelledby={titleId}>
                <header className="jcal-cal-hd">
                    <h3 className="jcal-title" id={titleId} aria-live="polite">
                        {shown.getFullYear()} 年 <span className="jcal-title-m">{shown.getMonth() + 1}</span> 月
                    </h3>
                    {flipButtons('jcal-flip')}
                </header>
                <div className="jcal-grid" role="grid" aria-labelledby={titleId} ref={gridRef} onKeyDown={onGridKey}>
                    <div className="jcal-wds" role="row">
                        {WEEKDAYS.map((w) => (
                            <span key={w} className="jcal-wd" role="columnheader" aria-label={`星期${w}`}>
                                {w}
                            </span>
                        ))}
                    </div>
                    <div
                        className="jcal-weeks"
                        role="rowgroup"
                        key={shownKey}
                        data-loading={(partial && feed.loadingOlder) || undefined}
                        style={{ '--from': `${monthStep * 40}px` } as CSSProperties}
                    >
                        {weeks.map((week, w) => (
                            <div className="jcal-week" role="row" key={w}>
                                {week.map((date, d) => {
                                    const info = days.get(dayKey(date));
                                    const inMonth = sameMonth(date, shown);
                                    const chosen = sameDay(date, selected);
                                    return (
                                        <div className="jcal-slot" role="gridcell" key={d} aria-selected={chosen}>
                                            {date >= floor && date <= lastDay ? (
                                                <button
                                                    type="button"
                                                    className="jcal-cell"
                                                    tabIndex={sameDay(date, cursorDay) ? 0 : -1}
                                                    aria-label={ariaDay(date, info)}
                                                    aria-current={sameDay(date, today) ? 'date' : undefined}
                                                    data-out={!inMonth || undefined}
                                                    data-written={!!info || undefined}
                                                    data-selected={chosen || undefined}
                                                    data-today={sameDay(date, today) || undefined}
                                                    data-future={date > today || undefined}
                                                    data-unknown={isUnknown(date) || undefined}
                                                    style={{ '--i': w * 7 + d } as CSSProperties}
                                                    onClick={() => {
                                                        // a day of the month around: the grid turns, focus stays on the day
                                                        if (!inMonth) wantFocus.current = 'grid';
                                                        go(date);
                                                    }}
                                                >
                                                    <span className="jcal-num" aria-hidden="true">
                                                        {date.getDate()}
                                                    </span>
                                                    {info && (
                                                        <span className="jcal-ink" aria-hidden="true">
                                                            {ink(info)}
                                                        </span>
                                                    )}
                                                    {info?.photo && inMonth && (
                                                        <Snapshot photo={info.photo} more={info.photos > 1} />
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="jcal-cell" data-out data-off aria-hidden="true">
                                                    <span className="jcal-num">{date.getDate()}</span>
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <footer className="jcal-cal-ft">
                    {partial ? (
                        feed.loadingOlder ? (
                            <span className="jcal-older" role="status">
                                <span className="jcal-spin" aria-hidden="true" />
                                正在往前翻…
                            </span>
                        ) : (
                            <button type="button" className="jcal-older" onClick={loadOlder}>
                                这个月还没翻全，载入更早的回忆
                            </button>
                        )
                    ) : (
                        ready && (
                            <span className="jcal-count">
                                {monthPages ? `这个月写了 ${monthPages} 页` : `${shown.getMonth() + 1} 月还空着`}
                            </span>
                        )
                    )}
                    <span className="jcal-legend" aria-hidden="true">
                        <span>
                            <i data-author="mine" />我
                        </span>
                        <span>
                            <i data-author="theirs" />
                            {partner}
                        </span>
                    </span>
                </footer>
            </section>
        );
    }

    return (
        <div className="jcal" data-layout={compact ? 'strip' : 'split'}>
            {calendar}
            <header className="jcal-dayhead">
                <div className="jcal-dayhead-text" aria-live="polite" aria-atomic="true">
                    <h3 className="jcal-daytitle">
                        {dayLabel(selected, today)}
                        <small> · 星期{WEEKDAYS[selected.getDay()]}</small>
                        {isToday && <span className="jcal-today-tag">今天</span>}
                    </h3>
                    <p className="jcal-daysub">{sub}</p>
                </div>
                <div className="jcal-turn" hidden={!written.length}>
                    <button
                        type="button"
                        className="jcal-turn-btn"
                        disabled={!prev}
                        data-none={!prev || undefined}
                        aria-label={prev ? `上一篇：${dayLabel(prev, today)}` : '没有更早的了'}
                        onClick={() => prev && go(prev)}
                    >
                        <IChevron size={15} style={{ rotate: '180deg' }} />
                        <span className="jcal-turn-word">上一篇</span>
                        {prev && <span className="jcal-turn-date">{dayLabel(prev, today)}</span>}
                    </button>
                    <button
                        type="button"
                        className="jcal-turn-btn"
                        disabled={!next}
                        data-none={!next || undefined}
                        aria-label={next ? `下一篇：${dayLabel(next, today)}` : '没有更晚的了'}
                        onClick={() => next && go(next)}
                    >
                        <span className="jcal-turn-word">下一篇</span>
                        {next && <span className="jcal-turn-date">{dayLabel(next, today)}</span>}
                        <IChevron size={15} />
                    </button>
                </div>
            </header>
            <div
                ref={pagesRef}
                className="jcal-pages"
                role="region"
                aria-label="这一天的日记"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClickCapture={(event) => {
                    // the release of a swipe is not a tap on a photo
                    if (event.timeStamp - dragEndedAt.current < 350) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }}
            >
                <div
                    ref={leafRef}
                    key={selectedKey}
                    className="jcal-leaf"
                    style={{ '--from': `${dayStep * 44}px` } as CSSProperties}
                >
                    {leaf}
                </div>
            </div>
            <div className="mem-compose jcal-compose">
                <Composer
                    worldId={feed.worldId}
                    onPublished={published}
                    openSignal={writeSignal}
                    submit={feed.publish}
                    draftKey="journal"
                />
            </div>
        </div>
    );
}

// The day's first photo, tucked into its square like a tiny polaroid (a second edge peeks out
// behind it when there are more). Decoration only: photos open from the pages on the right.
function Snapshot({ photo, more }: { photo: MemoryPhoto; more: boolean }) {
    const style = { '--tilt': `${((hashOf(photo.key) % 9) - 4) * 1.5}deg` } as CSSProperties;
    return (
        <span className="jcal-snap" data-more={more || undefined} style={style} aria-hidden="true">
            {photo.thumb ? (
                <img src={photo.thumb} alt="" loading="lazy" decoding="async" draggable={false} />
            ) : (
                <span className="mem-photo-wait" />
            )}
        </span>
    );
}

// Pages still being fetched: paper with the shape of a page on it.
function PaperSkeleton() {
    return (
        <div className="jcal-skel" role="status" aria-label="正在收好你们的回忆">
            {[0, 1].map((i) => (
                <div className="jcal-skel-card mem-paper" key={i}>
                    <span className="jcal-skel-hd">
                        <i className="jcal-skel-ava" />
                        <i className="jcal-skel-line" />
                    </span>
                    {i === 0 && <i className="jcal-skel-pic" />}
                    <i className="jcal-skel-line" />
                    <i className="jcal-skel-line" data-short="" />
                </div>
            ))}
        </div>
    );
}

export default JournalCalendar;
