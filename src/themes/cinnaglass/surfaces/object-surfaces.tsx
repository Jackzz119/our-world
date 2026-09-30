// object-surfaces.tsx — the room-object surfaces: the memory panel (journal +
// photo wall, memory-surface.tsx), the wishlist, and — in the 书本 setting — the
// chestnut book the journal used to be (journal/room-book.tsx, kept on request
// 2026-09-30). Everything stays mounted so scroll, lightbox and composer drafts
// survive closing one object and opening another.
import { TaskDialog } from '@/themes/cinnaglass/ui/task-dialog';
import '@/themes/cinnaglass/surfaces/collection-surfaces.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFeed, type UseFeed } from '@/hooks/useFeed';
import type { FeedPost } from '@/types/feed';
import type { JournalStyle } from '@/themes/cinnaglass/tweaks';
import { IClose } from '@/themes/cinnaglass/icons';
import { toneOf } from '@/themes/cinnaglass/surfaces/author-tone';
import { useSignedThumbs } from '@/themes/cinnaglass/surfaces/use-signed-thumbs';
import { MemorySurface, type MemoryView } from '@/themes/cinnaglass/surfaces/memory-surface';
import { PostDetail } from '@/themes/cinnaglass/surfaces/post-detail';
import { Wishlist } from '@/themes/cinnaglass/surfaces/wishlist';
import '@/themes/cinnaglass/journal/diary.css';
import { JournalRoomBook as JournalBook } from '@/themes/cinnaglass/journal/room-book';
// Last of the stylesheet imports on purpose: the shell's ties against
// diary.css / journal-room.css are decided by load order.
import '@/themes/cinnaglass/surfaces/object-surfaces.css';

// Which room object is open. 'timeline' is the journal.
type TabKey = 'timeline' | 'photos' | 'wishlist';
// Where the open gesture came from (furniture, rail or keyboard).
export type SurfaceOrigin = { x: number; y: number; source: 'object' | 'rail' | 'keyboard' };

// The chestnut book + its detail overlay (book mode). The book owns its own paging.
function TimelineBody({
    feed,
    thumbUrls,
    active
}: {
    feed: UseFeed;
    thumbUrls: Record<string, string>;
    active: boolean;
}) {
    const [detail, setDetail] = useState<FeedPost | null>(null);
    const closeDetail = useCallback(() => setDetail(null), []);
    return (
        <>
            <JournalBook feed={feed} thumbUrls={thumbUrls} active={active} onDetail={setDetail} />
            {detail && (
                <PostDetail
                    post={detail}
                    profile={feed.profiles[detail.author_id]}
                    mine={detail.author_id === feed.currentUserId}
                    tone={toneOf(detail.author_id, feed.currentUserId, feed.world)}
                    thumbUrls={thumbUrls}
                    onClose={closeDetail}
                />
            )}
        </>
    );
}

// Feeds the surfaces. Lazy: the feed fetch fires on the first object open, not at page load.
export function SubScreen({
    screen,
    origin,
    onClose,
    journalStyle = 'scrapbook'
}: {
    screen: TabKey | null;
    origin?: SurfaceOrigin | null;
    onClose: () => void;
    journalStyle?: JournalStyle;
}) {
    const feed = useFeed(!!screen);
    const thumbUrls = useSignedThumbs(feed.posts);
    return (
        <ObjectSurfaces
            screen={screen}
            origin={origin}
            onClose={onClose}
            feed={feed}
            thumbUrls={thumbUrls}
            journalStyle={journalStyle}
        />
    );
}

// The surfaces themselves, fed from outside (SubScreen, or a layout fixture's local feed).
export function ObjectSurfaces({
    screen,
    onClose,
    feed,
    thumbUrls,
    journalStyle = 'scrapbook'
}: {
    screen: TabKey | null;
    origin?: SurfaceOrigin | null;
    onClose: () => void;
    feed: UseFeed;
    thumbUrls: Record<string, string>;
    journalStyle?: JournalStyle;
}) {
    const book = journalStyle === 'book';
    const memory: MemoryView | null =
        screen === 'photos' ? 'photos' : screen === 'timeline' && !book ? 'journal' : null;
    return (
        <>
            <MemorySurface requested={memory} onClose={onClose} feed={feed} thumbUrls={thumbUrls} journal={!book} />
            {book && <BookSurface open={screen === 'timeline'} onClose={onClose} feed={feed} thumbUrls={thumbUrls} />}
            <TaskDialog
                open={screen === 'wishlist'}
                onClose={onClose}
                title="心愿单"
                className="collection-task wishlist-task"
                description="心愿仅保存在当前浏览器，不会同步给对方。"
            >
                <Wishlist />
            </TaskDialog>
        </>
    );
}

// The chestnut book as it was (book mode): a centred modal over a light scrim with its own
// layered Escape (detail → composer → book) and Tab trap; focus returns to the opener.
function BookSurface({
    open,
    onClose,
    feed,
    thumbUrls
}: {
    open: boolean;
    onClose: () => void;
    feed: UseFeed;
    thumbUrls: Record<string, string>;
}) {
    const [visible, setVisible] = useState(false);
    const panelRef = useRef<HTMLElement | null>(null);
    const restoreFocusRef = useRef<HTMLElement | null>(null);
    const closeRef = useRef(onClose);

    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    // Reveal on the frame after mounting, so the sheet animates in instead of popping.
    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setVisible(open));
        return () => window.cancelAnimationFrame(frame);
    }, [open]);

    useEffect(() => {
        if (!open) {
            const previous = restoreFocusRef.current;
            restoreFocusRef.current = null;
            if (previous) window.setTimeout(() => previous.focus(), 0);
            return;
        }
        restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const panel = panelRef.current;
        window.requestAnimationFrame(() => panel?.querySelector<HTMLElement>('.object-x')?.focus());
        const onKey = (event: KeyboardEvent) => {
            const activePanel = panelRef.current;
            if (!activePanel) return;
            if (event.key === 'Escape') {
                if (activePanel.querySelector('.pd,.lb,.compose-open')) return;
                closeRef.current();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusScope = activePanel.querySelector('.pd-card') ?? activePanel;
            const focusable = Array.from(
                focusScope.querySelectorAll<HTMLElement>(
                    'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
                )
            ).filter((node) => node.offsetParent !== null && !node.closest('[inert]'));
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    return (
        <>
            <div className={`modal-scrim object-scrim diary-scrim ${open ? 'show' : ''}`} onClick={onClose} />
            <section
                ref={panelRef}
                className={`object-surface diary-surface ${visible ? 'show' : ''}`}
                data-surface="timeline"
                aria-hidden={!visible}
                inert={!visible}
                role="dialog"
                aria-modal={visible ? true : undefined}
                aria-labelledby="timeline-surface-title"
            >
                <header className="object-hd">
                    <div>
                        <div className="object-kicker">MEMORY DIARY</div>
                        <h2 id="timeline-surface-title">我们的日记</h2>
                    </div>
                    <button className="modal-x object-x" onClick={onClose} aria-label="关闭我们的日记">
                        <IClose size={17} />
                    </button>
                </header>
                <div className="object-body tl-host">
                    <TimelineBody feed={feed} thumbUrls={thumbUrls} active={visible} />
                </div>
            </section>
        </>
    );
}

export type { TabKey };
