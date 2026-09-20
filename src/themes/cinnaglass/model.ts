// model.ts — shared runtime-free types for the cinnaglass theme.

// The four conditions the shell knows how to show. A closed union rather than
// `string`, so a typo or a fifth condition is a compile error at every
// consumer (the clock's icon picker, the room scene's rain switch) instead of
// a silent fall-through to the cloud icon.
export type WeatherKind = 'sun' | 'cloud' | 'rain' | 'snow';

// Current weather as the shell shows it; `kind` drives both the header icon
// and, narrowed by the room scene, whether it rains inside the painting.
export type Weather = { kind: WeatherKind; label: string; temp: number; place: string };

// The couple's locally stored profile: the offline fallback for what the
// Supabase world row and the two profiles rows say. (The account email lives
// on the auth user and is not editable here; there is no app lock.)
export type Profile = {
    world: string;
    her: string;
    me: string;
    anniv: string;
    status: string;
};

// One dated entry on the shared calendar.
export type CalEvent = { id: string; date: string; title: string };

// One alarm on the clock surface; on=false keeps it listed but silent.
export type Alarm = { id: string; time: string; label: string; on: boolean };

// Which shell widgets are switched on, keyed by widget id.
export type Widgets = Record<string, boolean>;
