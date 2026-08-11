// music.tsx — 一起听歌: floating music widget (addon). One taps play, everyone in
// the current room "hears" it. Real sound via a soft generative WebAudio pad
// (no audio files needed). Playback state persists to ow-music-v1.
import { useEffect, useRef, useState } from 'react';
import { IHeadset, IMusic, IMute, IPause, IPlay, ISkipB, ISkipF, IVolume } from './icons';

type Track = { title: string; artist: string; root: number; chord: number[]; dur: number; cover: string };

export const TRACKS: Track[] = [
    { title: '云朵上的下午', artist: '小满 & 知夏', root: 261.63, chord: [0, 4, 7, 11], dur: 214, cover: 'linear-gradient(145deg,#FCE3B0,#F5B774)' },
    { title: '雨天的窗边', artist: 'Lo-fi 时光', root: 220.0, chord: [0, 3, 7, 10], dur: 198, cover: 'linear-gradient(145deg,#BFD0F2,#8C9DDB)' },
    { title: '暖灯电台', artist: '夜晚频率', root: 196.0, chord: [0, 4, 7, 11], dur: 236, cover: 'linear-gradient(145deg,#E7C4F0,#B68FD9)' },
    { title: '一起散步', artist: '周末', root: 293.66, chord: [0, 5, 7, 12], dur: 188, cover: 'linear-gradient(145deg,#BFE8D2,#86C9A6)' }
];
const muLoad = (): { i?: number; pos?: number; muted?: boolean } => {
    try {
        return JSON.parse(localStorage.getItem('ow-music-v1') || 'null') || {};
    } catch {
        return {};
    }
};
const fmt = (s: number) => {
    s = Math.max(0, Math.floor(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

type AudioPad = {
    ctx: AudioContext;
    master: GainNode;
    lp: BiquadFilterNode;
    voices: { o: OscillatorNode; g: GainNode }[];
    started: boolean;
};

const MusicStyles = () => (
    <style>{`
  .mp{width:252px;border-radius:var(--r-md);padding:13px 14px;}
  .mp-top{display:flex;align-items:center;gap:12px;}
  .mp-cover{width:54px;height:54px;border-radius:50%;flex:0 0 auto;position:relative;display:grid;place-items:center;
    color:rgba(255,255,255,.92);box-shadow:0 5px 14px -5px rgba(20,29,51,.5), inset 0 1px 0 rgba(255,255,255,.4);}
  .mp-cover::before{content:"";position:absolute;inset:0;border-radius:50%;
    background:repeating-radial-gradient(circle at 50% 50%,rgba(0,0,0,.06) 0 2px,transparent 2px 4px);opacity:.5;}
  .mp-cover .hole{position:absolute;width:13px;height:13px;border-radius:50%;background:var(--glass-bg);
    box-shadow:inset 0 0 0 2px rgba(255,255,255,.55);}
  .mp-cover.spin{animation:mpSpin 7s linear infinite;}
  @keyframes mpSpin{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion: reduce){.mp-cover.spin{animation:none}}
  .mp-info{flex:1;min-width:0;}
  .mp-title{font-size:13.5px;font-weight:700;color:var(--glass-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mp-artist{font-size:11px;color:var(--glass-sub);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mp-share{display:flex;align-items:center;gap:5px;margin-top:6px;font-size:10.5px;font-weight:600;color:var(--accent-deep);}
  .mp-share .ic{display:inline-flex;}
  .mp-eq{display:inline-flex;align-items:flex-end;gap:2px;height:11px;margin-left:1px;}
  .mp-eq i{width:2.5px;background:currentColor;border-radius:2px;height:40%;}
  .mp-eq.on i{animation:mpEq .9s ease-in-out infinite;}
  .mp-eq i:nth-child(2){animation-delay:.18s}.mp-eq i:nth-child(3){animation-delay:.36s}.mp-eq i:nth-child(4){animation-delay:.1s}
  @keyframes mpEq{0%,100%{height:30%}50%{height:100%}}
  @media (prefers-reduced-motion: reduce){.mp-eq.on i{animation:none;height:60%}}

  .mp-prog{margin:11px 0 9px;cursor:pointer;}
  .mp-bar{height:5px;border-radius:99px;background:var(--glass-bg-2);position:relative;overflow:hidden;}
  .mp-fill{position:absolute;left:0;top:0;bottom:0;border-radius:99px;
    background:linear-gradient(90deg,var(--accent),var(--accent-deep));}
  .mp-times{display:flex;justify-content:space-between;font-size:9.5px;color:var(--glass-sub);margin-top:5px;font-family:"Baloo 2",sans-serif;}
  .mp-ctrl{display:flex;align-items:center;justify-content:center;gap:14px;}
  .mp-btn{appearance:none;border:0;background:transparent;cursor:pointer;display:grid;place-items:center;
    color:var(--glass-text);padding:0;transition:transform .16s,color .16s;}
  .mp-btn:hover{color:var(--accent-deep);transform:scale(1.12);}
  .mp-btn:active{transform:scale(.92);}
  .mp-play{width:42px;height:42px;border-radius:50%;color:#0d2336;
    background:var(--accent-grad);box-shadow:0 5px 13px -4px rgba(47,154,211,.6);}
  .mp-play:hover{color:#0d2336;filter:brightness(1.05);}
  .mp-vol{position:absolute;right:14px;color:var(--glass-sub);}
  .mp-ctrl-wrap{position:relative;display:flex;align-items:center;justify-content:center;}
  `}</style>
);

export function MusicPlayer({ spaceName }: { spaceName?: string }) {
    const init = muLoad();
    const [i, setI] = useState(typeof init.i === 'number' ? init.i % TRACKS.length : 0);
    const [playing, setPlaying] = useState(false);
    const [pos, setPos] = useState(typeof init.pos === 'number' ? init.pos : 0);
    const [muted, setMuted] = useState(!!init.muted);
    const audio = useRef<AudioPad | null>(null);
    const t = TRACKS[i];

    // persist (not playing — never autoplay sound without a gesture)
    useEffect(() => {
        try {
            localStorage.setItem('ow-music-v1', JSON.stringify({ i, pos, muted }));
        } catch {
            /* ignore */
        }
    }, [i, pos, muted]);

    // progress ticker
    useEffect(() => {
        if (!playing) return;
        const id = setInterval(() => setPos((p) => Math.min(p + 1, t.dur)), 1000);
        return () => clearInterval(id);
    }, [playing, i, t.dur]);
    // auto-advance to next track at the end
    useEffect(() => {
        if (playing && pos >= t.dur) next();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pos, playing]);

    // ── WebAudio soft pad ──
    const ensure = (): AudioPad | null => {
        if (audio.current) return audio.current;
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = 0;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        lp.Q.value = 0.6;
        master.connect(lp);
        lp.connect(ctx.destination);
        // tremolo
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.18;
        lfoGain.gain.value = 0.18;
        lfo.connect(lfoGain);
        lfoGain.connect(master.gain);
        lfo.start();
        const voices = [0, 1, 2, 3].map(() => {
            const o = ctx.createOscillator();
            o.type = 'triangle';
            const g = ctx.createGain();
            g.gain.value = 0.25;
            o.connect(g);
            g.connect(master);
            o.start();
            return { o, g };
        });
        audio.current = { ctx, master, lp, voices, started: true };
        return audio.current;
    };
    const applyChord = (a: AudioPad | null) => {
        if (!a) return;
        t.chord.forEach((semi, k) => {
            const v = a.voices[k];
            if (v) v.o.frequency.setValueAtTime((t.root * Math.pow(2, semi / 12)) / (k === 0 ? 2 : 1), a.ctx.currentTime);
        });
    };
    const ramp = (a: AudioPad | null, on: boolean) => {
        if (!a) return;
        const target = on && !muted ? 0.14 : 0;
        a.master.gain.cancelScheduledValues(a.ctx.currentTime);
        a.master.gain.setTargetAtTime(target, a.ctx.currentTime, on ? 0.5 : 0.25);
    };

    useEffect(() => {
        const a = audio.current;
        if (a) applyChord(a);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i]);
    useEffect(() => {
        const a = audio.current;
        if (a) ramp(a, playing);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [muted]);
    useEffect(
        () => () => {
            try {
                if (audio.current) audio.current.ctx.close();
            } catch {
                /* ignore */
            }
        },
        []
    );

    const toggle = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const a = ensure();
        if (!playing) {
            if (a) {
                a.ctx.resume();
                applyChord(a);
                ramp(a, true);
            }
            setPlaying(true);
        } else {
            ramp(a, false);
            setPlaying(false);
        }
    };
    const next = () => {
        setI((x) => (x + 1) % TRACKS.length);
        setPos(0);
    };
    const prev = () => {
        if (pos > 3) {
            setPos(0);
        } else {
            setI((x) => (x - 1 + TRACKS.length) % TRACKS.length);
            setPos(0);
        }
    };
    const seek = (e: React.MouseEvent) => {
        const r = e.currentTarget.getBoundingClientRect();
        const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        setPos(Math.round(f * t.dur));
    };
    const stop = (fn: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        fn();
    };

    const pct = Math.min(100, (pos / t.dur) * 100);

    return (
        <div className="card mp glass">
            <MusicStyles />
            <div className="mp-top">
                <div className={`mp-cover ${playing ? 'spin' : ''}`} style={{ background: t.cover }}>
                    <IMusic size={20} />
                    <span className="hole" />
                </div>
                <div className="mp-info">
                    <div className="mp-title">{t.title}</div>
                    <div className="mp-artist">{t.artist}</div>
                    <div className="mp-share">
                        <span className="ic">
                            <IHeadset size={13} />
                        </span>
                        {spaceName || '我们的房间'} · 一起听
                        <span className={`mp-eq ${playing && !muted ? 'on' : ''}`}>
                            <i />
                            <i />
                            <i />
                            <i />
                        </span>
                    </div>
                </div>
            </div>

            <div className="mp-prog" onClick={stop(() => {})}>
                <div className="mp-bar" onClick={seek}>
                    <div className="mp-fill" style={{ width: pct + '%' }} />
                </div>
                <div className="mp-times">
                    <span>{fmt(pos)}</span>
                    <span>{fmt(t.dur)}</span>
                </div>
            </div>

            <div className="mp-ctrl-wrap">
                <div className="mp-ctrl">
                    <button className="mp-btn" onClick={stop(prev)} aria-label="上一首">
                        <ISkipB size={22} />
                    </button>
                    <button className="mp-btn mp-play" onClick={toggle} aria-label={playing ? '暂停' : '播放'}>
                        {playing ? <IPause size={18} /> : <IPlay size={18} />}
                    </button>
                    <button className="mp-btn" onClick={stop(next)} aria-label="下一首">
                        <ISkipF size={22} />
                    </button>
                </div>
                <button
                    className="mp-btn mp-vol"
                    onClick={stop(() => setMuted((m) => !m))}
                    aria-label={muted ? '取消静音' : '静音'}
                    title={muted ? '取消静音' : '静音'}
                >
                    {muted ? <IMute size={17} /> : <IVolume size={17} />}
                </button>
            </div>
        </div>
    );
}