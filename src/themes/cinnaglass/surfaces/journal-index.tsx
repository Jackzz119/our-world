// journal-index.tsx — 目录: the journal's calendar. One month at a time; a day we
// wrote on carries a dot in the writer's ink (both dots when we both did), and
// tapping it brings that day's first entry to the middle of the stream. Months
// before the loaded ones offer to turn up older memories. On a desktop it is
// docked in the scrapbook's side column; on a phone it pops over the stream.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FeedPost } from '@/types/feed';
import { IChevron } from '@/themes/cinnaglass/icons';

type JournalIndexProps = {
    /** loaded entries, oldest → newest */
    posts: FeedPost[];
    currentUserId: string | null;
    hasMore: boolean;
    loadingOlder: boolean;
    onLoadOlder: () => void;
    onReload: () => void;
    /** a day was picked: its first entry */
    onPick: (postId: string) => void;
    onClose: () => void;
    /** always shown in a side column: no popover focus, outside click or Esc */
    docked?: boolean;
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

export function JournalIndex({
    posts,
    currentUserId,
    hasMore,
    loadingOlder,
    onLoadOlder,
    onReload,
    onPick,
    onClose,
    docked = false
}: JournalIndexProps) {
    const ref = useRef<HTMLDivElement>(null);
    const newest = posts.at(-1);
    const oldest = posts[0];
    const [month, setMonth] = useState(() => firstOfMonth(newest ? new Date(newest.created_at) : new Date()));
    const today = new Date();
    const latest = firstOfMonth(newest && new Date(newest.created_at) > today ? new Date(newest.created_at) : today);
    const earliest = oldest ? firstOfMonth(new Date(oldest.created_at)) : latest;
    // one month before the loaded ones is reachable when there is more to load
    const floor = hasMore ? addMonths(earliest, -1) : earliest;
    const beforeLoaded = month < earliest;

    // Focus the panel when it opens; a pointer outside closes it (the 目录 button toggles on its own).
    const closeRef = useRef(onClose);
    useLayoutEffect(() => {
        closeRef.current = onClose;
    });
    useEffect(() => {
        if (docked) return;
        const panel = ref.current;
        const opener = panel?.closest('.memory-panel')?.querySelector<HTMLElement>('.mem-index-btn');
        panel?.focus({ preventScroll: true });
        const outside = (event: PointerEvent) => {
            const target = event.target as Element;
            if (!panel?.contains(target) && !target.closest('.mem-index-btn')) closeRef.current();
        };
        document.addEventListener('pointerdown', outside);
        return () => {
            document.removeEventListener('pointerdown', outside);
            // closed from inside (a day, Esc): focus goes back to the 目录 button, not to the page
            if (!document.activeElement || document.activeElement === document.body)
                opener?.focus({ preventScroll: true });
        };
    }, [docked]);

    const days = new Map<string, { first: FeedPost; mine: boolean; theirs: boolean; count: number }>();
    for (const post of posts) {
        const key = dayKey(new Date(post.created_at));
        const mine = post.author_id === currentUserId;
        const day = days.get(key);
        if (day) {
            day.count += 1;
            day.mine ||= mine;
            day.theirs ||= !mine;
        } else days.set(key, { first: post, mine, theirs: !mine, count: 1 });
    }
    const lead = month.getDay();
    const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

    return (
        <div
            ref={ref}
            className={docked ? 'mem-index mem-index-docked' : 'mem-index ui-surface'}
            role={docked ? 'region' : 'dialog'}
            aria-label="目录：按日子翻阅"
            tabIndex={-1}
            data-esc-own={docked ? undefined : ''}
            onKeyDown={(event) => {
                if (!docked && event.key === 'Escape') {
                    event.stopPropagation();
                    onClose();
                }
            }}
        >
            <header className="mem-index-hd">
                <button
                    type="button"
                    className="ui-icon-button"
                    aria-label="上个月"
                    disabled={month <= floor}
                    onClick={() => setMonth((m) => addMonths(m, -1))}
                >
                    <IChevron size={18} style={{ rotate: '180deg' }} />
                </button>
                <b aria-live="polite">
                    {month.getFullYear()} 年 {month.getMonth() + 1} 月
                </b>
                <button
                    type="button"
                    className="ui-icon-button"
                    aria-label="下个月"
                    disabled={month >= latest}
                    onClick={() => setMonth((m) => addMonths(m, 1))}
                >
                    <IChevron size={18} />
                </button>
            </header>
            <div className="mem-cal" key={month.getTime()}>
                {WEEKDAYS.map((w) => (
                    <span key={w} className="mem-cal-wd" aria-hidden="true">
                        {w}
                    </span>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                    <span key={`lead-${i}`} aria-hidden="true" />
                ))}
                {Array.from({ length }, (_, i) => {
                    const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
                    const day = days.get(dayKey(date));
                    const isToday = dayKey(date) === dayKey(today);
                    return day ? (
                        <button
                            type="button"
                            key={i}
                            className="mem-day"
                            data-today={isToday || undefined}
                            aria-label={`${date.getMonth() + 1} 月 ${i + 1} 日，${day.count} 篇`}
                            onClick={() => onPick(day.first.post_id)}
                        >
                            {i + 1}
                            <span className="mem-day-ink" aria-hidden="true">
                                {day.mine && <i data-author="mine" />}
                                {day.theirs && <i data-author="theirs" />}
                            </span>
                        </button>
                    ) : (
                        <span key={i} className="mem-day empty" data-today={isToday || undefined}>
                            {i + 1}
                        </span>
                    );
                })}
            </div>
            <footer className="mem-index-ft">
                {beforeLoaded ? (
                    <button type="button" className="mem-index-link" disabled={loadingOlder} onClick={onLoadOlder}>
                        {loadingOlder ? '正在往前翻…' : '这个月还没翻到，载入更早的回忆'}
                    </button>
                ) : (
                    <span>
                        <i data-author="mine" /> 我写的 <i data-author="theirs" /> TA 写的
                    </span>
                )}
                <button type="button" className="mem-index-link" onClick={onReload}>
                    刷新
                </button>
            </footer>
        </div>
    );
}
