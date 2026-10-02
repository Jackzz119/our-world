// photo-projector.tsx — 放映 (concept H4 in ai/design_system/codex-visual/memories/): our photos
// shown one at a time on a small dark screen, like a slideshow watched together. Each photo
// drifts in a slow Ken Burns move under the projector's light and cross-fades into the next
// every few seconds; under the screen the caption says who and when, and a strip of film runs
// through every frame. The show plays by itself when the page opens and stops for anyone who
// reaches in (a tap, a key, a swipe, a pointer resting on the screen); ▶ starts it again.
// Low motion keeps the show with plain fades: no drift, no grain flicker, the film jumps instead
// of sliding.
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type CSSProperties,
    type Ref
} from 'react';
import type { FeedPost } from '@/types/feed';
import { PARTNER, profileAvatar, VIEWER } from '@/themes/cinnaglass/cast';
import { IChevron, IExpand, IPause, IPlay } from '@/themes/cinnaglass/icons';
import { hashOf } from '@/themes/cinnaglass/surfaces/author-tone';
import { fmtDay, fmtFullDate } from '@/themes/cinnaglass/surfaces/date-format';
import type { MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import type { PhotoViewProps } from '@/themes/cinnaglass/surfaces/memory-views';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import '@/themes/cinnaglass/surfaces/photo-projector.css';

// How long each photo stays up while the show plays (the ring around ▶ fills over it).
const SLIDE_MS = 4500;
// A swipe this far (px), or this fast (px per ms), turns the photo — the lightbox's numbers.
const TURN_PX = 64;
const FLICK = 0.45;
// The thumbnail's shape stands in until a photo has loaded.
const FALLBACK_RATIO = 3 / 2;

type Shown = { index: number; key: string; id: number; dir: number };
type Leaving = { key: string; id: number; dir: number };
type Drag = { id: number; x0: number; y0: number; t0: number; axis: 'x' | 'y' | null; dx: number };

const onVisibility = (change: () => void) => {
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
};
const pageVisible = () => document.visibilityState === 'visible';

// The slow drift of one photo, the same every time it comes up: in or out, toward one of eight
// directions, never further than the zoom leaves room for (no edge ever shows).
function drift(key: string): CSSProperties {
    const hash = hashOf(key);
    const near = 1.03 + (hash % 3) * 0.01;
    const far = 1.11 + ((hash >>> 2) % 3) * 0.01;
    const [s0, s1] = hash % 2 ? [far, near] : [near, far];
    const angle = (((hash >>> 4) % 8) * Math.PI) / 4;
    const room = (scale: number) => (scale - 1) * 40;
    const at = (scale: number, sign: number) =>
        [Math.cos(angle), Math.sin(angle)].map((u) => `${(sign * u * room(scale)).toFixed(2)}%`);
    const [x0, y0] = at(s0, -1);
    const [x1, y1] = at(s1, 1);
    return {
        '--kb-s0': s0,
        '--kb-s1': s1,
        '--kb-x0': x0,
        '--kb-y0': y0,
        '--kb-x1': x1,
        '--kb-y1': y1
    } as CSSProperties;
}

export function PhotoProjector({ feed, photos, status, anyImages, open, onPhoto, musicPlaying }: PhotoViewProps) {
    const compact = useCompactUi();
    const rootRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const slideRef = useRef<HTMLDivElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);
    const drag = useRef<Drag | null>(null);
    // a swipe's release also clicks the stage: that click must not open the lightbox
    const dragEndedAt = useRef(-Infinity);
    // what is left of the current photo's time; a pause keeps it, a new photo refills it
    const remaining = useRef(SLIDE_MS);
    const centred = useRef(false);

    const [shown, setShown] = useState<Shown>({ index: 0, key: photos[0]?.key ?? '', id: 0, dir: 0 });
    const [leaving, setLeaving] = useState<Leaving | null>(null);
    const [playing, setPlaying] = useState(true);
    const [hovering, setHovering] = useState(false);
    const [onScreen, setOnScreen] = useState(true);
    const [ratios, setRatios] = useState<Record<string, number>>({});
    const visible = useSyncExternalStore(onVisibility, pageVisible);

    // The list changed (a page published, older pages loaded): stay on the photo being shown.
    const keys = photos.map((p) => p.key).join('\n');
    const [seenKeys, setSeenKeys] = useState(keys);
    if (keys !== seenKeys) {
        setSeenKeys(keys);
        const found = photos.findIndex((p) => p.key === shown.key);
        const index = found >= 0 ? found : Math.min(shown.index, Math.max(0, photos.length - 1));
        setShown({ ...shown, index, key: photos[index]?.key ?? '' });
    }
    // Every opening starts the show again.
    const live = open && onScreen;
    const [seenLive, setSeenLive] = useState(live);
    if (live !== seenLive) {
        setSeenLive(live);
        if (live) {
            setPlaying(true);
            setHovering(false);
        }
    }

    const count = photos.length;
    const many = count > 1;
    const index = Math.min(shown.index, Math.max(0, count - 1));
    const photo = photos[index];
    const gone = leaving ? photos.find((p) => p.key === leaving.key) : undefined;
    const running = playing && live && visible && !hovering && many;

    const nameOf = (post: FeedPost) =>
        post.author_id === feed.currentUserId ? '我' : feed.profiles[post.author_id]?.display_name || 'TA';
    const noteRatio = (key: string, img: HTMLImageElement) => {
        if (!img.naturalWidth || !img.naturalHeight) return;
        const ratio = img.naturalWidth / img.naturalHeight;
        setRatios((old) => (Math.abs((old[key] ?? 0) - ratio) < 0.001 ? old : { ...old, [key]: ratio }));
    };

    // Show photo `to` (wrapping round); the one on screen fades out under it. Anything the reader
    // does stops the show; only ▶ starts it again.
    const go = (to: number, how: { dir?: number; user?: boolean } = {}) => {
        if (how.user) setPlaying(false);
        if (!many || !photo) return;
        const next = ((to % count) + count) % count;
        if (next === index) return;
        setLeaving({ key: photo.key, id: shown.id, dir: how.dir ?? 0 });
        setShown({ index: next, key: photos[next].key, id: shown.id + 1, dir: how.dir ?? 0 });
    };
    const openLightbox = () => {
        setPlaying(false);
        if (photo) onPhoto(index);
    };
    const advance = () => go(index + 1);
    const advanceRef = useRef(advance);
    useLayoutEffect(() => {
        advanceRef.current = advance;
    });

    // The show's clock: a new photo gets the whole slot, a pause keeps what was left of it.
    useEffect(() => {
        remaining.current = SLIDE_MS;
    }, [shown.id]);
    useEffect(() => {
        if (!running) return;
        const started = performance.now();
        const timer = window.setTimeout(() => advanceRef.current(), remaining.current);
        return () => {
            window.clearTimeout(timer);
            remaining.current = Math.max(0, remaining.current - (performance.now() - started));
        };
    }, [running, shown.id]);

    // Hidden behind another tab of the page while it stays open: the show rests too.
    useEffect(() => {
        const root = rootRef.current;
        if (!root || !open) return;
        const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
        observer.observe(root);
        return () => observer.disconnect();
    }, [open]);

    // The next photo loads while this one shows, so the cross-fade never waits on the network.
    const upcoming = many ? photos[(index + 1) % count] : undefined;
    const upcomingThumb = upcoming?.thumb;
    const upcomingKey = upcoming?.key;
    useEffect(() => {
        if (!upcomingThumb || !upcomingKey) return;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            const ratio = img.naturalWidth / img.naturalHeight;
            if (ratio) setRatios((old) => (old[upcomingKey] ? old : { ...old, [upcomingKey]: ratio }));
        };
        img.src = upcomingThumb;
        return () => {
            img.onload = null;
        };
    }, [upcomingThumb, upcomingKey]);

    // The film runs through the gate: the frame on screen sits in the middle of the strip. The page
    // mounts its views closed (no size yet), so a strip that gets its size later, or a new one,
    // lands on the frame at once; only steps while it is on screen slide.
    useEffect(() => {
        const strip = stripRef.current;
        if (!strip || !live) {
            centred.current = false;
            return;
        }
        const centre = (smooth: boolean) => {
            const cell = strip.querySelector<HTMLElement>(`[data-index="${index}"]`);
            if (!cell || !strip.clientWidth) return;
            const left = cell.offsetLeft + cell.offsetWidth / 2 - strip.clientWidth / 2;
            strip.scrollTo({ left, behavior: smooth && !motionReduced() ? 'smooth' : 'auto' });
            centred.current = true;
        };
        centre(centred.current);
        let width = strip.clientWidth;
        const observer = new ResizeObserver(() => {
            if (strip.clientWidth === width) return;
            width = strip.clientWidth;
            centre(false);
        });
        observer.observe(strip);
        return () => observer.disconnect();
    }, [index, live, count]);

    // A mouse wheel runs the film sideways (it has nowhere else to scroll), and stops the show.
    useEffect(() => {
        const strip = stripRef.current;
        if (!strip) return;
        const onWheel = (event: WheelEvent) => {
            setPlaying(false);
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
            event.preventDefault();
            strip.scrollLeft += event.deltaY;
        };
        strip.addEventListener('wheel', onWheel, { passive: false });
        return () => strip.removeEventListener('wheel', onWheel);
    }, [many]);

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.altKey || event.ctrlKey || event.metaKey || !photo) return;
        const self = event.target === event.currentTarget;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            go(index + (event.key === 'ArrowRight' ? 1 : -1), { user: true });
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            go(event.key === 'Home' ? 0 : count - 1, { user: true });
        } else if (self && event.key === ' ') {
            event.preventDefault();
            if (many) setPlaying((on) => !on);
        } else if (self && event.key === 'Enter') {
            event.preventDefault();
            openLightbox();
        }
    };

    // Sideways drags on the screen follow the finger and turn the photo past the threshold;
    // anything less springs back. Vertical moves are left to the page.
    const onPointerDown = (event: React.PointerEvent) => {
        if (event.button !== 0 || !event.isPrimary || !many) return;
        drag.current = {
            id: event.pointerId,
            x0: event.clientX,
            y0: event.clientY,
            t0: event.timeStamp,
            axis: null,
            dx: 0
        };
    };
    const onPointerMove = (event: React.PointerEvent) => {
        const d = drag.current;
        const slide = slideRef.current;
        if (!d || !slide || event.pointerId !== d.id) return;
        const dx = event.clientX - d.x0;
        const dy = event.clientY - d.y0;
        if (!d.axis) {
            if (Math.hypot(dx, dy) < 8) return;
            d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            if (d.axis === 'y') return;
            try {
                stageRef.current?.setPointerCapture(event.pointerId);
            } catch {
                // the pointer is already gone; the drag still follows the moves that arrive
            }
            slide.dataset.dragging = '';
            setPlaying(false);
        }
        if (d.axis !== 'x') return;
        d.dx = dx;
        slide.style.translate = `${dx}px 0`;
    };
    // A cancelled drag (the browser took the gesture) only springs back.
    const onPointerUp = (event: React.PointerEvent) => {
        const d = drag.current;
        const slide = slideRef.current;
        drag.current = null;
        if (!d || !slide || event.pointerId !== d.id || d.axis !== 'x') return;
        dragEndedAt.current = event.timeStamp;
        delete slide.dataset.dragging;
        const speed = Math.abs(d.dx) / Math.max(1, event.timeStamp - d.t0);
        if (event.type === 'pointerup' && (Math.abs(d.dx) > TURN_PX || speed > FLICK)) {
            // the swiped photo keeps going from where the finger left it
            const dir = d.dx < 0 ? 1 : -1;
            go(index + dir, { dir, user: true });
            return;
        }
        slide.style.translate = '';
    };

    const post = photo?.post;
    const mine = post?.author_id === feed.currentUserId;
    const profile = post ? feed.profiles[post.author_id] : undefined;

    return (
        <section
            ref={rootRef}
            className="pp-view"
            data-compact={compact}
            data-single={(photo && !many) || undefined}
            role="region"
            aria-roledescription="放映"
            aria-label="照片放映"
            tabIndex={photo ? 0 : undefined}
            style={{ '--pp-slide': `${SLIDE_MS}ms` } as CSSProperties}
            onKeyDown={onKeyDown}
        >
            <div
                ref={stageRef}
                className="pp-stage"
                data-empty={!photo || undefined}
                onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') setHovering(true);
                }}
                onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') setHovering(false);
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={(event) => {
                    if (event.timeStamp - dragEndedAt.current > 350 && photo) openLightbox();
                }}
            >
                <span className="pp-light" aria-hidden="true">
                    <span className="pp-dust" />
                </span>
                <span className="pp-perf" aria-hidden="true" />
                {photo ? (
                    <div className="pp-screen">
                        {gone && leaving && (
                            <Slide
                                key={leaving.id}
                                photo={gone}
                                state="out"
                                dir={leaving.dir}
                                ratio={ratios[gone.key]}
                                onLoaded={noteRatio}
                                onGone={() => setLeaving(null)}
                            />
                        )}
                        <Slide
                            key={shown.id}
                            ref={slideRef}
                            photo={photo}
                            state="in"
                            dir={shown.dir}
                            ratio={ratios[photo.key]}
                            onLoaded={noteRatio}
                        />
                    </div>
                ) : (
                    <div className="pp-empty">
                        <div className="mem-note mem-paper" role={status === 'error' ? 'alert' : undefined}>
                            {status === 'loading' || anyImages ? (
                                <p>
                                    <span className="ui-spinner" aria-hidden="true" />
                                    正在给放映机装片…
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
                                    <p className="mem-note-title">放映机还空着。</p>
                                    <p>在日记里写一页带照片的回忆，它就会在这里放给你看。</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
                <span className="pp-grain" aria-hidden="true" />
                {photo && playing && hovering && many && (
                    <span className="pp-hold" aria-hidden="true">
                        <IPause size={11} /> 停在这一张
                    </span>
                )}
            </div>
            {photo && post && (
                <div className="pp-bar">
                    <div className="pp-caption" aria-live={running ? 'off' : 'polite'}>
                        <div className="pp-caption-body" key={post.post_id} data-author={mine ? 'mine' : 'theirs'}>
                            <div className="pp-who">
                                <img
                                    className="pp-ava"
                                    src={profileAvatar(profile?.avatar_url, mine ? VIEWER : PARTNER)}
                                    alt=""
                                />
                                <b>{nameOf(post)}</b>
                                <time dateTime={post.created_at}>{fmtFullDate(post.created_at)}</time>
                            </div>
                            {post.visible_content && <p className="pp-text">{post.visible_content}</p>}
                        </div>
                    </div>
                    {many && (
                        <span className="pp-count">
                            <span className="ow-sr">第 </span>
                            {index + 1} / {count}
                            <span className="ow-sr"> 张</span>
                        </span>
                    )}
                    {musicPlaying && (
                        <span className="pp-music">
                            <span className="pp-eq" aria-hidden="true">
                                <i />
                                <i />
                                <i />
                            </span>
                            ♪ 配着音乐放映
                        </span>
                    )}
                    <div className="pp-transport">
                        {many && (
                            <>
                                <button
                                    type="button"
                                    className="ui-icon-button pp-btn"
                                    aria-label="上一张"
                                    onClick={() => go(index - 1, { user: true })}
                                >
                                    <IChevron size={22} style={{ rotate: '180deg' }} />
                                </button>
                                <button
                                    type="button"
                                    className="ui-icon-button pp-play"
                                    aria-label={playing ? '暂停' : '播放'}
                                    data-running={running || undefined}
                                    onClick={() => setPlaying((on) => !on)}
                                >
                                    <svg className="pp-ring" viewBox="0 0 60 60" aria-hidden="true" key={shown.id}>
                                        <circle className="pp-ring-track" cx="30" cy="30" r="28" />
                                        <circle className="pp-ring-fill" cx="30" cy="30" r="28" pathLength={100} />
                                    </svg>
                                    {playing ? <IPause size={20} /> : <IPlay size={21} />}
                                </button>
                                <button
                                    type="button"
                                    className="ui-icon-button pp-btn"
                                    aria-label="下一张"
                                    onClick={() => go(index + 1, { user: true })}
                                >
                                    <IChevron size={22} />
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            className="ui-icon-button pp-btn pp-expand"
                            aria-label="看大图"
                            onClick={openLightbox}
                        >
                            <IExpand size={19} />
                        </button>
                    </div>
                </div>
            )}
            {many && (
                <div className="pp-strip" ref={stripRef} onPointerDown={() => setPlaying(false)}>
                    <div className="pp-reel">
                        {photos.map((item, i) => (
                            <button
                                type="button"
                                key={item.key}
                                className="pp-cell"
                                data-index={i}
                                aria-current={i === index || undefined}
                                aria-label={`第 ${i + 1} 张，${fmtDay(item.post.created_at)}，${nameOf(item.post)}`}
                                onClick={() => go(i, { user: true })}
                            >
                                {item.thumb ? (
                                    <img
                                        src={item.thumb}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        draggable={false}
                                        data-photo-key={item.key}
                                    />
                                ) : (
                                    <span className="mem-photo-wait" aria-hidden="true" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

// One photo on the screen: a frame in the photo's own shape, fitted into the screen, with the
// picture drifting inside it. It fades in when it arrives and out when the next one covers it.
function Slide({
    ref,
    photo,
    state,
    dir,
    ratio,
    onLoaded,
    onGone
}: {
    ref?: Ref<HTMLDivElement>;
    photo: MemoryPhoto;
    state: 'in' | 'out';
    /** 1 when the next photo came in from the right (a swipe), -1 from the left, 0 a plain fade */
    dir: number;
    ratio: number | undefined;
    onLoaded: (key: string, img: HTMLImageElement) => void;
    onGone?: () => void;
}) {
    const [ready, setReady] = useState(false);
    return (
        <div
            ref={ref}
            className="pp-slide"
            data-state={state}
            style={{ '--dir': dir, '--ar': ratio ?? FALLBACK_RATIO } as CSSProperties}
            onAnimationEnd={(event) => {
                if (event.target === event.currentTarget && state === 'out') onGone?.();
            }}
        >
            {/* the photo's own light spilling onto the dark around it (no photo key: never a thumbnail) */}
            {photo.thumb && ready && <img className="pp-spill" src={photo.thumb} alt="" draggable={false} />}
            <div className="pp-frame" data-ready={ready || !photo.thumb || undefined}>
                {photo.thumb ? (
                    <img
                        className="pp-img"
                        src={photo.thumb}
                        alt=""
                        decoding="async"
                        draggable={false}
                        data-photo-key={photo.key}
                        data-ready={ready || undefined}
                        style={drift(photo.key)}
                        onLoad={(event) => {
                            onLoaded(photo.key, event.currentTarget);
                            setReady(true);
                        }}
                    />
                ) : (
                    <span className="mem-photo-wait" aria-hidden="true" />
                )}
            </div>
        </div>
    );
}

export default PhotoProjector;
