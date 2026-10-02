// photo-cork.tsx — 软木板 (concept H2 in ai/design_system/codex-visual/memories/), one of the memory
// page's photo views (memory-views.ts): every month is a cork board in a thin wooden frame, newest
// month first, and its photos are polaroids pinned on by hand — each spot, tilt and pin colour comes
// from the photo's key, so nothing shuffles between visits. A red string runs pin to pin through
// the photos of one day and draws itself on when the board first comes into view. With a mouse the
// polaroids can be picked up and moved (or nudged with Alt + arrows); the arrangement is remembered
// on this device only, and 整理一下 puts a board back. On a phone the boards fit the screen in two
// loose columns and nothing drags, so scrolling stays smooth. A tap opens the shared lightbox.
import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type MouseEvent,
    type PointerEvent
} from 'react';
import type { FeedStatus } from '@/hooks/useFeed';
import { loadJson, saveJson } from '@/lib/local-store';
import { ISparkle } from '@/themes/cinnaglass/icons';
import { hashOf } from '@/themes/cinnaglass/surfaces/author-tone';
import { monthKey, monthLabel, photoCaption, type MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import type { PhotoViewProps } from '@/themes/cinnaglass/surfaces/memory-views';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import '@/themes/cinnaglass/surfaces/photo-cork.css';

type Point = [number, number];
type Item = { photo: MemoryPhoto; index: number };
type Month = { key: string; label: string; items: Item[] };
type Spot = {
    /** polaroid centre on the board, px */
    x: number;
    y: number;
    tilt: number;
    /** the pin's offset from the polaroid's top centre, px */
    pin: number;
    tone: [string, string];
};
type Layout = { w: number; h: number; pw: number; ph: number; spots: Spot[] };
type Tween = { from: Point; start: number; dur: number };
type Grab = { key: string; index: number; id: number; x0: number; y0: number; dx: number; dy: number; moved: boolean };

// Where hand-arranged polaroids rest, per photo key, as a share of the board: { key: [x, y] }.
const STORE = 'ow-cork-v1';
// Pushpin heads [colour, shade], picked per photo by hash (decoration, not identity).
const PINS: [string, string][] = [
    ['#d2493e', '#8a261f'],
    ['#e6b43f', '#966d14'],
    ['#4b87ba', '#244f7a'],
    ['#5f9e68', '#33683c'],
    ['#efe6d2', '#a49373']
];
const LABEL_PIN: [string, string] = PINS[0];
// Spare pins left in an empty board, waiting for photos: [left %, top %, pin].
const SPARE: [number, number, number][] = [
    [14, 24, 2],
    [83, 19, 1],
    [77, 78, 3],
    [21, 81, 4]
];
// The pin sits this far below the polaroid's top edge, in the white rim; the photo pivots on it.
const PIN_Y = 7;
// Farther than this (px) and a press is a drag, not a tap.
const DRAG_PX = 6;
const GLIDE_MS = 620;
const NUDGE_MS = 240;

// A stable number in [-1, 1) for one photo and one purpose: hashOf, then a mixer so the spot, the
// tilt and the pin never move in step.
function wobble(key: string, salt: number): number {
    let h = (hashOf(key) + Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
}

// A slight overshoot and back (~4%), the JS twin of --ease-spring for glides the string must follow.
const settle = (t: number) => {
    const u = Math.min(1, Math.max(0, t)) - 1;
    return 1 + 2 * u * u * u + u * u;
};

// The board's own arrangement: loose columns with every other one hanging lower, each photo nudged
// and tilted by its hash — pinned by hand, but the same every time. A short row spreads out.
function arrange(keys: string[], w: number, compact: boolean): Layout {
    const n = keys.length;
    // a phone held upright: two columns of 44%; on its side (short and wide) the photos stay small
    const upright = compact && w < 560;
    const pw = Math.round(
        upright ? Math.min(w * 0.44, 188) : Math.min(compact ? 168 : 214, Math.max(compact ? 136 : 164, w * 0.19))
    );
    const ph = pw + (compact ? 24 : 28);
    const side = compact ? 8 : 24;
    const top = compact ? 62 : 72;
    const usable = w - side * 2;
    const cols = Math.max(1, Math.min(n, Math.floor(usable / (pw * (upright ? 1.02 : 1.2)))));
    const single = n <= cols;
    const cell = single ? Math.min(usable / cols, pw * 1.8) : usable / cols;
    const start = side + (usable - cell * cols) / 2;
    const pitch = ph + (compact ? 16 : 26);
    const drop = Math.round(ph * (upright ? 0.42 : compact ? 0.22 : 0.26));
    const spots = keys.map((key, i): Spot => {
        const row = Math.floor(i / cols);
        // wide boards snake (every other row runs back), so a day's string steps down, not across
        const col = row % 2 && cols > 2 ? cols - 1 - (i % cols) : i % cols;
        const room = Math.max(4, (cell - pw) / 2 + (upright ? 2 : 12));
        return {
            x: start + cell * (col + 0.5) + wobble(key, 1) * Math.min(upright ? 7 : compact ? 16 : 26, room),
            y: top + ph / 2 + row * pitch + (col % 2 ? drop : 0) + wobble(key, 2) * (upright ? 7 : compact ? 10 : 15),
            tilt: wobble(key, 3) * (upright ? 4.5 : compact ? 5 : 6),
            pin: Math.round(wobble(key, 4) * pw * 0.07),
            tone: PINS[Math.floor(((wobble(key, 5) + 1) / 2) * PINS.length)]
        };
    });
    const h = Math.round(Math.max(top + ph, ...spots.map((spot) => spot.y + ph / 2)) + (compact ? 24 : 34));
    const layout = { w, h, pw, ph, spots };
    for (const spot of spots) [spot.x, spot.y] = inside(layout, spot.x, spot.y, spot.tilt);
    return layout;
}

// Keep a polaroid on its board, allowing for the corner its tilt swings out.
function inside(b: Layout, x: number, y: number, tilt: number): Point {
    const swing = Math.sin((Math.abs(tilt) * Math.PI) / 180);
    const mx = b.pw / 2 + 6 + (b.ph - PIN_Y) * swing;
    const my = b.ph / 2 + 6 + (b.pw / 2) * swing;
    return [
        Math.round(Math.min(b.w - mx, Math.max(mx, x))),
        Math.round(Math.min(b.h - my, Math.max(Math.min(my, b.h / 2), y)))
    ];
}

// A string sags between two pins: a quadratic curve whose middle hangs lower the wider it spans.
// One running down a column bows sideways by `lean` instead, around the pencil date under it.
function sag(a: Point, b: Point, lean: number): string {
    const drop = 10 + Math.abs(b[0] - a[0]) * 0.13 + Math.abs(b[1] - a[1]) * 0.04;
    return `Q ${(a[0] + b[0]) / 2 + lean} ${(a[1] + b[1]) / 2 + drop} ${b[0]} ${b[1]}`;
}

// The stored arrangement, keeping only well-formed entries (a bad blob just means the default).
function readSaved(): Record<string, Point> {
    const raw = loadJson<unknown>(STORE, {});
    const out: Record<string, Point> = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [key, at] of Object.entries(raw as Record<string, unknown>)) {
        if (Array.isArray(at) && at.length === 2 && at.every((v) => typeof v === 'number' && v >= 0 && v <= 1))
            out[key] = [at[0], at[1]];
    }
    return out;
}

// A mouse or a pen, not a finger: only then can a polaroid be picked up.
function useFinePointer(): boolean {
    const [fine, setFine] = useState(() => matchMedia('(pointer: fine)').matches);
    useEffect(() => {
        const query = matchMedia('(pointer: fine)');
        const update = () => setFine(query.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return fine;
}

export function PhotoCork({ feed, photos, status, anyImages, open, onPhoto }: PhotoViewProps) {
    const compact = useCompactUi();
    const fine = useFinePointer();
    const rulerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hintId = useId();
    // the boards' inner width, measured; 0 until the page is first laid out
    const [width, setWidth] = useState(0);
    const [shown, setShown] = useState<Record<string, boolean>>({});
    const [saved, setSaved] = useState(readSaved);
    // the desktop board can be arranged (Alt + arrows); with a mouse, also dragged
    const arrangeable = !compact;
    const movable = arrangeable && fine;

    const months: Month[] = [];
    photos.forEach((photo, index) => {
        const key = monthKey(photo.post.created_at);
        const last = months[months.length - 1];
        if (last?.key === key) last.items.push({ photo, index });
        else months.push({ key, label: monthLabel(photo.post.created_at), items: [{ photo, index }] });
    });
    const boardKeys = months.map((month) => month.key).join(' ');
    const measured = width > 0;
    // the photo moved last lies on top
    const rank = new Map(Object.keys(saved).map((key, i) => [key, i]));

    // Every board shares one width: the ruler has the boards' inner insets and no content.
    useEffect(() => {
        const ruler = rulerRef.current;
        if (!ruler) return;
        const observer = new ResizeObserver(([entry]) => {
            const next = Math.round(entry.contentRect.width);
            if (next > 0) setWidth(next);
        });
        observer.observe(ruler);
        return () => observer.disconnect();
    }, []);

    // A board pins its photos on the first time it scrolls into view; nothing watches while closed.
    useEffect(() => {
        const root = scrollRef.current;
        if (!root || !open || !measured) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const seen = entries.filter((entry) => entry.isIntersecting);
                if (!seen.length) return;
                for (const entry of seen) observer.unobserve(entry.target);
                setShown((old) => {
                    const next = { ...old };
                    for (const entry of seen) next[(entry.target as HTMLElement).dataset.month ?? ''] = true;
                    return next;
                });
            },
            { root, rootMargin: '0px 0px -12% 0px' }
        );
        root.querySelectorAll('.cork-board[data-month]:not([data-shown])').forEach((board) => observer.observe(board));
        return () => observer.disconnect();
    }, [open, measured, boardKeys]);

    const place = (key: string, at: Point) => {
        const next = { ...saved };
        delete next[key];
        next[key] = [Math.round(at[0] * 1e4) / 1e4, Math.round(at[1] * 1e4) / 1e4];
        setSaved(next);
        saveJson(STORE, next);
    };
    const forget = (keys: string[]) => {
        const next = { ...saved };
        for (const key of keys) delete next[key];
        setSaved(next);
        saveJson(STORE, next);
    };

    return (
        <div className="cork-view" data-compact={compact || undefined} data-movable={movable || undefined}>
            <div className="cork-scroll" ref={scrollRef}>
                <div className="cork-ruler" ref={rulerRef} aria-hidden="true" />
                {measured &&
                    months.map((month) => (
                        <CorkBoard
                            key={month.key}
                            month={month}
                            width={width}
                            compact={compact}
                            arrangeable={arrangeable}
                            movable={movable}
                            shown={!!shown[month.key]}
                            saved={saved}
                            rank={rank}
                            hintId={hintId}
                            onPlace={place}
                            onTidy={forget}
                            onPhoto={onPhoto}
                        />
                    ))}
                {!photos.length && <CorkNote status={status} anyImages={anyImages} onRetry={feed.reload} />}
            </div>
            {arrangeable && photos.length > 0 && (
                <p id={hintId} className="ow-sr">
                    {movable ? '拖动照片可以换位置，' : ''}按住 Alt 再按方向键可以挪一挪；摆法只记在这台设备上。
                </p>
            )}
        </div>
    );
}

type CorkBoardProps = {
    month: Month;
    width: number;
    compact: boolean;
    arrangeable: boolean;
    movable: boolean;
    /** it has been on screen: its photos are pinned on */
    shown: boolean;
    saved: Record<string, Point>;
    rank: Map<string, number>;
    hintId: string;
    /** a photo was put down here (a share of the board) */
    onPlace: (key: string, at: Point) => void;
    /** these photos go back to the board's own arrangement */
    onTidy: (keys: string[]) => void;
    onPhoto: (index: number) => void;
};

// One month: the cork in its frame, the label, the polaroids, the string and the pins.
function CorkBoard({
    month,
    width,
    compact,
    arrangeable,
    movable,
    shown,
    saved,
    rank,
    hintId,
    onPlace,
    onTidy,
    onPhoto
}: CorkBoardProps) {
    const surfaceRef = useRef<HTMLDivElement>(null);
    const grab = useRef<Grab | null>(null);
    // the click that ends a drag must not open the lightbox
    const droppedAt = useRef(-1e9);
    const glideFrame = useRef(0);
    const glideEnd = useRef(0);
    const edgeFrame = useRef(0);
    const pointer = useRef<Point>([0, 0]);
    const [drag, setDrag] = useState<{ key: string; at: Point } | null>(null);
    const [tweens, setTweens] = useState<Record<string, Tween>>({});
    const [clock, setClock] = useState(0);
    useEffect(
        () => () => {
            cancelAnimationFrame(glideFrame.current);
            cancelAnimationFrame(edgeFrame.current);
        },
        []
    );

    const keys = month.items.map(({ photo }) => photo.key);
    const layout = arrange(keys, width, compact);
    const { pw, ph } = layout;
    // where each polaroid is right now: in the hand, gliding, put down here by hand, or the default
    const rest = keys.map((key, i): Point => {
        const mine = arrangeable ? saved[key] : undefined;
        const spot = layout.spots[i];
        return mine ? inside(layout, mine[0] * layout.w, mine[1] * layout.h, spot.tilt) : [spot.x, spot.y];
    });
    const at = keys.map((key, i): Point => {
        if (drag?.key === key) return drag.at;
        const tween = tweens[key];
        if (!tween) return rest[i];
        const t = settle((clock - tween.start) / tween.dur);
        return [tween.from[0] + (rest[i][0] - tween.from[0]) * t, tween.from[1] + (rest[i][1] - tween.from[1]) * t];
    });
    const pins = at.map(([x, y], i): Point => [x + layout.spots[i].pin, y - ph / 2 + PIN_Y]);
    // one string per day with two or more photos, through their pins in order
    const days = month.items.map(({ photo }) => new Date(photo.post.created_at).toDateString());
    const strings: { key: string; d: string }[] = [];
    for (let i = 0, first = 0; i < keys.length; i++) {
        if (days[i + 1] === days[i]) continue;
        if (i > first) {
            let d = `M ${pins[first][0]} ${pins[first][1]}`;
            for (let j = first + 1; j <= i; j++) {
                const [dx, dy] = [pins[j][0] - pins[j - 1][0], pins[j][1] - pins[j - 1][1]];
                // the upper photo's caption is in the way: lean the way its pin leans (or outwards)
                const upper = dy > 0 ? j - 1 : j;
                const side = Math.sign(layout.spots[upper].pin) || (at[upper][0] > layout.w / 2 ? 1 : -1);
                const lean = Math.abs(dy) > Math.abs(dx) * 1.5 ? side * Math.min(72, Math.abs(dy) * 0.3) : 0;
                d += ` ${sag(pins[j - 1], pins[j], lean)}`;
            }
            strings.push({ key: keys[first], d });
        }
        first = i + 1;
    }
    const tidy = arrangeable && keys.some((key) => saved[key]);
    const count = Math.min(keys.length, 12);

    // Glide polaroids from where they are to where they rest; the pins and the string go along.
    // `now` is the event's time stamp (the clock requestAnimationFrame counts in).
    const glide = (from: Record<string, Point>, now: number, dur: number, stagger: number) => {
        if (motionReduced()) return;
        const next: Record<string, Tween> = {};
        Object.keys(from).forEach((key, i) => {
            next[key] = { from: from[key], start: now + i * stagger, dur };
        });
        glideEnd.current = Math.max(glideEnd.current, now + (Object.keys(from).length - 1) * stagger + dur);
        setTweens((old) => ({ ...old, ...next }));
        setClock(now);
        cancelAnimationFrame(glideFrame.current);
        const tick = (time: number) => {
            setClock(time);
            if (time < glideEnd.current) glideFrame.current = requestAnimationFrame(tick);
            else setTweens({});
        };
        glideFrame.current = requestAnimationFrame(tick);
    };

    // The pin pressed back in where a polaroid was put down.
    const press = (key: string) => {
        const pin = surfaceRef.current?.querySelector(`.cork-pin[data-key="${CSS.escape(key)}"]`);
        if (!pin || motionReduced()) return;
        pin.animate(
            [
                { scale: '1.55', translate: '-1px -5px' },
                { scale: '1', translate: '0 0' }
            ],
            { duration: 420, easing: 'cubic-bezier(0.3, 1.5, 0.5, 1)' }
        );
    };

    // Follow the pointer, held where it took the polaroid; also after the board scrolls under it.
    const follow = () => {
        const g = grab.current;
        const box = surfaceRef.current?.getBoundingClientRect();
        if (!g || !box) return;
        const [cx, cy] = pointer.current;
        setDrag({
            key: g.key,
            at: inside(layout, cx - box.left - g.dx, cy - box.top - g.dy, layout.spots[g.index].tilt)
        });
    };
    const followRef = useRef(follow);
    useLayoutEffect(() => {
        followRef.current = follow;
    });

    // Near the scroller's top or bottom edge a held polaroid scrolls the page along.
    const edgeScroll = () => {
        const scroller = surfaceRef.current?.closest('.cork-scroll');
        if (!grab.current || !scroller) return;
        const box = scroller.getBoundingClientRect();
        const y = pointer.current[1];
        const zone = 48;
        const push = y < box.top + zone ? y - box.top - zone : y > box.bottom - zone ? y - box.bottom + zone : 0;
        if (push) {
            const before = scroller.scrollTop;
            scroller.scrollTop += Math.max(-18, Math.min(18, push * 0.4));
            if (scroller.scrollTop !== before) followRef.current();
        }
        edgeFrame.current = requestAnimationFrame(edgeScroll);
    };

    const pickUp = (event: PointerEvent<HTMLButtonElement>, i: number) => {
        if (!movable || event.button !== 0 || event.pointerType === 'touch' || !event.isPrimary) return;
        const box = surfaceRef.current?.getBoundingClientRect();
        if (!box) return;
        grab.current = {
            key: keys[i],
            index: i,
            id: event.pointerId,
            x0: event.clientX,
            y0: event.clientY,
            dx: event.clientX - box.left - at[i][0],
            dy: event.clientY - box.top - at[i][1],
            moved: false
        };
        pointer.current = [event.clientX, event.clientY];
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent<HTMLButtonElement>) => {
        const g = grab.current;
        if (!g || event.pointerId !== g.id) return;
        pointer.current = [event.clientX, event.clientY];
        if (!g.moved) {
            if (Math.hypot(event.clientX - g.x0, event.clientY - g.y0) < DRAG_PX) return;
            g.moved = true;
            // a polaroid still gliding is caught where it is
            setTweens((old) => {
                const next = { ...old };
                delete next[g.key];
                return next;
            });
            cancelAnimationFrame(edgeFrame.current);
            edgeFrame.current = requestAnimationFrame(edgeScroll);
        }
        follow();
    };
    const putDown = (event: PointerEvent<HTMLButtonElement>) => {
        const g = grab.current;
        if (!g || event.pointerId !== g.id) return;
        grab.current = null;
        cancelAnimationFrame(edgeFrame.current);
        if (!g.moved) return;
        droppedAt.current = event.timeStamp;
        const box = surfaceRef.current?.getBoundingClientRect();
        const [cx, cy] = pointer.current;
        const end = box
            ? inside(layout, cx - box.left - g.dx, cy - box.top - g.dy, layout.spots[g.index].tilt)
            : at[g.index];
        onPlace(g.key, [end[0] / layout.w, end[1] / layout.h]);
        setDrag(null);
        press(g.key);
    };

    // Alt + arrows nudge the focused polaroid (Shift for bigger steps) and remember it.
    const nudge = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
        if (!arrangeable || !event.altKey || event.ctrlKey || event.metaKey) return;
        const step = event.shiftKey ? 48 : 12;
        const by: Record<string, Point> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step]
        };
        const d = by[event.key];
        if (!d) return;
        event.preventDefault();
        // from where it is going, so quick presses add up while it glides
        const next = inside(layout, rest[i][0] + d[0], rest[i][1] + d[1], layout.spots[i].tilt);
        onPlace(keys[i], [next[0] / layout.w, next[1] / layout.h]);
        glide({ [keys[i]]: at[i] }, event.timeStamp, NUDGE_MS, 0);
    };

    const tidyUp = (event: MouseEvent<HTMLButtonElement>) => {
        const from: Record<string, Point> = {};
        keys.forEach((key, i) => {
            if (saved[key]) from[key] = at[i];
        });
        onTidy(Object.keys(from));
        glide(from, event.timeStamp, GLIDE_MS, 45);
        // low motion: they are simply back, fading in where they belong (the polaroid and its pin)
        if (motionReduced())
            for (const key of Object.keys(from))
                surfaceRef.current
                    ?.querySelectorAll(`[data-key="${CSS.escape(key)}"]`)
                    .forEach((el) =>
                        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
                    );
        // the button leaves with the arrangement: the keyboard stays on this board
        surfaceRef.current?.querySelector<HTMLElement>('.cork-pola')?.focus({ preventScroll: true });
    };

    return (
        <section
            className="cork-board"
            data-month={month.key}
            data-shown={shown || undefined}
            aria-label={`${month.label}，${month.items.length} 张`}
            style={{ '--string-delay': `${count * 70 + 420}ms` } as CSSProperties}
        >
            <div className="cork-frame">
                <div className="cork-surface" ref={surfaceRef} style={{ height: layout.h }}>
                    <div className="cork-label">
                        <i
                            className="cork-pin"
                            aria-hidden="true"
                            style={{ '--pin': LABEL_PIN[0], '--pin-deep': LABEL_PIN[1] } as CSSProperties}
                        />
                        <h3 className="cork-month">
                            {month.label}
                            <small> · {month.items.length} 张</small>
                        </h3>
                        {tidy && (
                            <button type="button" className="cork-tidy" onClick={tidyUp}>
                                <ISparkle size={13} sw={2} aria-hidden="true" />
                                整理一下
                            </button>
                        )}
                    </div>
                    <div className="cork-polas">
                        {month.items.map(({ photo, index }, i) => {
                            const spot = layout.spots[i];
                            const order = rank.get(photo.key);
                            const style = {
                                left: Math.round(at[i][0] - pw / 2),
                                top: Math.round(at[i][1] - ph / 2),
                                width: pw,
                                height: ph,
                                transformOrigin: `calc(50% + ${spot.pin}px) ${PIN_Y}px`,
                                '--tilt': `${spot.tilt.toFixed(2)}deg`,
                                '--z': arrangeable && order !== undefined ? keys.length + 1 + order : keys.length - i,
                                '--order': Math.min(i, 12)
                            } as CSSProperties;
                            return (
                                <button
                                    type="button"
                                    key={photo.key}
                                    className="mem-pola cork-pola"
                                    style={style}
                                    data-key={photo.key}
                                    data-lifted={drag?.key === photo.key || undefined}
                                    aria-label={`查看 ${photoCaption(photo.post.created_at)} 的照片`}
                                    aria-describedby={arrangeable ? hintId : undefined}
                                    onClick={(event) => {
                                        if (event.timeStamp - droppedAt.current > 350) onPhoto(index);
                                    }}
                                    onPointerDown={(event) => pickUp(event, i)}
                                    onPointerMove={move}
                                    onPointerUp={putDown}
                                    onPointerCancel={putDown}
                                    onLostPointerCapture={putDown}
                                    onKeyDown={(event) => nudge(event, i)}
                                >
                                    <span className="mem-pola-pic">
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
                                    </span>
                                    <span className="mem-pola-cap">{photoCaption(photo.post.created_at)}</span>
                                </button>
                            );
                        })}
                    </div>
                    <svg
                        className="cork-string"
                        width={layout.w}
                        height={layout.h}
                        viewBox={`0 0 ${layout.w} ${layout.h}`}
                        aria-hidden="true"
                    >
                        {strings.map((string) => (
                            <g key={string.key}>
                                <path className="cork-thread" d={string.d} pathLength={1} />
                                <path className="cork-twist" d={string.d} />
                            </g>
                        ))}
                    </svg>
                    <div className="cork-pins" aria-hidden="true">
                        {pins.map(([x, y], i) => (
                            <i
                                key={keys[i]}
                                className="cork-pin"
                                data-key={keys[i]}
                                data-lifted={drag?.key === keys[i] || undefined}
                                style={
                                    {
                                        left: Math.round(x),
                                        top: Math.round(y),
                                        '--pin': layout.spots[i].tone[0],
                                        '--pin-deep': layout.spots[i].tone[1],
                                        '--order': Math.min(i, 12)
                                    } as CSSProperties
                                }
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// No photos yet: a paper note pinned on an empty board — loading, failed, or nothing to show.
function CorkNote({ status, anyImages, onRetry }: { status: FeedStatus; anyImages: boolean; onRetry: () => void }) {
    const waiting = status === 'loading' || anyImages;
    const failed = !waiting && status === 'error';
    return (
        <section className="cork-board cork-empty" data-shown aria-label="照片墙">
            <div className="cork-frame">
                <div className="cork-surface">
                    <div className="cork-pins" aria-hidden="true">
                        {SPARE.map(([x, y, tone], i) => (
                            <i
                                key={`${x}-${y}`}
                                className="cork-pin"
                                style={
                                    {
                                        left: `${x}%`,
                                        top: `${y}%`,
                                        '--pin': PINS[tone][0],
                                        '--pin-deep': PINS[tone][1],
                                        '--order': i + 1
                                    } as CSSProperties
                                }
                            />
                        ))}
                    </div>
                    <div
                        className="mem-note mem-paper cork-note"
                        role={failed ? 'alert' : waiting ? 'status' : undefined}
                    >
                        <i
                            className="cork-pin"
                            aria-hidden="true"
                            style={{ '--pin': LABEL_PIN[0], '--pin-deep': LABEL_PIN[1] } as CSSProperties}
                        />
                        {waiting ? (
                            <p>正在把照片一张张贴上墙…</p>
                        ) : failed ? (
                            <>
                                <p>照片暂时没能载入。</p>
                                <button type="button" className="mem-note-btn" onClick={onRetry}>
                                    再试一次
                                </button>
                            </>
                        ) : (
                            <>
                                <img
                                    className="mem-note-art"
                                    src="/ui/memory/empty-wall.webp"
                                    alt=""
                                    width={96}
                                    height={96}
                                />
                                <p className="mem-note-title">墙上还空着。</p>
                                <p>在日记里写一页带照片的回忆，它就会贴到这里。</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default PhotoCork;
