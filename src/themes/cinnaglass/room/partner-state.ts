// partner-state.ts — decides which pose the partner across the table shows:
// the pose of their real state, overridden for a moment by short reactions
// (a glance up, a sip, a poke, a pat). Pure logic with no clock or randomness
// of its own, so a test can replay a sequence exactly. The pose layer only
// renders what this returns.

import type { PartnerState, PoseId } from '@/themes/cinnaglass/room/room-types';

/** Short reactions that override the state pose, then hand back to it. */
export type PartnerReaction = 'glance' | 'sip' | 'poked' | 'patted';

/** The pose each state rests in; away and offline leave the chair empty. */
export const STATE_POSE: Record<PartnerState, PoseId | null> = {
    reading: 'reading',
    writing: 'writing',
    asleep: 'asleep',
    away: null,
    offline: null
};

const REACTION_POSE: Record<PartnerReaction, PoseId> = {
    glance: 'glance',
    sip: 'sip',
    poked: 'poked',
    patted: 'patted'
};

// A reaction never interrupts a higher one: touch beats idle, a held pat beats a poke.
const PRIORITY: Record<PartnerReaction, number> = { glance: 1, sip: 2, poked: 3, patted: 4 };

// Touches only land while the partner is really at the table and awake.
const PRESENT: readonly PartnerState[] = ['reading', 'writing'];

/** Idle rhythm and reaction lengths, in seconds (ai/features/study-room/study-room.md §四). */
export const PARTNER_TIMING = {
    glanceEvery: [20, 60] as const,
    glanceFor: [2.5, 4] as const,
    sipEvery: [90, 180] as const,
    sipFor: 2.4,
    pokeFor: 1.4,
    patLinger: 0.8
};

export type PartnerDirector = {
    /** Switch the real state; any running reaction ends and the idle clock restarts. */
    setState: (state: PartnerState, nowMs: number) => void;
    /** A one-shot reaction; false when the current state does not allow it. */
    react: (kind: 'glance' | 'sip' | 'poked', nowMs: number) => boolean;
    /** A pat lasts while the stroke is held, plus a short linger after release. */
    pat: (holding: boolean, nowMs: number) => boolean;
    /** The pose to show at `nowMs`, or null for the empty chair. */
    update: (nowMs: number) => PoseId | null;
    state: () => PartnerState;
};

/**
 * A director starting in `initial`. Every random draw comes from `random`
 * and every time from the `nowMs` the caller passes in.
 */
export function createPartnerDirector(initial: PartnerState, random: () => number, nowMs: number): PartnerDirector {
    const between = (range: readonly [number, number]) => range[0] + random() * (range[1] - range[0]);
    let state = initial;
    let active: { kind: PartnerReaction; until: number } | null = null;
    let patHeld = false;
    let nextGlanceAt = 0;
    let nextSipAt = 0;

    // Idle reactions are timed from the last time the partner settled back.
    const scheduleIdle = (now: number) => {
        nextGlanceAt = now + between(PARTNER_TIMING.glanceEvery) * 1000;
        nextSipAt = now + between(PARTNER_TIMING.sipEvery) * 1000;
    };
    scheduleIdle(nowMs);

    // Start or extend a reaction unless a stronger one is still playing.
    const start = (kind: PartnerReaction, now: number, ms: number): boolean => {
        if (active && active.until > now && PRIORITY[active.kind] > PRIORITY[kind]) return false;
        if (active && active.kind === kind) active.until = Math.max(active.until, now + ms);
        else active = { kind, until: now + ms };
        return true;
    };

    return {
        setState(next, now) {
            if (next === state) return;
            state = next;
            active = null;
            patHeld = false;
            scheduleIdle(now);
        },
        react(kind, now) {
            if (!PRESENT.includes(state)) return false;
            // glancing up belongs to reading; writing keeps the eyes on the page
            if (kind === 'glance' && state !== 'reading') return false;
            const ms =
                kind === 'glance'
                    ? between(PARTNER_TIMING.glanceFor) * 1000
                    : (kind === 'sip' ? PARTNER_TIMING.sipFor : PARTNER_TIMING.pokeFor) * 1000;
            return start(kind, now, ms);
        },
        pat(holding, now) {
            if (!PRESENT.includes(state)) {
                patHeld = false;
                return false;
            }
            if (holding) {
                if (!start('patted', now, Number.POSITIVE_INFINITY)) return false;
                patHeld = true;
                return true;
            }
            patHeld = false;
            if (active?.kind === 'patted') active.until = now + PARTNER_TIMING.patLinger * 1000;
            return true;
        },
        update(now) {
            if (active && !patHeld && now >= active.until) {
                active = null;
                scheduleIdle(now);
            }
            if (!active && state === 'reading') {
                if (now >= nextSipAt) {
                    start('sip', now, PARTNER_TIMING.sipFor * 1000);
                    nextSipAt = now + between(PARTNER_TIMING.sipEvery) * 1000;
                } else if (now >= nextGlanceAt) {
                    start('glance', now, between(PARTNER_TIMING.glanceFor) * 1000);
                    nextGlanceAt = now + between(PARTNER_TIMING.glanceEvery) * 1000;
                }
            }
            return active ? REACTION_POSE[active.kind] : STATE_POSE[state];
        },
        state: () => state
    };
}
