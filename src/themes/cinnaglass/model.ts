// model.ts — shared runtime-free types for the cinnaglass theme.
import type { Mood } from './tweaks';

export type Weather = { kind: string; label: string; temp: number; place: string };

export type Profile = {
    world: string;
    her: string;
    me: string;
    anniv: string;
    email: string;
    lock: boolean;
    status: string;
};

export type Room = { id: string; name: string; icon: string; mood: Mood; note: string };

export type CalEvent = { id: string; date: string; title: string };

export type Alarm = { id: string; time: string; label: string; on: boolean };

export type Widgets = Record<string, boolean>;

export type WidgetPos = { x: number; y: number };
