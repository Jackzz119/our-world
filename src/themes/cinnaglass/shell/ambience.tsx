// ambience.tsx — top-center mood/weather control of the v2 shell
// (concept-c). Collapsed: one small capsule showing the current pair.
// Open: two icon rows (mood / weather) in a glass popover.

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { IcoProps } from '../icons';
import { IChevron, ICloud, IDusk, IMoon, IRain, ISun } from '../icons';
import type { Mood, WeatherTweak } from '../tweaks';

type AmbienceProps = {
    mood: Mood;
    setMood: (k: Mood) => void;
    wx: WeatherTweak;
    setWx: (k: WeatherTweak) => void;
};

const MOODS: { k: Mood; label: string; Icon: (p: IcoProps) => ReactNode }[] = [
    { k: 'golden', label: '黄昏', Icon: ISun },
    { k: 'twilight', label: '暮色', Icon: IDusk },
    { k: 'night', label: '夜晚', Icon: IMoon }
];
const WXS: { k: WeatherTweak; label: string; Icon: (p: IcoProps) => ReactNode }[] = [
    { k: 'auto', label: '实况', Icon: ICloud },
    { k: 'sun', label: '晴', Icon: ISun },
    { k: 'rain', label: '雨', Icon: IRain }
];

export function Ambience({ mood, setMood, wx, setWx }: AmbienceProps) {
    const [open, setOpen] = useState(false);
    const MoodIcon = MOODS.find((m) => m.k === mood)?.Icon ?? IDusk;
    const WxIcon = WXS.find((w) => w.k === wx)?.Icon ?? ICloud;

    return (
        <div className="amb-wrap">
            <AmbienceStyles />
            <button className="amb-pill" onClick={() => setOpen(!open)} title="灯光与天气">
                {/* warm accents mark these as the CURRENT mood/weather (L1) */}
                <span className="amb-cur">
                    <MoodIcon size={16} />
                </span>
                <span className="amb-div" />
                <span className="amb-cur">
                    <WxIcon size={16} />
                </span>
                <span className={`amb-chev ${open ? 'up' : ''}`}>
                    <IChevron size={11} />
                </span>
            </button>
            {open && (
                <>
                    <div className="amb-pop">
                        <div className="amb-row">
                            {MOODS.map(({ k, label, Icon }) => (
                                <button
                                    key={k}
                                    className={`amb-opt ${mood === k ? 'on' : ''}`}
                                    title={label}
                                    onClick={() => setMood(k)}
                                >
                                    <Icon size={17} />
                                </button>
                            ))}
                        </div>
                        <div className="amb-row">
                            {WXS.map(({ k, label, Icon }) => (
                                <button
                                    key={k}
                                    className={`amb-opt ${wx === k ? 'on' : ''}`}
                                    title={label}
                                    onClick={() => setWx(k)}
                                >
                                    <Icon size={17} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="amb-scrim" onClick={() => setOpen(false)} />
                </>
            )}
        </div>
    );
}

const AmbienceStyles = () => (
    <style>{`
    .amb-wrap{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:40;}
    .amb-pill{
        appearance:none;border:0;cursor:pointer;
        display:flex;align-items:center;gap:8px;padding:9px 13px;
        border-radius:999px;color:rgba(242,246,255,0.94);
        background:linear-gradient(160deg,rgba(64,72,110,0.52),rgba(38,44,74,0.5));
        border:1px solid rgba(255,255,255,0.22);
        backdrop-filter:blur(20px) saturate(1.2);
        box-shadow:0 8px 26px rgba(8,12,30,0.3),
                   inset 0 1px 0 rgba(255,255,255,0.16);
        transition:transform 120ms ease,filter 160ms ease;
    }
    .amb-pill:hover{filter:brightness(1.08);transform:translateY(-1px);}
    .amb-pill:active{transform:scale(0.96);}
    .amb-div{width:1px;height:14px;background:rgba(255,255,255,0.22);}
    .amb-cur{display:inline-flex;color:#FFD9A8;filter:drop-shadow(0 0 5px rgba(255,205,140,0.45));}
    .amb-chev{display:inline-flex;transform:rotate(90deg);transition:transform 200ms ease;opacity:0.6;}
    .amb-chev.up{transform:rotate(-90deg);}
    .amb-pop{
        position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);
        display:flex;flex-direction:column;gap:6px;padding:10px;
        border-radius:16px;
        background:rgba(26,30,52,0.72);
        border:1px solid rgba(255,255,255,0.16);
        backdrop-filter:blur(20px) saturate(1.15);
        box-shadow:0 16px 44px rgba(8,12,30,0.45);
        animation:ambpop 220ms cubic-bezier(0.34,1.3,0.5,1);
        transform-origin:top center;
    }
    @keyframes ambpop{0%{opacity:0;transform:translateX(-50%) scale(0.9) translateY(-4px);}100%{opacity:1;transform:translateX(-50%) scale(1) translateY(0);}}
    .amb-row{display:flex;gap:6px;}
    .amb-opt{
        appearance:none;border:0;cursor:pointer;
        width:42px;height:38px;border-radius:12px;
        display:flex;align-items:center;justify-content:center;
        background:rgba(255,255,255,0.05);color:rgba(238,242,252,0.75);
        transition:background 160ms ease,color 160ms ease,transform 120ms ease;
    }
    .amb-opt:hover{background:rgba(255,255,255,0.12);transform:translateY(-1px);}
    .amb-opt:active{transform:scale(0.94);}
    .amb-opt.on{background:rgba(143,196,238,0.28);color:#fff;box-shadow:inset 0 0 0 1px rgba(143,196,238,0.6);}
    .amb-scrim{position:fixed;inset:0;z-index:-1;}
    `}</style>
);
