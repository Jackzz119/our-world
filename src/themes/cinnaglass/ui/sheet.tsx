// Sheet — the phone layout's home for the companion panels (music, chat, rooms, the memories menu).
// It rises from the bottom over the viewer's side of the table (hands, mug) and
// stops below the partner, so TA stays in full view; the navigation bar opens out
// into the sheet's own tab bar while it is open (navigation-glass.css) — the sheet
// rises from behind it and sinks back into it — and the scene stays live (non-modal).
// Before rising, the sheet is laid out and painted where it will rest, all but
// invisible, so the rise only moves finished pixels; while it moves, the room holds
// still (ui/scene-hold.ts) so the two do not fight over a phone's GPU.
// Drag it anywhere to change height or dismiss — it follows the finger 1:1, gives
// like a rubber band past the top, and on release carries the finger's speed into
// a spring towards where the throw was heading (Apple's fluid-interface rules,
// ui/spring.ts) — or use the close button every sheet header carries (SheetHead);
// Esc closes, focus returns to the opener. Typing, sliders and lists that scroll keep
// their own gestures; a header strip marked data-sheet-grab always drags, and a part
// that handles Escape itself (an open composer) is marked data-esc-own.
// Concept: ai/design_system/codex-visual/ui-motion/ui-motion.md (A1).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { IClose } from '@/themes/cinnaglass/icons';
import { usePresence } from '@/themes/cinnaglass/ui/use-presence';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import { holdScene } from '@/themes/cinnaglass/ui/scene-hold';
import { project, rubberband, SPRING, springTranslateY } from '@/themes/cinnaglass/ui/spring';
import { usePanelFocus } from '@/themes/cinnaglass/ui/use-panel-focus';
import '@/themes/cinnaglass/ui/sheet.css';

export type SheetDetent = 'half' | 'full';

type SheetProps = {
    open: boolean;
    onClose: () => void;
    /** accessible name of the panel */
    label: string;
    /** two heights: 'half' keeps the partner visible, 'full' is for reading */
    expandable?: boolean;
    /** controlled height (expandable sheets); uncontrolled starts at 'half' */
    detent?: SheetDetent;
    onDetentChange?: (detent: SheetDetent) => void;
    /** children stay mounted (hidden) while closed, so drafts and scroll survive */
    keepMounted?: boolean;
    className?: string;
    children: ReactNode;
};

// Half height is half the visible screen, never less than the compact player needs.
const HALF_RATIO = 0.5;
const HALF_MIN = 340;
// Faster than this (px per ms) the release counts as a throw: a little more bounce.
const FLICK = 0.5;
// Exit is quicker than entry; must cover the closing transition in sheet.css.
const EXIT_MS = 300;
// How long the room holds still for the rise (--dur-sheet, the smooth spring, is 621ms), a drag,
// and the way down: the exit, then the tab bar closing up into the pill (--dur-enter, 260ms).
const RISE_HOLD_MS = 680;
const DRAG_HOLD_MS = 250;
const SINK_HOLD_MS = EXIT_MS + 300;
// Movement (px) before a press becomes a drag; until then taps and presses stay what they are.
const SLOP = 6;
// Where a press never starts a drag: typing and sliders keep the finger.
const NO_DRAG = 'input, textarea, select, [contenteditable], [role="slider"]';

// A list or a page that can scroll up and down keeps its own scrolling.
function inScroller(node: Element | null, sheet: Element): boolean {
    for (let el = node; el && el !== sheet; el = el.parentElement) {
        const { overflowY } = getComputedStyle(el);
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
}

type Drag = { id: number; y0: number; base: number; moved: boolean; samples: { y: number; t: number }[] };

export function Sheet({
    open,
    onClose,
    label,
    expandable = false,
    detent: controlled,
    onDetentChange,
    keepMounted = false,
    className = '',
    children
}: SheetProps) {
    const { mounted, closing } = usePresence(open, EXIT_MS);
    const [own, setOwn] = useState<SheetDetent>('half');
    // opening again starts at half height (render-time adjustment, react.dev "previous renders")
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setOwn('half');
    }
    const detent = expandable ? (controlled ?? own) : 'half';
    const setDetent = (next: SheetDetent) => {
        setOwn(next);
        onDetentChange?.(next);
    };
    // re-measure on rotation and keyboard: the offsets are pixel values
    const [viewportTick, setViewportTick] = useState(0);
    const ref = useRef<HTMLElement>(null);
    const entered = useRef(false);
    // the frame request that will start the rise once the sheet has been painted in place
    const preparing = useRef(0);
    const drag = useRef<Drag | null>(null);
    // the spring a released drag is riding, so a new grab can catch it mid-flight
    const flight = useRef<Animation | null>(null);
    // a drag that ends on a button or the grip must not also count as a tap on it
    const dragEndedAt = useRef(0);

    useEffect(() => {
        if (!mounted) return;
        const bump = () => setViewportTick((n) => n + 1);
        window.addEventListener('resize', bump);
        window.visualViewport?.addEventListener('resize', bump);
        return () => {
            window.removeEventListener('resize', bump);
            window.visualViewport?.removeEventListener('resize', bump);
        };
    }, [mounted]);

    // Pixel offsets for each resting place, measured from the rendered sheet.
    const offsets = (el: HTMLElement) => {
        const height = el.offsetHeight;
        const visible = window.visualViewport?.height ?? window.innerHeight;
        const half = expandable ? Math.min(height, Math.max(HALF_MIN, Math.round(visible * HALF_RATIO))) : height;
        return { open: 0, half: height - half, closed: height + 24 };
    };
    const restingY = (el: HTMLElement, at: SheetDetent) => (at === 'full' ? 0 : offsets(el).half);
    // Where the sheet's rendered state says it belongs: its detent, or away below the screen while
    // closing (low motion fades in place instead). Read from the element, so a frame request that
    // runs later still sees the latest state.
    const place = (el: HTMLElement) => {
        const reduced = motionReduced();
        const at = restingY(el, el.dataset.detent === 'full' ? 'full' : 'half');
        const away = el.dataset.state === 'closing';
        el.style.transform = `translateY(${away && !reduced ? offsets(el).closed : at}px)`;
        el.style.opacity = away && reduced ? '0' : '1';
    };

    // Place the sheet: prepare it and rise from below on mount, then follow the detent, or go away.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || !mounted) {
            entered.current = false;
            cancelAnimationFrame(preparing.current);
            preparing.current = 0;
            return;
        }
        if (!entered.current) {
            entered.current = true;
            // Prepare first: lay the sheet out and paint it where it will rest, all but invisible, and
            // only then start it from below the screen, so the rise moves finished pixels. Painting a
            // whole sheet (glass, edges, text, a poster) on the way up held the GPU for ~100ms on a
            // phone-sized screen and the rise stuttered (2026-10-02).
            el.style.transition = 'none';
            el.style.transform = `translateY(${restingY(el, detent)}px)`;
            el.style.opacity = '0.01';
            const rise = () => {
                preparing.current = 0;
                if (!el.isConnected) return;
                const reduced = motionReduced();
                const at = restingY(el, el.dataset.detent === 'full' ? 'full' : 'half');
                el.style.transform = `translateY(${reduced ? at : offsets(el).closed}px)`;
                el.style.opacity = reduced ? '0' : '1';
                void el.offsetHeight; // commit the start position before transitioning
                el.style.transition = '';
                holdScene(RISE_HOLD_MS);
                place(el);
            };
            // two frames: the first commits the sheet, the second comes once it has been painted
            preparing.current = requestAnimationFrame(() => {
                preparing.current = requestAnimationFrame(rise);
            });
            return;
        }
        // still being prepared: the rise places it with the latest state
        if (preparing.current) return;
        if (closing) holdScene(SINK_HOLD_MS);
        place(el);
        // offsets/restingY/place read the element each time; they are not reactive inputs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, closing, detent, viewportTick]);

    // a sheet removed while it is being prepared never rises
    useEffect(() => {
        const pending = preparing;
        return () => cancelAnimationFrame(pending.current);
    }, []);

    usePanelFocus(open, ref);

    if (!mounted && !keepMounted) return null;

    // A press anywhere becomes a drag once it has moved, except on typing, sliders and lists that scroll
    // (a half-height sheet has nothing to scroll yet, so it drags from anywhere); the grip and header
    // strips always drag.
    const startDrag = (event: React.PointerEvent<HTMLElement>) => {
        // a new press is never the tail of the last drag: its tap goes through (a close button tapped
        // just after a fling used to do nothing)
        dragEndedAt.current = -Infinity;
        const el = ref.current;
        const target = event.target as Element;
        if (!el || drag.current || event.button !== 0 || !event.isPrimary || target.closest(NO_DRAG)) return;
        const strip = target.closest('.ui-sheet-grip, [data-sheet-grab]');
        if (!strip && !(expandable && detent === 'half') && inScroller(target, el)) return;
        drag.current = { id: event.pointerId, y0: event.clientY, base: 0, moved: false, samples: [] };
    };
    const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
        const el = ref.current;
        const d = drag.current;
        if (!el || !d || event.pointerId !== d.id) return;
        const dy = event.clientY - d.y0;
        if (!d.moved) {
            if (Math.abs(dy) < SLOP) return;
            d.moved = true;
            // catch the sheet where it is on screen, even mid-spring, and keep it under the finger
            const current = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
            flight.current?.cancel();
            flight.current = null;
            delete el.dataset.springing;
            el.dataset.dragging = '';
            el.setPointerCapture(event.pointerId);
            d.base = current - dy;
        }
        let y = d.base + dy;
        // past the top it gives like a rubber band (a sheet that is already as tall as it gets starts there)
        if (y < 0) y = -rubberband(-y, el.offsetHeight);
        el.style.transform = `translateY(${y}px)`;
        holdScene(DRAG_HOLD_MS);
        d.samples.push({ y, t: event.timeStamp });
        while (d.samples.length > 2 && event.timeStamp - d.samples[0].t > 100) d.samples.shift();
    };
    const endDrag = (event: React.PointerEvent<HTMLElement>) => {
        const el = ref.current;
        const d = drag.current;
        if (!el || !d || event.pointerId !== d.id) return;
        drag.current = null;
        if (!d.moved) return;
        dragEndedAt.current = event.timeStamp;
        delete el.dataset.dragging;
        // the speed over the last 100ms before letting go: a finger that stopped before lifting throws nothing
        const last = d.samples[d.samples.length - 1];
        d.samples.push({ y: last.y, t: event.timeStamp });
        while (d.samples.length > 2 && event.timeStamp - d.samples[0].t > 100) d.samples.shift();
        const first = d.samples[0];
        const velocity = event.timeStamp > first.t ? (last.y - first.y) / (event.timeStamp - first.t) : 0;
        const at = offsets(el);
        const y = last.y;
        // aim for the resting place the throw is heading to, not the one nearest the finger
        const projected = y + project(velocity);
        const stops: [SheetDetent | 'closed', number][] = expandable
            ? [
                  ['full', 0],
                  ['half', at.half],
                  ['closed', at.closed]
              ]
            : [
                  ['half', 0],
                  ['closed', at.closed]
              ];
        const [next, to] = stops.reduce((a, b) => (Math.abs(b[1] - projected) < Math.abs(a[1] - projected) ? b : a));
        if (motionReduced()) {
            if (next === 'closed') onClose();
            else if (next !== detent && expandable) setDetent(next);
            else el.style.transform = `translateY(${restingY(el, detent)}px)`;
            return;
        }
        // the spring starts at the finger's speed, so letting go never jolts
        el.dataset.springing = '';
        const spring = next === 'closed' ? SPRING.away : Math.abs(velocity) > FLICK ? SPRING.fling : SPRING.release;
        const flying = springTranslateY(el, y, to, velocity, spring);
        flight.current = flying;
        holdScene(Number(flying.effect?.getComputedTiming().duration) + 40 || RISE_HOLD_MS);
        flying.finished
            .then(() => {
                if (flight.current !== flying) return;
                flight.current = null;
                delete el.dataset.springing;
                if (next === 'closed') onClose();
            })
            .catch(() => {});
        if (next !== 'closed' && next !== detent && expandable) setDetent(next);
    };
    // the press that turned into a drag is not a tap on whatever it started on
    const swallowClick = (event: React.MouseEvent<HTMLElement>) => {
        if (event.timeStamp - dragEndedAt.current < 350) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    return (
        <section
            ref={ref}
            className={`ui-sheet ui-surface ${expandable ? 'expandable' : ''} ${className}`}
            role="dialog"
            aria-modal="false"
            aria-label={label}
            tabIndex={-1}
            hidden={!mounted}
            inert={!mounted}
            data-state={!mounted ? 'closed' : closing ? 'closing' : 'open'}
            data-detent={detent}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={swallowClick}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && !(event.target as Element).closest('[data-esc-own]')) {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                }
            }}
        >
            <span className="ui-sheet-shade" aria-hidden="true" />
            <button
                type="button"
                className="ui-sheet-grip"
                aria-label={expandable ? (detent === 'full' ? `收回${label}` : `展开${label}`) : `收起${label}`}
                onClick={() => {
                    if (expandable) setDetent(detent === 'full' ? 'half' : 'full');
                    else onClose();
                }}
            >
                <span aria-hidden="true" />
            </button>
            <div className="ui-sheet-body">{children}</div>
        </section>
    );
}

// The header strip of a sheet: its title, any actions, and the close button — dragging is not the
// only way out (2026-10-01). The strip is also a drag handle.
export function SheetHead({
    title,
    onClose,
    children
}: {
    title: string;
    onClose: () => void;
    /** actions between the title and the close button */
    children?: ReactNode;
}) {
    return (
        <header className="ui-sheet-head" data-sheet-grab>
            <h2 className="ui-sheet-title">{title}</h2>
            {children}
            <button
                type="button"
                className="ui-icon-button ui-sheet-close"
                aria-label={`收起${title}`}
                onClick={onClose}
            >
                <IClose size={18} />
            </button>
        </header>
    );
}
