// rig-director.ts — decides WHICH pose shows: the pose of the character's real state, overridden for
// a moment by short reactions (a glance up, a sip, a poke, a held pat). Pure logic, no clock or
// randomness of its own, so a test can replay a sequence exactly. The view only renders what
// `update` returns.
//
// Rules it enforces:
//   - a reaction never interrupts a stronger one (priority), a repeat extends the running one
//   - reactions only land in the states that allow them (nobody pokes an empty chair)
//   - idle reactions are timed from the last time the character settled back, not wall-clock

export type Reaction<S extends string, P extends string> = {
    pose: P;
    priority: number;
    /** Duration in seconds, or a [min, max] range drawn each time. Held reactions ignore it while held. */
    seconds: number | readonly [number, number];
    /** States in which it can happen. */
    in: readonly S[];
};

export type DirectorSpec<S extends string, R extends string, P extends string> = {
    /** The pose each state rests in; null leaves the character out of the scene. */
    statePose: Record<S, P | null>;
    reactions: Record<R, Reaction<S, P>>;
    /** Reactions that happen by themselves every [min, max] seconds while in one of `in`. */
    idle?: readonly { reaction: R; every: readonly [number, number]; in: readonly S[] }[];
};

export type Director<S extends string, R extends string, P extends string> = {
    /** Switch the real state; a running reaction ends and the idle clocks restart. */
    setState: (state: S, nowMs: number) => void;
    /** A one-shot reaction; false when the state does not allow it or a stronger one is playing. */
    react: (kind: R, nowMs: number) => boolean;
    /** A reaction that lasts while held (a pat), then lingers `lingerS` after release. */
    hold: (kind: R, holding: boolean, nowMs: number, lingerS?: number) => boolean;
    /** The pose to show at `nowMs`. */
    update: (nowMs: number) => P | null;
    state: () => S;
};

export function createDirector<S extends string, R extends string, P extends string>(
    spec: DirectorSpec<S, R, P>,
    initial: S,
    random: () => number,
    nowMs: number
): Director<S, R, P> {
    const draw = (v: number | readonly [number, number]) =>
        typeof v === 'number' ? v : v[0] + random() * (v[1] - v[0]);
    let state = initial;
    let active: { kind: R; until: number } | null = null;
    let held = false;
    const idle = (spec.idle ?? []).map((i) => ({ ...i, next: 0 }));
    const schedule = (now: number) => {
        for (const i of idle) i.next = now + draw(i.every) * 1000;
    };
    schedule(nowMs);

    const start = (kind: R, now: number, ms: number) => {
        const r = spec.reactions[kind];
        if (!r.in.includes(state)) return false;
        if (active && active.until > now && spec.reactions[active.kind].priority > r.priority) return false;
        if (active && active.kind === kind) active.until = Math.max(active.until, now + ms);
        else active = { kind, until: now + ms };
        return true;
    };

    return {
        setState(next, now) {
            if (next === state) return;
            state = next;
            active = null;
            held = false;
            schedule(now);
        },
        react(kind, now) {
            return start(kind, now, draw(spec.reactions[kind].seconds) * 1000);
        },
        hold(kind, holding, now, lingerS = 0.8) {
            if (holding) {
                if (!start(kind, now, Number.POSITIVE_INFINITY)) return false;
                held = true;
                return true;
            }
            held = false;
            if (active?.kind === kind) active.until = now + lingerS * 1000;
            return true;
        },
        update(now) {
            if (active && !held && now >= active.until) {
                active = null;
                schedule(now);
            }
            if (!active) {
                // the first idle reaction that is due and allowed; the others wait for their turn
                const due = idle.find((i) => i.in.includes(state) && now >= i.next);
                if (due) {
                    start(due.reaction, now, draw(spec.reactions[due.reaction].seconds) * 1000);
                    due.next = now + draw(due.every) * 1000;
                }
            }
            return active ? spec.reactions[active.kind].pose : spec.statePose[state];
        },
        state: () => state
    };
}
