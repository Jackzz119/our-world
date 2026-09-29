// partner-state.ts — what the partner across the table is doing: the pose of their real state,
// overridden for a moment by short reactions (a glance up, a poke, a held pat) or played through
// keyframes (a sip: reach, lift, drink, put the mug back; laying the book down to write; falling
// asleep and waking up). The rules live in rig-director.ts (from the marionette skill); this file is
// the study's spec for them: which reactions, how strong, in which states, and how often they happen
// by themselves.

import { createDirector, type Sequence, type Transition } from '@/themes/cinnaglass/room/rig-director';
import type { PartnerState } from '@/themes/cinnaglass/room/room-types';

/** Short reactions that override the state pose, then hand back to it. */
export type PartnerReaction = 'glance' | 'sip' | 'poked' | 'patted';

/** Idle rhythm and reaction lengths, in seconds (ai/features/study-room/study-room.md §四). */
export const PARTNER_TIMING = {
    glanceEvery: [20, 60] as const,
    glanceFor: [2.5, 4] as const,
    sipEvery: [90, 180] as const,
    pokeFor: 1.4,
    patLinger: 0.8,
    /** A coffee handed over while something stronger plays is drunk when that ends, if within this. */
    sipQueue: 6
};

// Touches only land while the partner is really at the table and awake.
const PRESENT: readonly PartnerState[] = ['reading', 'writing'];

/** The keyframe chains a rig ships (its manifest's `sequences`): the sip, dozing off, laying the book down to write. */
export type PartnerSequences = { sip: Sequence<string>; doze?: Sequence<string>; write?: Sequence<string> };

export type PartnerDirector = {
    /** Switch the real state; a running reaction ends (keyframes walk back first) and the idle clock restarts. */
    setState: (state: PartnerState, nowMs: number) => void;
    /** A one-shot reaction; false when the current state does not allow it or something stronger plays. */
    react: (kind: 'glance' | 'sip' | 'poked', nowMs: number) => boolean;
    /** A pat lasts while the stroke is held, plus a short linger after release. */
    pat: (holding: boolean, nowMs: number) => boolean;
    /** The pose to show at `nowMs` (a base pose or a keyframe), or null for the empty chair. */
    update: (nowMs: number) => string | null;
    /** How to animate to the pose `update` returned last (a keyframe step), or null for the default. */
    transition: () => Transition | null;
    state: () => PartnerState;
};

/**
 * A director starting in `initial`. Every random draw comes from `random` and every time from the
 * `nowMs` the caller passes in. `has` says which poses the rig ships: the writing variants of the
 * touches are used when it has them. Without the doze or write chains those changes are one morph.
 */
export function createPartnerDirector(
    initial: PartnerState,
    random: () => number,
    nowMs: number,
    sequences: PartnerSequences,
    has: (pose: string) => boolean = () => false
): PartnerDirector {
    // while writing, the laugh and the lean into the hand happen over the notebook, pen in hand
    const whileWriting = (pose: string) => (has(pose) ? { writing: pose } : undefined);
    const d = createDirector<PartnerState, PartnerReaction, string>(
        {
            statePose: { reading: 'reading', writing: 'writing', asleep: 'asleep', away: null, offline: null },
            enter: {
                ...(sequences.doze ? { asleep: sequences.doze } : {}),
                ...(sequences.write ? { writing: sequences.write } : {})
            },
            reactions: {
                // glancing up belongs to reading; writing keeps the eyes on the page
                glance: { pose: 'glance', priority: 1, seconds: PARTNER_TIMING.glanceFor, in: ['reading'] },
                sip: { sequence: sequences.sip, priority: 2, in: PRESENT },
                poked: {
                    pose: 'poked',
                    poseIn: whileWriting('poked-writing'),
                    priority: 3,
                    seconds: PARTNER_TIMING.pokeFor,
                    in: PRESENT
                },
                patted: { pose: 'patted', poseIn: whileWriting('patted-writing'), priority: 4, seconds: 0, in: PRESENT }
            },
            idle: [
                { reaction: 'sip', every: PARTNER_TIMING.sipEvery, in: ['reading'] },
                { reaction: 'glance', every: PARTNER_TIMING.glanceEvery, in: ['reading'] }
            ]
        },
        initial,
        random,
        nowMs
    );
    let sipBy = 0;
    return {
        setState: (state, now) => {
            sipBy = 0;
            d.setState(state, now);
        },
        react(kind, now) {
            const landed = d.react(kind, now);
            if (!landed && kind === 'sip') sipBy = now + PARTNER_TIMING.sipQueue * 1000;
            return landed;
        },
        pat: (holding, now) => d.hold('patted', holding, now, PARTNER_TIMING.patLinger),
        update(now) {
            if (sipBy && (now > sipBy || (!d.busy() && d.react('sip', now)))) sipBy = 0;
            return d.update(now);
        },
        transition: d.transition,
        state: d.state
    };
}
