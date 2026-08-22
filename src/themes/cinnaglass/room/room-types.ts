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

/** A clickable furniture region that opens a feature (ai/UX.md §2/§5). */
export type HotspotSpec = {
    /** Feature key the shell maps to a surface (timeline/photos/clock/…). */
    id: string;
    /** Interactive region in base-image pixels. */
    rect: PxRect;
    /**
     * Hand-traced silhouette polygon (base-image px) hugging the furniture.
     * Only used as the fallback edge when no baked glow art is available —
     * programmatic strokes read mechanical against watercolor.
     */
    outline?: PxPoint[];
    /**
     * Placement box (base-image px) for the baked hover glow texture at
     * `/rooms/<roomId>/glow-<hotspotId>.png`. The art is painted on the room
     * canvas and cropped to this exact box, so blitting it back here lands
     * pixel-perfect. Omitted → the polygon fallback is used.
     */
    glowBox?: PxRect;
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
