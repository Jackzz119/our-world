// journal-turn.ts — a sheet is a pair of real DOM faces, bent around the
// binding in 3D. Text and photographs are never painted independently of their
// paper. This file owns geometry and painting only; when and how far to turn is
// JournalTurnController's job.
// Feature doc: ai/features/timeline.md
import { applyThumbUrls } from '@/themes/cinnaglass/journal/layout';
export type TurnDirection = 1 | -1;
export type TurnGeometry = {
    width: number;
    height: number;
    bookWidth: number;
    bookHeight: number;
    left: number;
    top: number;
    single: boolean;
    heading?: { x: number; y: number; font: string; spacing: string };
    folios?: { x: number; y: number; font: string }[];
};
export type TurnFrame = { id: number; from: number; to: number; progress: number; direction: TurnDirection };
type Strip = { node: HTMLElement; frontShade: HTMLElement; backShade: HTMLElement };
type Sheet = { node: HTMLElement; strips: Strip[]; frame: TurnFrame };
// 24 strips is where the bend stops looking faceted without costing frames.
const STRIPS = 24;
const make = (name: string) => {
    const node = document.createElement('div');
    node.className = name;
    return node;
};

// Integrate equal-length pieces of a shallow cylindrical bend. The binding
// remains x=z=0. Both endpoints are EXACTLY flat and retain their full width.
export function sheetPose(progress: number, direction: TurnDirection, width: number, count = STRIPS) {
    const p = Math.max(0, Math.min(1, progress));
    const angle = Math.PI * (direction === 1 ? p : 1 - p);
    const bend = 0.32 * Math.sin(Math.PI * p) * direction;
    const segment = width / count;
    let x = 0;
    let z = 0;
    return Array.from({ length: count }, (_, i) => {
        const local = angle - bend * Math.sin((Math.PI * (i + 0.5)) / count);
        const pose = { x, z, angle: local, width: segment };
        x += Math.cos(local) * segment;
        z += Math.sin(local) * segment;
        return pose;
    });
}

// The turning stage: two static base leaves plus one clone-sheet per sheet in
// flight. Every face is a deep clone of a real page, so mid-turn text is the
// genuine content — never a placeholder.
export class JournalTurnStage {
    readonly element = make('journal-turn-stage');
    private space = make('journal-turn-space');
    private bases = make('journal-turn-bases');
    private shadow = make('journal-turn-shadow');
    private sheets = new Map<number, Sheet>();
    private baseKey = '';
    private pages: HTMLElement[];
    private geometry: TurnGeometry;
    constructor(pages: HTMLElement[], geometry: TurnGeometry) {
        this.pages = pages;
        this.geometry = geometry;
        const { width, height, single } = geometry;
        this.element.setAttribute('aria-hidden', 'true');
        this.element.inert = true;
        this.element.style.cssText = `width:${width * (single ? 1 : 2)}px;height:${height}px;perspective:${width * 5.5}px;perspective-origin:${single ? 0 : width}px 42%`;
        this.space.append(this.bases, this.shadow);
        this.element.append(this.space);
    }

    // Build one printable face for `page`. Clones the live leaf, strips its ids
    // (a clone must not duplicate them), and re-prints the book art, heading and
    // folio at the coordinates measured from the real book.
    private face(page: number, side: 'left' | 'right') {
        const g = this.geometry;
        const original = this.pages[page];
        const copy = original ? (original.cloneNode(true) as HTMLElement) : make('journal-page journal-room-leaf');
        copy.classList.add('journal-turn-copy');
        copy.classList.toggle('--left', side === 'left');
        copy.classList.toggle('--right', side === 'right');
        copy.hidden = false;
        copy.inert = true;
        copy.removeAttribute('id');
        copy.removeAttribute('aria-hidden');
        copy.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
        copy.style.width = `${g.width}px`;
        copy.style.height = `${g.height}px`;
        copy.dataset.page = String(page);
        const paper = make('journal-turn-paper');
        const image = document.createElement('img');
        image.src = g.single ? '/ui/journal/book-single.webp' : '/ui/journal/book-open.webp';
        image.alt = '';
        image.style.cssText = `width:${g.bookWidth}px;height:${g.bookHeight}px;left:${-g.left - (side === 'right' && !g.single ? g.width : 0)}px;top:${-g.top}px`;
        paper.append(image);
        copy.prepend(paper);
        // The heading and printed folio belong to the same paper, not a HUD.
        if (side === 'left' || g.single) {
            const heading = make('journal-turn-heading');
            heading.textContent = '我们的日记';
            if (g.heading) {
                const stamp = g.heading;
                heading.style.cssText = `left:${stamp.x}px;top:${stamp.y}px;font:${stamp.font};letter-spacing:${stamp.spacing}`;
            }
            copy.append(heading);
        }
        const stamps = g.folios ? (g.single ? g.folios : [g.folios[side === 'left' ? 0 : 1]]) : [undefined];
        for (const stamp of stamps) {
            const folio = make('journal-turn-folio');
            folio.textContent = String(page + 1);
            if (stamp)
                folio.style.cssText = `left:${stamp.x}px;right:auto;top:${stamp.y}px;bottom:auto;font:${stamp.font};transform:translateX(-50%)`;
            copy.append(folio);
        }
        return copy;
    }

    // Slice one sheet into STRIPS vertical strips, each carrying a front and a
    // back face offset so the strips together read as one continuous page.
    private createSheet(frame: TurnFrame): Sheet {
        const { width, height, single } = this.geometry;
        const node = make('journal-turn-sheet');
        node.dataset.turnId = String(frame.id);
        node.style.left = `${single ? 0 : width}px`;
        const frontPage = frame.direction === 1 ? frame.from + (single ? 0 : 1) : frame.to + (single ? 0 : 1);
        const backPage = frame.direction === 1 ? frame.to : frame.from;
        const frontTemplate = this.face(frontPage, 'right');
        const backTemplate = this.face(backPage, single ? 'right' : 'left');
        const strips = Array.from({ length: STRIPS }, (_, i) => {
            const strip = make('journal-turn-strip');
            const w = width / STRIPS;
            strip.style.cssText = `width:${w}px;height:${height}px`;
            const faces = [make('journal-turn-face journal-turn-front'), make('journal-turn-face journal-turn-back')];
            const shades = [make('journal-turn-shade'), make('journal-turn-shade')];
            faces.forEach((face, side) => {
                // A narrow overdraw seals antialiased GPU tile seams.
                face.style.width = `${w + 1.2}px`;
                face.style.transformOrigin = `${w / 2}px 50%`;
                const content = (side === 0 ? frontTemplate : backTemplate).cloneNode(true) as HTMLElement;
                content.style.left = `${-(side === 0 ? i * w : width - (i + 1) * w)}px`;
                face.append(content, shades[side]);
            });
            strip.append(...faces);
            node.append(strip);
            return { node: strip, frontShade: shades[0], backShade: shades[1] };
        });
        this.space.append(node);
        return { node, strips, frame };
    }

    // Paint one frame: refresh the base spread if it changed, drop sheets that
    // finished, then pose every strip of every live sheet and size the spine shadow.
    render(current: number, frames: TurnFrame[]) {
        const { width, single } = this.geometry;
        const last = frames.at(-1);
        const forward = last?.direction !== -1;
        const left = forward ? current : (last?.to ?? current);
        const right = forward ? (last?.to ?? current) + (single ? 0 : 1) : current + (single ? 0 : 1);
        const key = `${left}:${right}:${single}`;
        if (key !== this.baseKey) {
            this.baseKey = key;
            const baseLeft = this.face(left, single ? 'right' : 'left');
            const baseRight = this.face(right, 'right');
            baseRight.style.left = `${single ? 0 : width}px`;
            this.bases.replaceChildren(...(single ? [baseRight] : [baseLeft, baseRight]));
        }
        for (const [id, sheet] of this.sheets) {
            if (!frames.some((frame) => frame.id === id)) {
                sheet.node.remove();
                this.sheets.delete(id);
            }
        }
        for (const frame of frames) {
            const sheet = this.sheets.get(frame.id) ?? this.createSheet(frame);
            this.sheets.set(frame.id, sheet);
            sheet.frame = frame;
            sheet.node.dataset.progress = frame.progress.toFixed(5);
            sheet.node.dataset.from = String(frame.from);
            sheet.node.dataset.to = String(frame.to);
            const pose = sheetPose(frame.progress, frame.direction, width);
            for (let i = 0; i < pose.length; i++) {
                const part = pose[i];
                const strip = sheet.strips[i];
                strip.node.style.transform = `translate3d(${part.x}px,0,${part.z}px) rotateY(${-part.angle}rad)`;
                const shade = Math.sin(part.angle) ** 2 * 0.22;
                strip.frontShade.style.opacity = String(shade);
                strip.backShade.style.opacity = String(shade * 0.8);
            }
        }
        const p = frames[0]?.progress ?? 0;
        // Resize before translating: the shadow must stay against the spine,
        // not translate a full page width when an upright sheet casts a thin shadow.
        const shadowWidth = width * (0.08 + Math.abs(Math.cos(Math.PI * p)) * 0.55);
        this.shadow.style.cssText = `left:${single ? 0 : width}px;width:${shadowWidth}px;opacity:${Math.sin(Math.PI * p) * 0.26};transform:translateX(${p > 0.5 === forward ? '-100%' : '0'})`;
        this.element.dataset.activeSheets = String(frames.length);
    }

    // Late-arriving signed URLs must also reach the faces already in the air.
    updateImages(urlFor: (path: string) => string | undefined) {
        applyThumbUrls(this.element, urlFor);
    }

    // Detach the stage. The cloned leaves die with it; the real ones are untouched.
    destroy() {
        this.element.remove();
        this.sheets.clear();
    }
}
