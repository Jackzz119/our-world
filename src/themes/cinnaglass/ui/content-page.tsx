// content-page.tsx — the shell of a content page: somewhere you go to read rather than something
// that keeps you company in the room (2026-10-01 product rule, ai/design_system/uiux/cinnaglass/ux/ux.md
// §0). On a desktop it is a large window in the middle of the screen over the dimmed scene; on a
// phone it takes the whole screen straight away, rising from the bottom edge (no half height).
// A native modal dialog: the browser keeps the room inert and the focus inside. It stays in the
// DOM while closed, so what the page holds (scroll, drafts) survives. Esc closes it — unless a
// layer inside owns that Esc ([data-esc-own], a menu, a detail view) — and so do the close button,
// a click on the dimmed room and, on a phone, pulling the header down.
// It opens in two steps (2026-10-02): laid out and painted where it will rest, all but invisible,
// and only then sent on its way, so painting a whole page no longer lands in the middle of the rise;
// the room holds still while the page moves (ui/scene-hold.ts).
import { useEffect, useRef, type ReactNode } from 'react';
import { IClose } from '@/themes/cinnaglass/icons';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import { holdScene } from '@/themes/cinnaglass/ui/scene-hold';
import { rubberband, SPRING, springTranslateY } from '@/themes/cinnaglass/ui/spring';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import '@/themes/cinnaglass/ui/content-page.css';

type ContentPageProps = {
    open: boolean;
    onClose: () => void;
    /** accessible name of the page */
    label: string;
    /** the page's own header: titles, tabs, switches; the shell adds the close button after it */
    header: ReactNode;
    closeLabel?: string;
    className?: string;
    children: ReactNode;
};

// The page's vertical offset as drawn right now (its translate, mid-animation included).
function shownY(el: HTMLElement): number {
    const [, y = '0px'] = getComputedStyle(el).translate.split(' ');
    return y.endsWith('%') ? (parseFloat(y) / 100) * el.offsetHeight : parseFloat(y) || 0;
}

// Layers inside a page that answer Esc themselves; the page waits for the next Esc.
const ESC_LAYERS = '[data-esc-own], .journal-index, .pd';
// A pull this far (px), or this fast (px per ms), puts the page away.
const CLOSE_PX = 110;
const FLICK = 0.45;
// How long the room holds still for the page's rise (the sheet spring) and for its exit.
const ENTER_HOLD_MS = 700;
const EXIT_HOLD_MS = 320;
// The longest the page waits for its first view to be ready before it rises anyway.
const READY_MAX_MS = 300;

// What the page shows first, made ready before it moves: the pictures in view decoded (photos, and
// the paper, cork and tape drawn behind them) and the type loaded. Decoding them during the rise made
// it stutter (2026-10-02 profile); a slow network only shortens the wait, it never holds the page.
function whenReady(page: HTMLElement): Promise<unknown> {
    const pictures: Promise<unknown>[] = [];
    const backgrounds = new Set<string>();
    for (const el of page.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (!r.width || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
        if (el instanceof HTMLImageElement) pictures.push(el.decode().catch(() => {}));
        for (const part of [null, '::before', '::after'])
            for (const [, url] of getComputedStyle(el, part).backgroundImage.matchAll(/url\("?(.+?)"?\)/g))
                backgrounds.add(url);
    }
    for (const url of backgrounds) {
        const img = new Image();
        img.src = url;
        pictures.push(img.decode().catch(() => {}));
    }
    return Promise.race([
        Promise.all([...pictures, document.fonts.ready]),
        new Promise((resolve) => setTimeout(resolve, READY_MAX_MS))
    ]);
}

export function ContentPage({ open, onClose, label, header, closeLabel, className = '', children }: ContentPageProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const compact = useCompactUi();
    // where the last Esc was pressed (the layer that answered it may already be gone when cancel arrives)
    const escFrom = useRef<Element | null>(null);
    const backdropPress = useRef(false);
    const pull = useRef<{
        id: number;
        y0: number;
        base: number;
        moved: boolean;
        samples: { y: number; t: number }[];
        dy: number;
    } | null>(null);
    // the spring a short pull is riding back on, so the next grab catches it where it is
    const flight = useRef<Animation | null>(null);
    // the frame the page waits for before it rises (it is being laid out and painted at rest)
    const preparing = useRef(0);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            const opener = document.activeElement;
            let live = true;
            dialog.style.translate = '';
            // in place and all but invisible (content-page.css), until its first view is painted
            dialog.setAttribute('data-preparing', '');
            dialog.showModal();
            // keyboard users start on the page itself; the title tabs are the first stop after it
            dialog.focus({ preventScroll: true });
            holdScene(ENTER_HOLD_MS + READY_MAX_MS);
            const rise = () => {
                preparing.current = 0;
                if (!dialog.open) return;
                // one style pass at the starting point, then let it go to rest
                dialog.setAttribute('data-entering', '');
                dialog.removeAttribute('data-preparing');
                void dialog.offsetHeight;
                dialog.removeAttribute('data-entering');
                holdScene(ENTER_HOLD_MS);
            };
            // pictures and type ready, then two frames: the first paints the page at rest, the
            // second starts the rise
            void whenReady(dialog).then(() => {
                if (!live) return;
                preparing.current = requestAnimationFrame(() => {
                    preparing.current = requestAnimationFrame(rise);
                });
            });
            return () => {
                live = false;
                cancelAnimationFrame(preparing.current);
                preparing.current = 0;
                dialog.removeAttribute('data-preparing');
                dialog.removeAttribute('data-entering');
                if (dialog.open) {
                    holdScene(EXIT_HOLD_MS);
                    dialog.close();
                }
                if (
                    opener instanceof HTMLElement &&
                    opener.isConnected &&
                    (document.activeElement === document.body || dialog.contains(document.activeElement))
                )
                    opener.focus({ preventScroll: true });
            };
        } else if (!open && dialog.open) dialog.close();
    }, [open]);

    // Pull the header down to put the page away (phones); a short pull springs back.
    const onPointerDown = (event: React.PointerEvent) => {
        if (!compact || !event.isPrimary || event.button !== 0) return;
        const target = event.target as Element;
        if (!target.closest('[data-page-grab]') || target.closest('button, a, input, select, textarea, [role="tab"]'))
            return;
        pull.current = { id: event.pointerId, y0: event.clientY, base: 0, moved: false, samples: [], dy: 0 };
    };
    const onPointerMove = (event: React.PointerEvent) => {
        const p = pull.current;
        const dialog = ref.current;
        if (!p || !dialog || event.pointerId !== p.id) return;
        const dy = event.clientY - p.y0;
        if (!p.moved) {
            if (Math.abs(dy) < 6) return;
            p.moved = true;
            // catch the page where it is, even while it is still springing back
            p.base = shownY(dialog) - dy;
            flight.current?.cancel();
            flight.current = null;
            dialog.setPointerCapture(event.pointerId);
            dialog.setAttribute('data-pulling', '');
        }
        // follow going down, give like a rubber band going up (the page is already as tall as it gets)
        const y = p.base + dy;
        p.dy = y > 0 ? y : -rubberband(-y, dialog.offsetHeight);
        dialog.style.translate = `0 ${p.dy}px`;
        p.samples.push({ y: p.dy, t: event.timeStamp });
        while (p.samples.length > 2 && event.timeStamp - p.samples[0].t > 100) p.samples.shift();
    };
    const onPointerUp = (event: React.PointerEvent) => {
        const p = pull.current;
        const dialog = ref.current;
        pull.current = null;
        if (!p || !dialog || event.pointerId !== p.id || !p.moved) return;
        // the speed over the last 100ms before letting go: a finger that stopped before lifting throws nothing
        const last = p.samples[p.samples.length - 1];
        p.samples.push({ y: last.y, t: event.timeStamp });
        while (p.samples.length > 2 && event.timeStamp - p.samples[0].t > 100) p.samples.shift();
        const first = p.samples[0];
        const speed = event.timeStamp > first.t ? (last.y - first.y) / (event.timeStamp - first.t) : 0;
        if (p.dy > CLOSE_PX || speed > FLICK) {
            dialog.removeAttribute('data-pulling');
            // carry on downwards from where the finger let go (low motion: the usual fade)
            dialog.style.translate = motionReduced() ? '' : '0 100%';
            onClose();
        } else if (motionReduced()) {
            dialog.removeAttribute('data-pulling');
            dialog.style.translate = '';
        } else {
            // spring back at the finger's speed; the pulling flag keeps the CSS transition out of the way
            const back = springTranslateY(dialog, p.dy, 0, speed, SPRING.release, 'translate');
            flight.current = back;
            back.finished
                .then(() => {
                    if (flight.current !== back) return;
                    flight.current = null;
                    dialog.removeAttribute('data-pulling');
                    dialog.style.translate = '';
                })
                .catch(() => {});
        }
    };

    return (
        <dialog
            ref={ref}
            className={`ui-page ui-surface ${className}`}
            aria-label={label}
            data-compact={compact || undefined}
            tabIndex={-1}
            onKeyDownCapture={(event) => {
                if (event.key === 'Escape') escFrom.current = event.target as Element;
            }}
            onCancel={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const from = escFrom.current;
                escFrom.current = null;
                if (from instanceof Element && from.closest(ESC_LAYERS)) return;
                onClose();
            }}
            onClose={(event) => {
                event.stopPropagation();
                if (open && !ref.current?.open) onClose();
            }}
            onPointerDown={(event) => {
                const r = event.currentTarget.getBoundingClientRect();
                backdropPress.current =
                    event.target === event.currentTarget &&
                    (event.clientX < r.left ||
                        event.clientX > r.right ||
                        event.clientY < r.top ||
                        event.clientY > r.bottom);
                onPointerDown(event);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={(event) => {
                const r = event.currentTarget.getBoundingClientRect();
                if (
                    backdropPress.current &&
                    event.target === event.currentTarget &&
                    (event.clientX < r.left ||
                        event.clientX > r.right ||
                        event.clientY < r.top ||
                        event.clientY > r.bottom)
                )
                    onClose();
                backdropPress.current = false;
            }}
        >
            {compact && <span className="ui-page-grip" aria-hidden="true" data-page-grab />}
            <header className="ui-page-head" data-page-grab>
                {header}
                <button
                    type="button"
                    className="ui-icon-button ui-page-close"
                    aria-label={closeLabel ?? `关闭${label}`}
                    onClick={onClose}
                >
                    <IClose size={20} />
                </button>
            </header>
            <div className="ui-page-body">{children}</div>
        </dialog>
    );
}
