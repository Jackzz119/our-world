// synth.ts — the built-in generative soundscapes: a four-voice Web Audio pad (triangle voices, slow
// tremolo, soft low-pass) that plays a chord instead of a recorded file. Moved out of the old
// use-music-playback hook so the music engine can play soundscapes and uploaded songs in one queue.
// Feature doc: ai/features/music/music.md.

type Pad = { ctx: AudioContext; master: GainNode; voices: OscillatorNode[] };

// The browser's AudioContext constructor (webkit-prefixed on old Safari), or null.
const audioContextCtor = (): typeof AudioContext | null =>
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null;

// Frequency of voice k of a chord: the root voice an octave down, the others in place.
const voiceHz = (root: number, semitones: number, k: number) =>
    (root * Math.pow(2, semitones / 12)) / (k === 0 ? 2 : 1);

export class SoundscapeSynth {
    private pad: Pad | null = null;
    private anchor = { time: 0, positionMs: 0 };
    private level = 0;
    playing = false;
    /** told when the browser suspends the context on its own (an interruption) */
    onInterrupted: (() => void) | null = null;

    // Build the pad on first use; must run inside a user gesture the first time on iOS.
    private ensure(root: number, chord: number[]): Pad {
        if (this.pad && this.pad.ctx.state !== 'closed') return this.pad;
        const Ctor = audioContextCtor();
        if (!Ctor) throw new Error('这台设备不能播放音景。');
        const ctx = new Ctor();
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
        const voices = chord.map((semi, k) => {
            const voice = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.25;
            voice.type = 'triangle';
            voice.frequency.value = voiceHz(root, semi, k);
            voice.connect(gain);
            gain.connect(tremolo);
            voice.start();
            return voice;
        });
        ctx.onstatechange = () => {
            if (ctx.state !== 'running' && this.playing) {
                this.playing = false;
                this.onInterrupted?.();
            }
        };
        this.pad = { ctx, master, voices };
        return this.pad;
    }

    // Start sounding a chord from a position. Resolves once the browser actually produces audio.
    async start(root: number, chord: number[], positionMs: number): Promise<void> {
        const pad = this.ensure(root, chord);
        this.retune(root, chord);
        const resumed = pad.ctx.resume();
        this.anchor = { time: pad.ctx.currentTime, positionMs };
        await resumed;
        if (pad.ctx.state !== 'running') throw new Error('声音被浏览器挡住了，请再点一次播放。');
        this.anchor = { time: pad.ctx.currentTime, positionMs };
        this.playing = true;
        this.applyLevel();
    }

    // Glide the voices to another chord (the next soundscape) without a click.
    retune(root: number, chord: number[]): void {
        const pad = this.pad;
        if (!pad) return;
        chord.forEach((semi, k) => {
            pad.voices[k]?.frequency.setTargetAtTime(voiceHz(root, semi, k), pad.ctx.currentTime, 0.12);
        });
    }

    // Fall silent and remember where we were.
    pause(): void {
        if (!this.pad) return;
        this.anchor = { time: this.pad.ctx.currentTime, positionMs: this.positionMs() };
        this.playing = false;
        this.applyLevel();
    }

    // Jump within the soundscape's timeline (there is no recording, only a clock).
    seek(positionMs: number): void {
        this.anchor = { time: this.pad?.ctx.currentTime ?? 0, positionMs };
    }

    // Where the soundscape's clock stands, in ms.
    positionMs(): number {
        if (!this.pad || !this.playing) return this.anchor.positionMs;
        return this.anchor.positionMs + (this.pad.ctx.currentTime - this.anchor.time) * 1000;
    }

    // Output level 0..1 (0 when paused or muted); modulation stays upstream so silence is real silence.
    setLevel(level: number): void {
        this.level = level;
        this.applyLevel();
    }

    private applyLevel(): void {
        const pad = this.pad;
        if (!pad) return;
        pad.master.gain.cancelScheduledValues(pad.ctx.currentTime);
        pad.master.gain.setTargetAtTime(this.playing ? this.level * 0.2 : 0, pad.ctx.currentTime, 0.025);
    }

    // The context's own output rate (for the signal-path panel).
    sampleRate(): number | null {
        return this.pad?.ctx.sampleRate ?? null;
    }

    // Release the audio hardware.
    close(): void {
        const pad = this.pad;
        this.pad = null;
        this.playing = false;
        if (pad) {
            pad.ctx.onstatechange = null;
            void pad.ctx.close().catch(() => {});
        }
    }
}
