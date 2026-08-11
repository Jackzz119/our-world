// floaters.tsx — the fixed-layout floating widgets of the v2 shell
// (concept-c): the anniversary "moment card" (top-right) and the music
// mini bar (bottom-right, expands into the full MusicPlayer). Layouts are
// fixed by design — the drag editor retired with the old HUD (ai/UX.md §2).

import { useMemo } from 'react';
import { IChevron, IEyeOff, IHeart, IPause, IPlay } from '../icons';
import { MusicPlayer, TRACKS } from '../music';

/* ------------------------------------------------------------------ */
/* moment card                                                         */
/* ------------------------------------------------------------------ */

type MomentCardProps = {
    /** anniversary date, yyyy-mm-dd (world.anniversary or profile fallback) */
    anniv: string;
    onHide: () => void;
};

export function MomentCard({ anniv, onHide }: MomentCardProps) {
    const { days, toNext } = useMemo(() => {
        const a = new Date(`${anniv}T00:00:00`);
        if (Number.isNaN(a.getTime())) return { days: null, toNext: null };
        const now = new Date();
        const days = Math.max(0, Math.floor((now.getTime() - a.getTime()) / 86400000));
        const next = new Date(a);
        next.setFullYear(now.getFullYear());
        if (next.getTime() < now.getTime()) next.setFullYear(now.getFullYear() + 1);
        const toNext = Math.ceil((next.getTime() - now.getTime()) / 86400000);
        return { days, toNext };
    }, [anniv]);

    if (days === null) return null;
    return (
        <div className="moment-card">
            <FloaterStyles />
            {/* codex audit M1: an emotional anchor, not a system glyph */}
            <span className="mc-icon" aria-hidden>
                🎂
            </span>
            <div className="mc-lines">
                <span className="mc-line">
                    在一起 <b className="mc-big num">{days}</b> 天 <IHeart size={12} />
                </span>
                <span className="mc-line sub">
                    距纪念日还有 <b className="num">{toNext}</b> 天
                </span>
            </div>
            <button className="mc-hide" title="隐藏（可在悬浮组件里找回）" onClick={onHide}>
                <IEyeOff size={14} />
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* music mini bar                                                      */
/* ------------------------------------------------------------------ */

export function MusicMini({
    spaceName,
    open,
    setOpen
}: {
    spaceName?: string;
    open: boolean;
    setOpen: (v: boolean) => void;
}) {
    // codex audit H3: the bar must carry media identity (cover + title) and
    // one confident primary control. Track selection persists in
    // localStorage; the play glyph expands the player — the audio engine
    // stays inside MusicPlayer (mounted below, hidden when collapsed), so
    // collapsing never cuts the music. Real remote control lands with the
    // shared-playback rework.
    const track = useMemo(() => {
        try {
            const s = JSON.parse(localStorage.getItem('ow-music-v1') || '{}');
            return TRACKS[(typeof s.i === 'number' ? s.i : 0) % TRACKS.length];
        } catch {
            return TRACKS[0];
        }
        // re-read whenever the full player closes (the user may have switched)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <div className="music-mini-wrap">
            <FloaterStyles />
            <div className="music-full" style={{ display: open ? 'block' : 'none' }}>
                <MusicPlayer spaceName={spaceName} />
            </div>
            <button className="music-mini" onClick={() => setOpen(!open)} title="一起听">
                <span className={`mm-cover ${open ? 'spin' : ''}`} style={{ background: track.cover }}>
                    <span className="mm-hole" />
                </span>
                <span className="mm-meta">
                    <span className="mm-title">{track.title}</span>
                    <span className="mm-sub">{open ? '播放器已展开' : '一起听 · 点击展开'}</span>
                </span>
                <span className="mm-main">{open ? <IPause size={16} /> : <IPlay size={16} />}</span>
                <span className={`mm-chev ${open ? 'up' : ''}`}>
                    <IChevron size={11} />
                </span>
            </button>
        </div>
    );
}

const FloaterStyles = () => (
    <style>{`
    /* L-shell (info card, ~80px tall) — shell scale ladder: S pill / M bar / L card */
    .moment-card{
        position:absolute;top:14px;right:14px;z-index:35;
        display:flex;align-items:center;gap:11px;padding:13px 14px;
        border-radius:20px;color:rgba(242,246,255,0.94);
        background:linear-gradient(160deg,rgba(64,72,110,0.52),rgba(38,44,74,0.5));
        border:1px solid rgba(255,255,255,0.22);
        backdrop-filter:blur(20px) saturate(1.2);
        box-shadow:0 8px 26px rgba(8,12,30,0.3),
                   inset 0 1px 0 rgba(255,255,255,0.16);
    }
    .mc-icon{font-size:22px;line-height:1;filter:drop-shadow(0 2px 4px rgba(8,12,30,0.3));}
    .mc-lines{display:flex;flex-direction:column;gap:2px;}
    .mc-line{display:flex;align-items:center;gap:4px;font-size:13px;color:#F6C6D0;}
    .mc-line b.mc-big{font-size:19px;color:#fff;}
    .mc-line b.num{line-height:1;}
    .mc-line.sub{font-size:12px;opacity:0.68;color:rgba(242,246,255,0.94);}
    .mc-hide{
        appearance:none;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;
        width:32px;height:32px;border-radius:10px;background:transparent;color:rgba(238,242,252,0.5);
        transition:background 160ms ease,color 160ms ease;
    }
    .mc-hide:hover{background:rgba(255,255,255,0.12);color:rgba(238,242,252,0.95);}

    .music-mini-wrap{position:absolute;right:14px;bottom:14px;z-index:35;display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
    .music-full{filter:drop-shadow(0 16px 40px rgba(8,12,30,0.4));}
    .music-mini{
        appearance:none;border:0;cursor:pointer;
        display:flex;align-items:center;gap:10px;
        width:264px;padding:9px 12px 9px 10px;
        border-radius:18px;color:rgba(242,246,255,0.94);
        background:linear-gradient(160deg,rgba(64,72,110,0.52),rgba(38,44,74,0.5));
        border:1px solid rgba(255,255,255,0.22);
        backdrop-filter:blur(20px) saturate(1.2);
        box-shadow:0 8px 26px rgba(8,12,30,0.3),
                   inset 0 1px 0 rgba(255,255,255,0.16);
        transition:transform 120ms ease,filter 160ms ease;
        text-align:left;
    }
    .music-mini:hover{filter:brightness(1.06);transform:translateY(-1px);}
    .music-mini:active{transform:scale(0.97);}
    .mm-cover{
        flex:none;width:38px;height:38px;border-radius:50%;position:relative;
        display:flex;align-items:center;justify-content:center;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,0.28),0 2px 8px rgba(8,12,30,0.3);
    }
    .mm-cover.spin{animation:mmspin 6s linear infinite;}
    @keyframes mmspin{to{transform:rotate(360deg);}}
    .mm-hole{width:9px;height:9px;border-radius:50%;background:rgba(26,30,52,0.9);
        box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.35);}
    .mm-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}
    .mm-title{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .mm-sub{font-size:11px;opacity:0.6;}
    .mm-main{
        flex:none;display:flex;align-items:center;justify-content:center;
        width:36px;height:36px;border-radius:50%;
        background:rgba(255,255,255,0.14);
        box-shadow:inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .mm-chev{display:inline-flex;transform:rotate(-90deg);transition:transform 200ms ease;opacity:0.6;}
    .mm-chev.up{transform:rotate(90deg);}
    @media (prefers-reduced-motion: reduce){ .mm-cover.spin{animation:none;} }
    `}</style>
);
