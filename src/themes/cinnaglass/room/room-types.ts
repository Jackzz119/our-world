// room-types.ts — data contract for across-the-table rooms. A room is a
// template: whole plates per hour, lamp state and weather, plus the slots
// runtime layers attach to (window, the partner's seat, cups, hotspots).
// Avatars are decoupled from rooms (see ai/features/study-room/study-room.md).

/** The room's lighting hour. Plates and actor tints are keyed by it. */
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

export type WindowSpec = {
    /** Glass panes the rain layer draws into (outdoor rain + drops on glass). */
    panes: PxRect[];
    /**
     * Bounding area used by the light layer to cast the "window glow" into
     * the room. Usually slightly larger than the union of panes.
     */
    glow: PxRect;
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
    /** Per-pose idle motion weights (scripts/build-idle-weights.py); a pose without one stays still. */
    idle?: Partial<Record<PoseId, string>>;
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
