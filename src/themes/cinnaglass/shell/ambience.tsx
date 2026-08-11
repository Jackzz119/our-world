// ambience.tsx — top-center mood/weather control, rebuilt 1:1 against the
// codex pixel spec (§5.3): a 206×112 glass panel with two 3-column icon
// rows and a center drop tab carrying the collapse chevron. Active items
// have no button plate — warm gold fill + local glow only.

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
    // the comp draws the OPEN state; collapsed keeps a small same-material pill
    const [open, setOpen] = useState(false);
    const MoodIcon = MOODS.find((m) => m.k === mood)?.Icon ?? IDusk;
    const WxIcon = WXS.find((w) => w.k === wx)?.Icon ?? ICloud;

    return (
        <div className="amb-wrap">
            <AmbienceStyles />
            {!open ? (
                <button className="amb-pill" onClick={() => setOpen(true)} title="灯光与天气">
                    <span className="amb-cur">
                        <MoodIcon size={16} sw={2.5} />
                    </span>
                    <span className="amb-div" />
                    <span className="amb-cur">
                        <WxIcon size={16} sw={2.5} />
                    </span>
                    <span className="amb-chev">
                        <IChevron size={11} />
                    </span>
                </button>
            ) : (
                <>
                    <div className="amb-panel">
                        <div className="amb-row">
                            {MOODS.map(({ k, label, Icon }) => (
                                <button
                                    key={k}
                                    className={`amb-opt ${mood === k ? 'on' : ''}`}
                                    title={label}
                                    onClick={() => setMood(k)}
                                >
                                    <Icon size={22} sw={2.5} />
                                </button>
                            ))}
                        </div>
                        <span className="amb-hr" />
                        <div className="amb-row">
                            {WXS.map(({ k, label, Icon }) => (
                                <button
                                    key={k}
                                    className={`amb-opt ${wx === k ? 'on' : ''}`}
                                    title={label}
                                    onClick={() => setWx(k)}
                                >
                                    <Icon size={22} sw={2.5} />
                                </button>
                            ))}
                        </div>
                        {/* spec: center drop tab (82×45, bottom r26) with chevron */}
                        <button className="amb-tab" title="收起" onClick={() => setOpen(false)}>
                            <IChevron size={14} sw={3.5} />
                        </button>
                    </div>
                    <div className="amb-scrim" onClick={() => setOpen(false)} />
                </>
            )}
        </div>
    );
}

const AmbienceStyles = () => (
    <style>{`
    .amb-wrap{position:absolute;top:24px;left:50%;transform:translateX(-50%);z-index:40;}
    .amb-pill{
        appearance:none;border:0;cursor:pointer;
        display:flex;align-items:center;gap:8px;padding:9px 13px;
        border-radius:999px;color:var(--cg-icon);
        background:var(--cg-panel);
        border:1px solid var(--cg-stroke);
        backdrop-filter:var(--cg-blur);
        box-shadow:var(--cg-shadow), var(--cg-inset);
        transition:transform 120ms ease,filter 160ms ease;
    }
    .amb-pill:hover{filter:brightness(1.08);transform:translateY(-1px);}
    .amb-pill:active{transform:scale(0.96);}
    .amb-div{width:1px;height:14px;background:var(--cg-stroke);}
    .amb-cur{display:inline-flex;color:var(--cg-gold-core);filter:drop-shadow(0 0 5px rgba(255,176,88,0.55));}
    .amb-chev{display:inline-flex;transform:rotate(90deg);opacity:0.6;}
    /* spec 5.3: body 206×112 r19, rows of 3 (cell 40×36, column pitch 58),
       divider 161×2, drop tab 82×45 hanging below the body */
    .amb-panel{
        position:relative;
        width:206px;height:112px;border-radius:19px;
        display:flex;flex-direction:column;align-items:center;
        padding:7px 0 0;
        background:var(--cg-panel);
        border:1px solid var(--cg-stroke);
        backdrop-filter:var(--cg-blur);
        box-shadow:var(--cg-shadow), var(--cg-inset);
        animation:ambpop 220ms cubic-bezier(0.34,1.3,0.5,1);
        transform-origin:top center;
    }
    @keyframes ambpop{0%{opacity:0;transform:scale(0.9) translateY(-4px);}100%{opacity:1;transform:scale(1) translateY(0);}}
    .amb-row{display:flex;gap:18px;}
    .amb-hr{width:161px;height:2px;border-radius:1px;margin:2px 0;
        background:rgba(221,217,227,0.36);box-shadow:0 1px 0 rgba(30,30,45,0.4);}
    /* spec: no plate on options; active = warm gold core + local glow */
    .amb-opt{
        appearance:none;border:0;cursor:pointer;
        width:40px;height:36px;border-radius:10px;
        display:flex;align-items:center;justify-content:center;
        background:transparent;color:var(--cg-icon-muted);
        transition:color 160ms ease,filter 160ms ease,transform 120ms ease;
    }
    .amb-opt:hover{color:var(--cg-icon);transform:translateY(-1px);}
    .amb-opt:active{transform:scale(0.92);}
    .amb-opt.on{color:var(--cg-gold-core);filter:drop-shadow(0 0 9px rgba(255,175,82,0.55));}
    .amb-tab{
        position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:-1px;
        width:82px;height:26px;
        border:1px solid var(--cg-stroke);border-top:0;
        border-radius:0 0 26px 26px;
        display:flex;align-items:center;justify-content:center;
        background:var(--cg-panel);color:var(--cg-icon);
        cursor:pointer;backdrop-filter:var(--cg-blur);
    }
    .amb-tab :first-child{transform:rotate(-90deg);}
    .amb-scrim{position:fixed;inset:0;z-index:-1;}
    `}</style>
);
