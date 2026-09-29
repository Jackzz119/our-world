// Sheet — the phone layout's home for A panels (music, chat, tools, rooms).
// It rises from the bottom over the viewer's side of the table (hands, mug) and
// stops below the partner, so TA stays in full view; navigation stays on top of
// it and the scene stays live (non-modal). Drag the grip or the header to
// change height or dismiss (a flick is enough), Esc closes, focus returns to
// the opener. Children mark their draggable header strip with data-sheet-grab.
// Concept: ai/design_system/codex-visual/ui-motion/ui-motion.md (A1).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { usePresence } from '@/themes/cinnaglass/ui/use-presence';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
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
    className?: string;
    children: ReactNode;
};

// Half height is half the visible screen, never less than the compact player needs.
const HALF_RATIO = 0.5;
const HALF_MIN = 340;
// A flick faster than this (px per ms) dismisses or switches height whatever the distance.
const FLICK = 0.11;
// Exit is quicker than entry; must cover --dur-sheet's exit share.
const EXIT_MS = 300;
// Past the top the sheet follows the finger with growing resistance.
const rubber = (overshoot: number) => Math.pow(overshoot, 0.7);

type Drag = { id: number; y0: number; base: number; moved: boolean; samples: { y: number; t: number }[] };

export function Sheet({
    open,
    onClose,
    label,
    expandable = false,
    detent: controlled,
    onDetentChange,
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
    const drag = useRef<Drag | null>(null);
    // a drag that ends on the grip must not also count as a tap on it
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

    // Place the sheet: slide up from below on mount, to the detent, or away when closing.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) {
            entered.current = false;
            return;
        }
        const reduced = motionReduced();
        const target = restingY(el, detent);
        if (!entered.current) {
            entered.current = true;
            el.style.transition = 'none';
            el.style.transform = `translateY(${reduced ? target : offsets(el).closed}px)`;
            el.style.opacity = reduced ? '0' : '1';
            void el.offsetHeight; // commit the start position before transitioning
            el.style.transition = '';
        }
        if (closing) {
            el.style.transform = `translateY(${reduced ? target : offsets(el).closed}px)`;
            el.style.opacity = reduced ? '0' : '1';
        } else {
            el.style.transform = `translateY(${target}px)`;
            el.style.opacity = '1';
        }
        // offsets/restingY read the element each time; they are not reactive inputs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, closing, detent, viewportTick]);

    // Keyboard users land in the panel; touch users keep their place. Focus goes back on close.
    useEffect(() => {
        if (!open) return;
        const opener = document.activeElement;
        const el = ref.current;
        if (matchMedia('(pointer: fine)').matches) el?.focus({ preventScroll: true });
        return () => {
            if (
                opener instanceof HTMLElement &&
                opener.isConnected &&
                (document.activeElement === document.body || el?.contains(document.activeElement))
            )
                opener.focus({ preventScroll: true });
        };
    }, [open]);

    if (!mounted) return null;

    // Drags start on the grip or any [data-sheet-grab] strip (never on a control inside it), and only
    // take the pointer once it has moved, so taps, sliders and list scrolling keep working.
    const startDrag = (event: React.PointerEvent<HTMLElement>) => {
        const el = ref.current;
        const target = event.target as Element;
        if (!el || drag.current || event.button !== 0 || !event.isPrimary) return;
        const grip = target.closest('.ui-sheet-grip');
        if (!grip && (!target.closest('[data-sheet-grab]') || target.closest('button, input, select, textarea, a')))
            return;
        const current = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
        drag.current = {
            id: event.pointerId,
            y0: event.clientY,
            base: current,
            moved: false,
            samples: [{ y: current, t: event.timeStamp }]
        };
    };
    const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
        const el = ref.current;
        const d = drag.current;
        if (!el || !d || event.pointerId !== d.id) return;
        const dy = event.clientY - d.y0;
        if (!d.moved) {
            if (Math.abs(dy) < 4) return;
            d.moved = true;
            el.dataset.dragging = '';
            el.setPointerCapture(event.pointerId);
        }
        let y = d.base + dy;
        if (y < 0) y = -rubber(-y);
        el.style.transform = `translateY(${y}px)`;
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
        const first = d.samples[0];
        const last = d.samples[d.samples.length - 1];
        const velocity = last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
        const at = offsets(el);
        const y = last.y;
        if (!expandable) {
            if (velocity > FLICK || y > el.offsetHeight * 0.38) onClose();
            else el.style.transform = 'translateY(0px)';
            return;
        }
        // expandable: full (0) ⇄ half ⇄ closed, chosen by flick direction or the nearest resting place
        let next: SheetDetent | 'closed';
        if (velocity > FLICK) next = y > at.half - 24 ? 'closed' : 'half';
        else if (velocity < -FLICK) next = 'full';
        else {
            const projected = y + velocity * 160;
            const stops: [SheetDetent | 'closed', number][] = [
                ['full', 0],
                ['half', at.half],
                ['closed', at.closed]
            ];
            next = stops.reduce((a, b) => (Math.abs(b[1] - projected) < Math.abs(a[1] - projected) ? b : a))[0];
        }
        if (next === 'closed') onClose();
        else if (next !== detent) setDetent(next);
        else el.style.transform = `translateY(${restingY(el, next)}px)`;
    };

    return (
        <section
            ref={ref}
            className={`ui-sheet ui-surface ${expandable ? 'expandable' : ''} ${className}`}
            role="dialog"
            aria-modal="false"
            aria-label={label}
            tabIndex={-1}
            data-state={closing ? 'closing' : 'open'}
            data-detent={detent}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                }
            }}
        >
            <button
                type="button"
                className="ui-sheet-grip"
                aria-label={expandable ? (detent === 'full' ? `收回${label}` : `展开${label}`) : `收起${label}`}
                onClick={(event) => {
                    if (event.timeStamp - dragEndedAt.current < 350) return;
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
