// room-types.ts — data contract for the room template system.
// A room is a mass-producible template: static base art per mood + slots
// (window/clock/seats/hotspots) that runtime layers attach to. Characters
// live in their own layer and are decoupled from rooms (see ai/PROJECT.md).

/** The room's lighting hour. Base art, light recipes and actor tints are all keyed by it. */
export type RoomMood = 'golden' | 'twilight' | 'night';
/** What the compositor can actually render; the app's wider weather vocabulary narrows to this. */
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

/**
 * Turntable prop: a painted platter that really spins (living props, see
 * ai/design_system/props.md; full v2 record in arts/archive/v2-companion-house/research/living-props.md).
 *
 * Separated layers (scripts/build-turntable-parts.py): the base art ships
 * as the machine with an EMPTY well (no record, no arm). The record is the
 * painting itself split by SYMMETRY (v5, 2026-09-07): a record's look is
 * light on grooves, so there is no "albedo without light" to generate —
 * instead the rotationally symmetric part of the painted disc turns, and
 * everything that would not survive a turn (sheen, groove sparkle, rim
 * highlight, shadow side) stays put as static light. At rest the two
 * multiply back to the painting. The arm is generated flat albedo lit by
 * tint; the pin is a still cut from the painting.
 */
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
    /** Tonearm post center; the arm part swings around it on hover. */
    armPivot: PxPoint;
    /** Record albedo per mood, disc space (unit circle inscribed in the texture). Turns. */
    platterArt: Record<RoomMood, string>;
    /**
     * The rest of the painting on the record per mood, same disc space, never
     * turns: `add` brightens (sheen, sparkle), `mul` darkens (shadow side, edge).
     */
    platterLight: Record<RoomMood, { add: string; mul: string }>;
    /** Tonearm albedo (post + tube + headshell) and where it lands in base px. */
    arm: { src: string; box: PxRect };
    /** Per-hour light on the arm, as a multiply tint relative to golden. */
    armTint: Record<RoomMood, number>;
    /**
     * Spindle pin cut from each mood's painting: it stands THROUGH the record,
     * so it draws above it, and it never moves, so it keeps the painted light.
     */
    spindle?: { src: Record<RoomMood, string>; box: PxRect };
    /**
     * Where the arm's cast shadow falls at rest, in base px. It is a light
     * direction, so it belongs to the hour: window light by day, lamp light
     * at night. The runtime stretches it as the arm lifts.
     */
    armShadow: Record<RoomMood, { dx: number; dy: number }>;
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
     * in sync (sync reads as mechanical, see ai/design_system/character.md).
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
 * A clickable furniture region that opens a feature (see
 * ai/design_system/props.md and ai/design_system/uiux/uiux.md).
 * Affordance is sparkles plus the furniture's own living-prop motion — no
 * outlines, no glow art, no image swaps (user direction 2026-08-22).
 */
export type HotspotSpec = {
    /** Feature key the shell maps to a surface (timeline/photos/clock/…). */
    id: string;
    /** Interactive region in base-image pixels. */
    rect: PxRect;
};

/** Screen-space origin of a furniture activation, used by object surfaces. */
export type HotspotOpenEvent = {
    id: string;
    clientX: number;
    clientY: number;
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

/* ------------------------------------------------------------------ */
/* Across-the-table rooms (third iteration, ai/features/study-room/)   */
/* ------------------------------------------------------------------ */

/** The two launch avatars. The viewer sees the partner's avatar across the table and their own sleeves in front. */
export type AvatarId = 'ayu' | 'xiaoman';

/**
 * What the partner is doing. Only real signals (or the dev simulator) may set
 * it: away and offline show the empty chair, asleep is set by the partner.
 */
export type PartnerState = 'reading' | 'writing' | 'away' | 'offline' | 'asleep';

/** Every pose an avatar ships; all share one canvas so they swap in place. */
export type PoseId = 'reading' | 'glance' | 'writing' | 'sip' | 'asleep' | 'patted' | 'poked';

/** One avatar's pose art. `closed` is the blink frame, present only on eyes-open poses. */
export type AvatarPoses = {
    /** Pose canvas size in px; every pose file has exactly this size. */
    canvas: { w: number; h: number };
    poses: Record<PoseId, { open: string; closed?: string }>;
};

/**
 * Where the partner sits: the pose canvas lands on the plate with one scale
 * and offset, measured by the assembly script, never eyeballed.
 */
export type PartnerSeat = {
    /** Plate px where the pose canvas' top-left corner lands. */
    origin: PxPoint;
    /** Plate px per pose-canvas px. */
    scale: number;
    /** Pose-canvas px: pressing and stroking here pats, and overhead UI anchors to its top. */
    head: PxRect;
    /** Pose-canvas px: a tap here pokes. */
    body: PxRect;
    /** Pose-canvas px of the torso's bottom middle; breathing and sway pivot here. */
    pivot: PxPoint;
    /**
     * Pose-canvas px around the head, over every pose, so speech never covers
     * the face (ai/design_system/uiux/uiux.md): `left` / `right` sit at eye
     * level just clear of the hair, `faceRight` is the x where the face ends
     * on the viewer's right (a phone's bubble may cover hair up to it), and
     * `shoulder` is the y the name tag drops to.
     */
    beside: { left: PxPoint; right: PxPoint; faceRight: number; shoulder: number };
};

/** Where steam rises from a cup: the rim's centre and width, in plate px. */
export type CupRim = { rim: PxPoint; width: number };

/** One hour's plate with the lamp on and, when the lamp can switch that hour, off. */
export type LampPlates = { on: string; off?: string };

/** A still part painted onto the plate's coordinates (full-plate canvas, trimmed box). */
export type PlatePart = { src: string; box: PxRect };

/**
 * The desk lamp: its pull chain sways, and pulling it switches the plates
 * between lit and unlit. The pull target is the room's `lamp` hotspot.
 */
export type LampSpec = {
    chain: PlatePart;
    /** Plate px of the chain's top, where it hangs from and swings around. */
    pivot: PxPoint;
};

/** An across-the-table room template: plates per hour and lamp state, the partner's seat and the table's parts. */
export type TableRoomTemplate = {
    id: string;
    /** Natural size of every plate; all plate-space coordinates use it. */
    base: { w: number; h: number };
    /**
     * Plate per hour: lamp on, optionally off (no off plate = the lamp cannot
     * switch that hour), and optionally a `rain` pair with rain painted on the
     * glass. Runtime rain animates over whichever plate shows.
     */
    plates: Partial<Record<RoomMood, LampPlates & { rain?: LampPlates }>>;
    moodFallback: Record<RoomMood, RoomMood>;
    window: WindowSpec;
    seat: PartnerSeat;
    /** The viewer's own hands and mug in front, per the viewer's avatar (sleeves differ). */
    foreground: Partial<Record<AvatarId, PlatePart>>;
    /** What the partner leaves on the table when they get up: their mug stays, their jacket hangs on the chair. */
    traces: { mug?: PlatePart; jacket?: Partial<Record<AvatarId, PlatePart>> };
    /** Cups that steam: the partner's on the table, the viewer's in their hands. */
    steam?: { partner?: CupRim; viewer?: CupRim };
    lamp?: LampSpec;
    /**
     * How a screen that is not 3:2 crops the plate. Narrow screens keep plate
     * column `x` centred (the partner's face); wide screens keep rows from
     * `top` down (just above the partner's head), so as much of the table and
     * the viewer's hands as fits stays in view below.
     */
    crop: { x: number; top: number };
    hotspots: HotspotSpec[];
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
