// room-types.ts — data contract for the room template system.
// A room is a mass-producible template: static base art per mood + slots
// (window/clock/seats/hotspots) that runtime layers attach to. Characters
// live in their own layer and are decoupled from rooms (see ai/PROJECT.md).

export type RoomMood = 'golden' | 'twilight' | 'night';
export type RoomWeather = 'sun' | 'rain';

/** Axis-aligned rect in base-image pixel coordinates. */
export type PxRect = {
    x: number;
    y: number;
    w: number;
    h: number;
};

/** Point in base-image pixel coordinates. */
export type PxPoint = {
    x: number;
    y: number;
};

/**
 * A circle lying on a painted surface, seen in perspective — an ellipse in
 * base-image px. `tilt` is the long-axis angle in radians, positive =
 * clockwise on screen (pixi's rotation convention), so it can be assigned
 * to a container's `rotation` as is.
 */
export type PxEllipse = {
    cx: number;
    cy: number;
    /** Semi-axis along the tilt direction (the long axis of a flat disc). */
    rx: number;
    /** Semi-axis across it — the foreshortened one. */
    ry: number;
    tilt: number;
};

/** Turntable prop: a painted platter that really spins (living props, see ai/design_system/research/living-props.md). */
export type TurntableSpec = {
    /** Outer rim of the vinyl. Fit with scripts/fit-disc-ellipse.py — never eyeballed. */
    platter: PxEllipse;
    /**
     * Where the disc's TRUE center is painted (label center / spindle foot).
     * Under perspective it sits off the ellipse center, toward the far side;
     * rim + center together pin down the disc plane, so the spin can be
     * rendered as a real perspective rotation instead of a flat one.
     */
    center: PxPoint;
    /** Tonearm post center; the arm patch swings around it on hover. */
    armPivot: PxPoint;
    /**
     * Hand-traced polygon covering the tonearm from post to headshell with a
     * few px of margin. It is re-cut from the base art and drawn above the
     * spinning platter so the arm holds still while the vinyl turns.
     */
    armPatch: PxPoint[];
    /**
     * Other painted details sitting on the platter that must not turn with
     * it (the spindle, a fixed sheen). Each is inpainted out of the spinning
     * cut — grooves are concentric, so same-radius pixels fill seamlessly —
     * and re-laid on top as a static patch.
     */
    stills?: PxPoint[][];
};

/** Furniture that moves on its own (idle) and reacts to hover with a state change, never an image swap. */
export type RoomProps = {
    turntable?: TurntableSpec;
};

export type ClockSpec = {
    /** Dial center in base-image pixels. */
    center: PxPoint;
    /** Dial radius in base-image pixels; hands are sized relative to it. */
    radius: number;
};

export type WindowSpec = {
    /** Glass panes the rain layer draws into (outdoor rain + drops on glass). */
    panes: PxRect[];
    /**
     * Bounding area used by the light layer to cast the "window glow" into
     * the room. Usually slightly larger than the union of panes.
     */
    glow: PxRect;
};

export type SeatAnchor = {
    id: string;
    /** Feet/base center of the seated character, in base-image pixels. */
    foot: PxPoint;
    /** Target character height in base-image pixels (art is scaled to fit). */
    height: number;
    /**
     * Breathing phase offset in seconds so multiple characters never move
     * in sync (sync reads as mechanical, see ai/STYLE.md §6).
     */
    phase: number;
    /**
     * Where the visual head top sits, as a fraction of `height` above the
     * foot anchor. Art ships with transparent padding and pose-dependent
     * proportions, so overhead tags need a hand-tuned anchor per seat.
     */
    headRatio: number;
};

/**
 * A clickable furniture region that opens a feature (ai/UX.md §2/§5).
 * Affordance is sparkles plus the furniture's own living-prop motion — no
 * outlines, no glow art, no image swaps (user direction 2026-08-22).
 */
export type HotspotSpec = {
    /** Feature key the shell maps to a surface (timeline/photos/clock/…). */
    id: string;
    /** Interactive region in base-image pixels. */
    rect: PxRect;
};

export type RoomTemplate = {
    id: string;
    /** Natural size of the base art; every anchor above is in this space. */
    base: { w: number; h: number };
    /** Base art per mood. Missing moods fall back via `moodFallback`. */
    art: Partial<Record<RoomMood, string>>;
    /** Fallback chain when a mood has no dedicated base art (yet). */
    moodFallback: Record<RoomMood, RoomMood>;
    window: WindowSpec;
    clock: ClockSpec;
    seats: SeatAnchor[];
    hotspots: HotspotSpec[];
    /** Living props; a room without any simply stays still. */
    props?: RoomProps;
};

/** Resolve the art path for a mood, following the fallback chain once. */
export function resolveRoomArt(room: RoomTemplate, mood: RoomMood): string {
    const direct = room.art[mood];
    if (direct) return direct;
    const fallback = room.art[room.moodFallback[mood]];
    if (fallback) return fallback;
    // A template with no art at all is a build-time mistake; fail loud in dev.
    throw new Error(`room "${room.id}" has no base art for mood "${mood}"`);
}

/** Map wall-clock hour to a mood. Golden covers daytime until the twilight band. */
export function moodFromHour(hour: number): RoomMood {
    if (hour >= 6 && hour < 16) return 'golden';
    if (hour >= 16 && hour < 19) return 'twilight';
    return 'night';
}
