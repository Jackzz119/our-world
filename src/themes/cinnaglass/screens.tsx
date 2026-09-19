// screens.tsx — the three room-object surfaces: journal, photo wall, wishlist.
// All three stay mounted so scroll, lightbox and composer drafts survive
// closing one object and opening another. The journal's own paging lives in
// journal-room-book.tsx; this file owns the modal shell, focus trap and the
// photo-wall + wishlist bodies.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFeed, type UseFeed } from '@/hooks/useFeed.ts';
import type { FeedPost } from '@/types/feed.ts';
import { IClose } from './icons';
import { toneOf } from './author-tone';
import { useSignedThumbs } from './use-signed-thumbs';
import { PhotoWall } from './photo-wall';
import { PostDetail } from './post-detail';
import { Wishlist } from './wishlist';
import './diary.css';
import { JournalRoomBook as JournalBook } from './journal-room-book';
// Last of the stylesheet imports on purpose: the shell's ties against
// diary.css / journal-room.css are decided by load order.
import './object-surfaces.css';

// Which room object is open. 'timeline' is the journal.
type TabKey = 'timeline' | 'photos' | 'wishlist';
// Where the open gesture came from, so the sheet can fly out of the clicked
// furniture instead of the screen centre.
export type SurfaceOrigin = { x: number; y: number; source: 'object' | 'rail' | 'keyboard' };

// The three surfaces, in mount order. All stay mounted; screen picks one.
const SURFACES: { k: TabKey; title: string; kicker: string }[] = [
    { k: 'timeline', title: '我们的日记', kicker: 'MEMORY DIARY' },
    { k: 'photos', title: '照片墙', kicker: 'PHOTO WALL' },
    { k: 'wishlist', title: '心愿单', kicker: 'OUR WISHES' }
];

// Journal + its detail overlay. Nothing else: the book owns its own paging.
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

// The room-object modal shell. All three surfaces stay mounted and are shown
// one at a time, so state survives closing one object and opening another.
// Owns: the open-from-furniture transform, the layered Escape order
// (detail/lightbox → composer → surface) and the Tab trap.
export function SubScreen({
    screen,
    origin,
    onClose
}: {
    screen: TabKey | null;
    origin?: SurfaceOrigin | null;
    onClose: () => void;
}) {
    const show = !!screen;
    const [visibleScreen, setVisibleScreen] = useState<TabKey | null>(null);
    const surfaceRefs = useRef<Partial<Record<TabKey, HTMLElement | null>>>({});
    const restoreFocusRef = useRef<HTMLElement | null>(null);
    const closeRef = useRef(onClose);
    // Lazy: the feed fetch fires on first object open, not at page load. All
    // three surfaces stay mounted so scroll, lightbox and composer draft state
    // survive closing one object and visiting another.
    const feed = useFeed(show);
    const thumbUrls = useSignedThumbs(feed.posts);

    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    // Let the hidden sheet paint once at the latest object-origin transform,
    // then reveal it on the next frame. Applying origin + .show in one render
    // would make the browser animate from the old center instead of the item.
    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setVisibleScreen(screen));
        return () => window.cancelAnimationFrame(frame);
    }, [screen]);

    // One Escape closes one layer: detail/lightbox first, then composer, then
    // the object surface. Tab is trapped inside the active sheet and focus is
    // returned to the rail button when that was the opener.
    useEffect(() => {
        if (!screen) {
            const previous = restoreFocusRef.current;
            restoreFocusRef.current = null;
            if (previous) window.setTimeout(() => previous.focus(), 0);
            return;
        }
        restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const panel = surfaceRefs.current[screen];
        window.requestAnimationFrame(() => panel?.querySelector<HTMLElement>('.object-x')?.focus());
        const onKey = (event: KeyboardEvent) => {
            const activePanel = surfaceRefs.current[screen];
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
    }, [screen]);

    // Clamp the open-from origin to ±46% of the viewport so a click near an edge
    // still flies from a visible point. The journal opts out: its art is centred.
    const originStyle = (key: TabKey): React.CSSProperties => {
        if (screen !== key || !origin) return {};
        // Static book art is centered; the new take-from-desk motion is deferred.
        if (key === 'timeline') return {};
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const dx = Math.max(-window.innerWidth * 0.46, Math.min(window.innerWidth * 0.46, origin.x - centerX));
        const dy = Math.max(-window.innerHeight * 0.46, Math.min(window.innerHeight * 0.46, origin.y - centerY));
        return {
            '--object-open-x': `${Math.round(dx)}px`,
            '--object-open-y': `${Math.round(dy)}px`,
            '--object-open-r': `${dx < 0 ? -1.5 : 1.5}deg`
        } as React.CSSProperties;
    };

    return (
        <>
            <div
                className={`modal-scrim object-scrim ${screen === 'timeline' ? 'diary-scrim' : ''} ${show ? 'show' : ''}`}
                onClick={onClose}
            />
            {SURFACES.map((surface) => {
                const active = visibleScreen === surface.k;
                const diary = surface.k === 'timeline';
                return (
                    <section
                        key={surface.k}
                        ref={(node) => {
                            surfaceRefs.current[surface.k] = node;
                        }}
                        className={`object-surface ${diary ? 'diary-surface' : 'paper collection-surface'} ${active ? 'show' : ''}`}
                        data-surface={surface.k}
                        style={originStyle(surface.k)}
                        aria-hidden={!active}
                        inert={!active}
                        role="dialog"
                        aria-modal={active ? true : undefined}
                        aria-labelledby={`${surface.k}-surface-title`}
                    >
                        <header className="object-hd">
                            <div>
                                <div className="object-kicker">{surface.kicker}</div>
                                <h2 id={`${surface.k}-surface-title`}>{surface.title}</h2>
                            </div>
                            <button className="modal-x object-x" onClick={onClose} aria-label={`关闭${surface.title}`}>
                                <IClose size={17} />
                            </button>
                        </header>
                        <div className={diary ? 'object-body tl-host' : 'object-body'}>
                            {surface.k === 'timeline' && (
                                <TimelineBody feed={feed} thumbUrls={thumbUrls} active={active} />
                            )}
                            {surface.k === 'photos' && <PhotoWall posts={feed.posts} thumbUrls={thumbUrls} />}
                            {surface.k === 'wishlist' && <Wishlist />}
                        </div>
                    </section>
                );
            })}
        </>
    );
}

export type { TabKey };
