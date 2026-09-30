// memory-lightbox.tsx — one photo, large (concept H1 in ai/design_system/codex-visual/memories/).
// It grows out of the thumbnail that was tapped (cropped to the thumbnail at
// first, opening out to the whole picture), steps through its list with the
// arrows, the arrow keys or a sideways swipe, and shrinks back into its
// thumbnail on close: Esc, the close button, a tap on the dark, or pulling the
// photo down. The signed thumbnail shows at once; the original swaps in once it
// has been signed. Low motion keeps the fades only.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { UseFeed } from '@/hooks/useFeed';
import { signImageUrls } from '@/lib/storage';
import { IChevron, IClose } from '@/themes/cinnaglass/icons';
import { PARTNER, profileAvatar, VIEWER } from '@/themes/cinnaglass/cast';
import { fmtFullDate } from '@/themes/cinnaglass/surfaces/date-format';
import type { MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import '@/themes/cinnaglass/surfaces/memory-lightbox.css';

export type LightboxRequest = {
    photos: MemoryPhoto[];
    index: number;
    /** where it was opened: from the wall it offers a jump to the entry in the journal */
    source: 'journal' | 'photos';
};

type MemoryLightboxProps = {
    request: LightboxRequest | null;
    feed: UseFeed;
    onClose: () => void;
    onJournal?: (postId: string) => void;
};

const OPEN_MS = 440;
const CLOSE_MS = 320;
const SLIDE_MS = 280;
// A swipe this far (px), or this fast (px per ms), turns the page or closes.
const TURN_PX = 64;
const CLOSE_PX = 110;
const FLICK = 0.45;

const thumbnails = (key: string) =>
    document.querySelectorAll<HTMLImageElement>(`img[data-photo-key="${CSS.escape(key)}"]`);

// The visible thumbnail of a photo, if there is one on screen to grow from or return to.
function thumbnailOf(key: string): HTMLImageElement | null {
    for (const img of thumbnails(key)) {
        const box = img.getBoundingClientRect();
        if (box.width > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth)
            return img;
    }
    return null;
}

// The photo's shape, from any loaded thumbnail (on screen or not), else from the image itself.
function ratioOf(key: string, img: HTMLImageElement): number {
    for (const thumb of thumbnails(key)) if (thumb.naturalWidth) return thumb.naturalWidth / thumb.naturalHeight;
    return img.naturalWidth ? img.naturalWidth / img.naturalHeight : 4 / 3;
}

// Keyframes that move `img` from sitting over `thumb` (scaled to cover it, clipped to its
// box and corners) to its own place. Both boxes are read from the live layout.
function growFrames(img: HTMLElement, thumb: HTMLElement): Keyframe[] {
    const to = img.getBoundingClientRect();
    const from = thumb.getBoundingClientRect();
    const scale = Math.max(from.width / to.width, from.height / to.height);
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const ix = Math.max(0, (to.width - from.width / scale) / 2);
    const iy = Math.max(0, (to.height - from.height / scale) / 2);
    const radius = parseFloat(getComputedStyle(thumb).borderRadius) || 4;
    return [
        {
            transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
            clipPath: `inset(${iy}px ${ix}px round ${radius / scale}px)`
        },
        { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px round 10px)' }
    ];
}

type Drag = { id: number; x0: number; y0: number; t0: number; axis: 'x' | 'y' | null; dx: number; dy: number };

export function MemoryLightbox({ request, feed, onClose, onJournal }: MemoryLightboxProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const drag = useRef<Drag | null>(null);
    // a captured drag's release fires a click on the stage: it must not count as a tap on the dark
    const dragEndedAt = useRef(0);
    const leaving = useRef(false);
    // the request being shown, the photo in view and which way the last step went
    const [shown, setShown] = useState(request);
    const [at, setAt] = useState({ index: request?.index ?? 0, step: 0 });
    const [closing, setClosing] = useState(false);
    const [originals, setOriginals] = useState<Record<string, string | null>>({});
    if (request !== shown) {
        setShown(request);
        setClosing(false);
        // signed originals expire (storage.ts SIGNED_URL_TTL): each opening signs afresh
        setOriginals({});
        if (request) setAt({ index: request.index, step: 0 });
    }
    const photos = shown?.photos ?? [];
    const index = Math.min(at.index, Math.max(0, photos.length - 1));
    const photo = photos[index];

    // Fit the picture into the stage: its box is exactly the visible photo, so the grow-in
    // lines up with the thumbnail. The thumbnail's shape stands in until the image loads.
    const fit = useCallback(() => {
        const stage = stageRef.current;
        const img = imgRef.current;
        if (!stage || !img || !photo) return;
        const ratio = ratioOf(photo.key, img);
        const width = Math.min(stage.clientWidth, stage.clientHeight * ratio);
        img.style.width = `${Math.round(width)}px`;
        img.style.height = `${Math.round(width / ratio)}px`;
    }, [photo]);

    // Open: show the dialog, then grow the photo out of its thumbnail.
    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || !shown) return;
        leaving.current = false;
        if (!dialog.open) dialog.showModal();
        fit();
        const img = imgRef.current;
        const first = shown.photos[shown.index];
        const thumb = first && thumbnailOf(first.key);
        if (!img || !thumb || motionReduced()) return;
        const grow = img.animate(growFrames(img, thumb), {
            duration: OPEN_MS,
            easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)'
        });
        return () => grow.cancel();
        // opening depends on the request only; later steps animate themselves
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shown]);

    // A step to the next or previous photo slides the new one in from that side.
    useLayoutEffect(() => {
        fit();
        const img = imgRef.current;
        if (!img || !at.step || motionReduced()) return;
        const slide = img.animate(
            [
                { translate: `${at.step * 56}px 0`, opacity: 0 },
                { translate: '0 0', opacity: 1 }
            ],
            { duration: SLIDE_MS, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
        );
        return () => slide.cancel();
    }, [at, fit]);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage || !shown) return;
        const observer = new ResizeObserver(fit);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [shown, fit]);

    // The original, signed on demand; the thumbnail stays up if signing fails.
    useEffect(() => {
        if (!photo || photo.path in originals) return;
        let cancelled = false;
        signImageUrls([photo.path])
            .then((urls) => {
                if (!cancelled) setOriginals((old) => ({ ...old, [photo.path]: urls[photo.path] ?? null }));
            })
            .catch(() => {
                if (!cancelled) setOriginals((old) => ({ ...old, [photo.path]: null }));
            });
        return () => {
            cancelled = true;
        };
    }, [photo, originals]);

    // Close: shrink back into the thumbnail when it is on screen, else sink and fade.
    const close = useCallback(() => {
        const dialog = dialogRef.current;
        if (!dialog || leaving.current) return;
        leaving.current = true;
        setClosing(true);
        const img = imgRef.current;
        const thumb = photo && thumbnailOf(photo.key);
        const done = () => {
            dialog.close();
            onClose();
        };
        if (!img || motionReduced()) {
            window.setTimeout(done, motionReduced() ? 120 : CLOSE_MS);
            return;
        }
        const frames = thumb
            ? growFrames(img, thumb).reverse()
            : [
                  { opacity: 1, scale: '1' },
                  { opacity: 0, scale: '0.92' }
              ];
        img.animate(frames, { duration: CLOSE_MS, easing: 'cubic-bezier(0.4, 0, 0.7, 0.4)', fill: 'forwards' })
            .finished.catch(() => undefined)
            .then(done);
    }, [photo, onClose]);

    const go = useCallback(
        (step: 1 | -1) => {
            if (leaving.current) return;
            setAt((old) => {
                const next = old.index + step;
                return next < 0 || next >= photos.length ? old : { index: next, step };
            });
        },
        [photos.length]
    );

    if (!shown || !photo) return null;

    const post = photo.post;
    const mine = post.author_id === feed.currentUserId;
    const profile = feed.profiles[post.author_id];
    const name = mine ? '我' : profile?.display_name || 'TA';
    const original = originals[photo.path];
    const src = original || photo.thumb;

    // Sideways drags turn, a downward drag pulls the photo away; taps fall through to the buttons.
    const onPointerDown = (event: React.PointerEvent) => {
        if (event.button !== 0 || !event.isPrimary || (event.target as Element).closest('button')) return;
        drag.current = {
            id: event.pointerId,
            x0: event.clientX,
            y0: event.clientY,
            t0: event.timeStamp,
            axis: null,
            dx: 0,
            dy: 0
        };
    };
    const onPointerMove = (event: React.PointerEvent) => {
        const d = drag.current;
        const frame = frameRef.current;
        if (!d || !frame || event.pointerId !== d.id) return;
        d.dx = event.clientX - d.x0;
        d.dy = event.clientY - d.y0;
        if (!d.axis) {
            if (Math.hypot(d.dx, d.dy) < 8) return;
            d.axis = Math.abs(d.dx) > Math.abs(d.dy) ? 'x' : 'y';
            stageRef.current?.setPointerCapture(event.pointerId);
            frame.dataset.dragging = '';
        }
        if (d.axis === 'x') {
            // resist at either end of the list
            const edge = (d.dx > 0 && index === 0) || (d.dx < 0 && index === photos.length - 1);
            frame.style.translate = `${edge ? d.dx * 0.3 : d.dx}px 0`;
        } else {
            const pull = Math.max(0, d.dy) + Math.min(0, d.dy) * 0.25;
            frame.style.translate = `${d.dx * 0.4}px ${pull}px`;
            dialogRef.current?.style.setProperty('--pull', String(Math.min(1, Math.max(0, d.dy) / 420)));
        }
    };
    const onPointerUp = (event: React.PointerEvent) => {
        const d = drag.current;
        const frame = frameRef.current;
        drag.current = null;
        if (!d || !frame || event.pointerId !== d.id || !d.axis) return;
        dragEndedAt.current = event.timeStamp;
        delete frame.dataset.dragging;
        const speed = Math.max(1, event.timeStamp - d.t0);
        if (d.axis === 'x' && (Math.abs(d.dx) > TURN_PX || Math.abs(d.dx) / speed > FLICK)) {
            frame.style.translate = '';
            go(d.dx < 0 ? 1 : -1);
            return;
        }
        if (d.axis === 'y' && (d.dy > CLOSE_PX || d.dy / speed > FLICK)) {
            close();
            return;
        }
        frame.style.translate = '';
        dialogRef.current?.style.setProperty('--pull', '0');
    };

    return (
        <dialog
            ref={dialogRef}
            className="mem-lightbox"
            aria-label={`${name}的照片 · ${index + 1} / ${photos.length}`}
            data-state={closing ? 'closing' : 'open'}
            onCancel={(event) => {
                event.preventDefault();
                close();
            }}
            onKeyDown={(event) => {
                if (event.key === 'ArrowRight') go(1);
                if (event.key === 'ArrowLeft') go(-1);
            }}
        >
            <div className="lb-dim" aria-hidden="true" />
            <div
                ref={stageRef}
                className="lb-stage"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={(event) => {
                    if (event.target === event.currentTarget && event.timeStamp - dragEndedAt.current > 350) close();
                }}
            >
                <div ref={frameRef} className="lb-frame">
                    <img
                        ref={imgRef}
                        className="lb-img"
                        src={src}
                        alt={`${name}的照片，${fmtFullDate(post.created_at)}`}
                        draggable={false}
                        onLoad={fit}
                        onError={() => {
                            // an original that will not load falls back to the thumbnail
                            if (original) setOriginals((old) => ({ ...old, [photo.path]: null }));
                        }}
                    />
                </div>
            </div>
            <button type="button" className="lb-close ui-icon-button" aria-label="关闭照片" onClick={close}>
                <IClose size={20} />
            </button>
            {photos.length > 1 && (
                <>
                    <button
                        type="button"
                        className="lb-nav lb-prev ui-icon-button"
                        aria-label="上一张"
                        disabled={index === 0}
                        onClick={() => go(-1)}
                    >
                        <IChevron size={22} style={{ rotate: '180deg' }} />
                    </button>
                    <button
                        type="button"
                        className="lb-nav lb-next ui-icon-button"
                        aria-label="下一张"
                        disabled={index === photos.length - 1}
                        onClick={() => go(1)}
                    >
                        <IChevron size={22} />
                    </button>
                </>
            )}
            <footer className="lb-caption ui-surface">
                <div className="lb-who">
                    <img src={profileAvatar(profile?.avatar_url, mine ? VIEWER : PARTNER)} alt="" />
                    <b data-author={mine ? 'mine' : 'theirs'}>{name}</b>
                    <time dateTime={post.created_at}>{fmtFullDate(post.created_at)}</time>
                    {photos.length > 1 && (
                        <span className="lb-count" aria-hidden="true">
                            {index + 1} / {photos.length}
                        </span>
                    )}
                </div>
                {post.visible_content && <p className="lb-text">{post.visible_content}</p>}
                <div className="lb-foot">
                    {original === null && <span className="lb-note">原图暂不可用，正在显示预览</span>}
                    {original === undefined && <span className="lb-note">正在取原图…</span>}
                    {shown.source === 'photos' && onJournal && (
                        <button
                            type="button"
                            className="lb-journal"
                            onClick={() => {
                                onJournal(post.post_id);
                                close();
                            }}
                        >
                            在日记里看 →
                        </button>
                    )}
                </div>
            </footer>
        </dialog>
    );
}
