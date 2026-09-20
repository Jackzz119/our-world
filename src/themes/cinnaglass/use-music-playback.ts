// A local generative soundscape transport shared by both player views.
import { useEffect, useRef, useState } from 'react';
import { loadJson, saveJson } from '@/lib/local-store';
import { TRACKS } from '@/themes/cinnaglass/music-tracks';

type PlayMode = 'list' | 'repeat' | 'shuffle';
type AudioPad = { ctx: AudioContext; master: GainNode; voices: OscillatorNode[] };
type PlaybackState = {
    i: number;
    pos: number;
    muted: boolean;
    volume: number;
    mode: PlayMode;
    playing: boolean;
    starting: boolean;
    error: string | null;
};

// Clamp untrusted storage values before they reach a track lookup or audio parameter.
const finite = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

// Preserve the old storage key, without restoring autoplay.
const initialState = (): PlaybackState => {
    const raw = loadJson<Record<string, unknown> | null>('ow-music-v1', null) || {};
    const i = Math.floor(finite(raw.i, 0, 0, TRACKS.length - 1));
    return {
        i,
        pos: finite(raw.pos, 0, 0, TRACKS[i].dur),
        muted: raw.muted === true,
        volume: finite(raw.volume, 70, 0, 100),
        mode: raw.mode === 'repeat' || raw.mode === 'shuffle' ? raw.mode : 'list',
        playing: false,
        starting: false,
        error: null
    };
};

// Own one graph and one audio clock; no partner synchronization is implied.
export function useMusicPlayback() {
    const [state, setState] = useState(initialState);
    const audio = useRef<AudioPad | null>(null);
    const anchor = useRef({ time: 0, pos: state.pos });
    const request = useRef(0);
    const starting = useRef(false);
    const track = TRACKS[state.i];
    const { i, muted, volume, mode } = state;
    const storedPosition = Math.floor(state.pos);

    useEffect(() => {
        saveJson('ow-music-v1', { i, pos: storedPosition, muted, volume, mode });
    }, [i, storedPosition, muted, volume, mode]);

    useEffect(() => {
        const pad = audio.current;
        if (!pad) return;
        track.chord.forEach((semi, k) => {
            pad.voices[k].frequency.setTargetAtTime(
                (track.root * Math.pow(2, semi / 12)) / (k === 0 ? 2 : 1),
                pad.ctx.currentTime,
                0.12
            );
        });
    }, [track]);

    useEffect(() => {
        const pad = audio.current;
        if (!pad) return;
        pad.master.gain.cancelScheduledValues(pad.ctx.currentTime);
        // Modulation stays upstream of the final gain so pause and mute are truly silent.
        pad.master.gain.setTargetAtTime(
            state.playing && !state.muted ? (state.volume / 100) * 0.2 : 0,
            pad.ctx.currentTime,
            0.025
        );
    }, [state.playing, state.muted, state.volume]);

    useEffect(() => {
        if (!state.playing) return;
        const id = window.setInterval(() => {
            const pad = audio.current;
            if (!pad) return;
            const pos = anchor.current.pos + pad.ctx.currentTime - anchor.current.time;
            if (pos < track.dur) {
                setState((s) => ({ ...s, pos }));
                return;
            }
            anchor.current = { time: pad.ctx.currentTime, pos: 0 };
            setState((s) => ({
                ...s,
                pos: 0,
                i:
                    s.mode === 'repeat'
                        ? s.i
                        : (s.i + (s.mode === 'shuffle' ? 1 + Math.floor(Math.random() * (TRACKS.length - 1)) : 1)) %
                          TRACKS.length
            }));
        }, 250);
        return () => window.clearInterval(id);
    }, [state.playing, track]);

    useEffect(
        () => () => {
            request.current += 1;
            const pad = audio.current;
            audio.current = null;
            if (pad) {
                pad.ctx.onstatechange = null;
                void pad.ctx.close().catch(() => {});
            }
        },
        []
    );

    // Build the existing four-voice pad with tremolo before the final volume control.
    const ensure = () => {
        if (audio.current && audio.current.ctx.state !== 'closed') return audio.current;
        const AC =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) throw new Error('audio-unavailable');
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = 0;
        const tremolo = ctx.createGain();
        tremolo.gain.value = 0.85;
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 900;
        lowpass.Q.value = 0.6;
        tremolo.connect(lowpass);
        lowpass.connect(master);
        master.connect(ctx.destination);
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.18;
        lfoGain.gain.value = 0.15;
        lfo.connect(lfoGain);
        lfoGain.connect(tremolo.gain);
        lfo.start();
        const voices = track.chord.map((semi, k) => {
            const voice = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.25;
            voice.type = 'triangle';
            voice.frequency.value = (track.root * Math.pow(2, semi / 12)) / (k === 0 ? 2 : 1);
            voice.connect(gain);
            gain.connect(tremolo);
            voice.start();
            return voice;
        });
        audio.current = { ctx, master, voices };
        ctx.onstatechange = () => {
            if (ctx.state !== 'running' && !starting.current) {
                setState((s) =>
                    s.playing ? { ...s, playing: false, error: '声音已被浏览器暂停，请点击播放继续。' } : s
                );
            }
        };
        return audio.current;
    };

    // Show playing only after the browser has actually resumed audio output.
    const toggle = async () => {
        if (starting.current) return;
        if (state.playing) {
            const pad = audio.current;
            const pos = pad ? anchor.current.pos + pad.ctx.currentTime - anchor.current.time : state.pos;
            setState((s) => ({ ...s, playing: false, pos: Math.min(track.dur, pos) }));
            return;
        }
        const token = ++request.current;
        starting.current = true;
        setState((s) => ({ ...s, starting: true, error: null }));
        try {
            const pad = ensure();
            await pad.ctx.resume();
            if (token !== request.current) return;
            if (pad.ctx.state !== 'running') throw new Error('audio-blocked');
            anchor.current = { time: pad.ctx.currentTime, pos: state.pos >= track.dur ? 0 : state.pos };
            setState((s) => ({ ...s, playing: true, starting: false, pos: anchor.current.pos }));
        } catch {
            if (token === request.current)
                setState((s) => ({
                    ...s,
                    playing: false,
                    starting: false,
                    error: '暂时无法播放声音，请再次点击播放。'
                }));
        } finally {
            starting.current = false;
        }
    };

    // Seeking moves within a generated chord segment, not a prerecorded music file.
    const seek = (pos: number) => {
        const safePos = finite(pos, 0, 0, track.dur);
        anchor.current = { time: audio.current?.ctx.currentTime || 0, pos: safePos };
        setState((s) => ({ ...s, pos: safePos }));
    };

    // Keep explicit previous/next available in every playback mode.
    const skip = (direction: number) => {
        anchor.current = { time: audio.current?.ctx.currentTime || 0, pos: 0 };
        setState((s) => ({
            ...s,
            pos: 0,
            i:
                direction < 0 && s.pos > 3
                    ? s.i
                    : (s.i +
                          (direction > 0 && s.mode === 'shuffle'
                              ? 1 + Math.floor(Math.random() * (TRACKS.length - 1))
                              : direction) +
                          TRACKS.length) %
                      TRACKS.length
        }));
    };

    return {
        ...state,
        track,
        toggle,
        seek,
        next: () => skip(1),
        prev: () => skip(-1),
        setMuted: () => setState((s) => ({ ...s, muted: !s.muted })),
        setVolume: (volume: number) => setState((s) => ({ ...s, volume: finite(volume, 70, 0, 100) })),
        setMode: (mode: PlayMode) => setState((s) => ({ ...s, mode }))
    };
}
export type MusicPlayback = ReturnType<typeof useMusicPlayback>;

// Format segment time consistently in both views.
export const musicTime = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};
