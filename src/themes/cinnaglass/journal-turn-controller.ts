// journal-turn-controller.ts — decides when paper moves. Geometry and painting
// live in journal-turn.ts.
// Feature doc: ai/features/timeline.md
import { JournalTurnStage, type TurnDirection, type TurnFrame, type TurnGeometry } from './journal-turn';

// A sheet in flight: where it came from, where it lands, and how far along.
type Motion = TurnFrame & { elapsed: number; duration: number };
type Options = {
    host: HTMLElement;
    pages: HTMLElement[];
    geometry: TurnGeometry;
    page: number;
    onCommit: (page: number) => void;
    onTarget: (page: number) => void;
    onBusy: (busy: boolean) => void;
};

// Cosine ease-in-out: zero velocity at both ends, so a sheet never snaps flat.
const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

// A bounded queue of physical sheets. Repeated input changes the destination,
// never restarts a sheet mid-air or substitutes fake middle-page text.
export class JournalTurnController {
    private options: Options;
    private current: number;
    private destination: number;
    private step: number;
    private motions: Motion[] = [];
    private stage: JournalTurnStage | null = null;
    private raf = 0;
    private lastTime = 0;
    private serial = 0;
    private burst = false;
    private disposed = false;
    private reduced = matchMedia('(prefers-reduced-motion: reduce)');
    private visibility = () => {
        if (document.hidden) this.finish();
    };
    private reduction = () => {
        if (this.reduced.matches) this.finish();
    };

    constructor(options: Options) {
        this.options = options;
        this.current = options.page;
        this.destination = options.page;
        this.step = options.geometry.single ? 1 : 2;
        document.addEventListener('visibilitychange', this.visibility);
        this.reduced.addEventListener('change', this.reduction);
    }

    // Where the reader asked to be — may be several spreads ahead of `current`.
    get target() {
        return this.destination;
    }
    // True while any sheet is in the air.
    get busy() {
        return this.stage !== null;
    }

    // Aim at a page. Repeated calls only move the destination — an airborne sheet
    // is accelerated, never restarted. Degrades to an instant jump when motion is
    // reduced, 3D is unsupported, or the tab is hidden.
    to(target: number) {
        if (this.disposed) return;
        this.destination = Math.max(
            0,
            Math.min(this.options.pages.length - this.step, Math.floor(target / this.step) * this.step)
        );
        this.options.onTarget(this.destination);
        if (this.reduced.matches || !CSS.supports('transform-style', 'preserve-3d') || document.hidden) {
            this.finish();
            return;
        }
        if (this.stage) {
            this.burst = true;
            // Preserve angular position when accelerating an existing sheet.
            for (const motion of this.motions) {
                const fraction = motion.elapsed / motion.duration;
                motion.duration = 470;
                motion.elapsed = fraction * motion.duration;
            }
            return;
        }
        if (this.current === this.destination) return;
        this.burst = Math.abs(this.destination - this.current) > this.step;
        this.stage = new JournalTurnStage(this.options.pages, this.options.geometry);
        this.options.host.replaceChildren(this.stage.element);
        this.options.onBusy(true);
        this.options.host.dataset.turning = 'true';
        this.startSheet();
        this.stage.render(this.current, this.motions);
        this.lastTime = performance.now();
        this.raf = requestAnimationFrame(this.tick);
    }

    // Relative aim, in spreads.
    by(direction: TurnDirection) {
        this.to(this.destination + direction * this.step);
    }

    // Queue the next sheet, if one is still needed and it flies the same way as
    // the ones already up (never two directions at once).
    private startSheet() {
        const from = this.motions.at(-1)?.to ?? this.current;
        if (from === this.destination) return;
        const direction: TurnDirection = this.destination > from ? 1 : -1;
        if (this.motions.length && this.motions[0].direction !== direction) return;
        const to = from + direction * this.step;
        this.motions.push({
            id: ++this.serial,
            from,
            to,
            direction,
            progress: 0,
            elapsed: 0,
            duration: this.burst ? 470 : 980
        });
    }

    // One rAF step: advance every sheet, commit the ones that landed, launch the
    // next when bursting, and stop the loop once the queue drains.
    private tick = (time: number) => {
        if (!this.stage || this.disposed) return;
        const dt = Math.min(50, Math.max(0, time - this.lastTime));
        this.lastTime = time;
        for (const motion of this.motions) {
            motion.elapsed = Math.min(motion.duration, motion.elapsed + dt);
            motion.progress = ease(motion.elapsed / motion.duration);
        }
        while (this.motions[0]?.progress === 1) {
            this.current = this.motions.shift()!.to;
            this.options.onCommit(this.current);
        }
        const last = this.motions.at(-1);
        if (!last || (this.burst && last.elapsed / last.duration >= 0.38 && this.motions.length < 3)) this.startSheet();
        if (!this.motions.length) {
            this.clear();
            return;
        }
        this.stage.render(this.current, this.motions);
        this.options.host.dataset.currentPage = String(this.current);
        this.options.host.dataset.targetPage = String(this.destination);
        this.raf = requestAnimationFrame(this.tick);
    };

    // Forward late signed URLs to the sheets currently in the air.
    updateImages(urlFor: (path: string) => string | undefined) {
        this.stage?.updateImages(urlFor);
    }

    // Closing/resizing retains the nearest physical spread, not a half-turned
    // clone or an arbitrarily distant queued destination.
    cancel() {
        if (this.motions[0]?.progress >= 0.5) this.current = this.motions[0].to;
        this.destination = this.current;
        this.options.onCommit(this.current);
        this.options.onTarget(this.current);
        this.clear();
    }

    // Jump straight to the destination, no animation. The reduced-motion and
    // hidden-tab path.
    finish() {
        this.current = this.destination;
        this.options.onCommit(this.current);
        this.clear();
    }

    // Tear the stage down and report idle. Leaves current/destination alone.
    private clear() {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.stage?.destroy();
        this.stage = null;
        this.motions = [];
        this.options.host.dataset.turning = 'false';
        this.options.onBusy(false);
    }

    // Permanent teardown: after this the controller ignores every call.
    destroy() {
        this.clear();
        this.disposed = true;
        document.removeEventListener('visibilitychange', this.visibility);
        this.reduced.removeEventListener('change', this.reduction);
    }
}
