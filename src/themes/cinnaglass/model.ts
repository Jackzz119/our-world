// model.ts — shared runtime-free types for the cinnaglass theme.
import type { Mood } from './tweaks';

// Current weather as the shell shows it; `kind` drives both the header icon
// and, narrowed by the room scene, whether it rains inside the painting.
export type Weather = { kind: string; label: string; temp: number; place: string };

// The couple's locally stored profile, used until the Supabase world record
// takes over.
export type Profile = {
    world: string;
    her: string;
    me: string;
    anniv: string;
    email: string;
    lock: boolean;
    status: string;
};

// A sidebar entry for an in-world voice room. Not the scene: the compositor's
// art contract is RoomTemplate in room/room-types.ts.
export type Room = { id: string; name: string; icon: string; mood: Mood; note: string };

// One dated entry on the shared calendar.
export type CalEvent = { id: string; date: string; title: string };

// One alarm on the clock surface; on=false keeps it listed but silent.
export type Alarm = { id: string; time: string; label: string; on: boolean };

// Which shell widgets are switched on, keyed by widget id.
export type Widgets = Record<string, boolean>;
