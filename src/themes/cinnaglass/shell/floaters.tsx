// floaters.tsx — fixed-layout floating widgets of the v2 shell, rebuilt 1:1
// against ai/codex-visual/20260811-055917Z/codex-report.md:
// the anniversary moment card (233×105) and the music player bar (437×88 —
// one title line, one progress track, a big pause button; the comp has NO
// second info line and NO volume rail, so neither exists here). Materials
// come from the --cg-* tokens.

import { useMemo } from 'react';
import { IChevron, IEye, IHeart, IPause, IPlay } from '@/themes/cinnaglass/icons';
import { MusicPlayer } from '@/themes/cinnaglass/music';
import { TRACKS } from '@/themes/cinnaglass/music-tracks';
import { daysSince, daysUntilAnniversary, parseAnniv } from '@/themes/cinnaglass/profile';

/* ------------------------------------------------------------------ */
/* moment card                                                         */
/* ------------------------------------------------------------------ */

type MomentCardProps = {
    /** anniversary date, yyyy-mm-dd — worlds.anniversary as WorldPage composes
     *  it (DB row first, local profile as the offline fallback); null when
     *  neither has one */
    anniv: string | null;
    onHide: () => void;
};

// Anniversary card: days together and days to the next recurrence, both from
// the shared date math in profile.ts. With no usable date the widget renders
// nothing — there is no half-filled state worth showing in 233×105.
export function MomentCard({ anniv, onHide }: MomentCardProps) {
    if (!parseAnniv(anniv)) return null;
    const days = daysSince(anniv);
    const toNext = daysUntilAnniversary(anniv);

    return (
        <div className="moment-card cg-panel">
            <FloaterStyles />
            {/* comp: 67×62 raster cake illustration zone, no plate */}
            <span className="mc-icon" aria-hidden>
                🎂
            </span>
            <div className="mc-lines">
                <span className="mc-line">
                    在一起 <b className="mc-big num">{days}</b> 天
                </span>
                <span className="mc-line sub">
                    距纪念日还有 <b className="num">{toNext}</b> 天
                </span>
            </div>
            <div className="mc-side">
                <button className="mc-side-btn" title="隐藏（可在悬浮组件里找回）" onClick={onHide}>
                    <IEye size={19} sw={2.5} />
                </button>
                <span className="mc-side-heart">
                    <IHeart size={17} sw={2.5} />
                </span>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* music player bar                                                    */
/* ------------------------------------------------------------------ */

// Collapsed music bar. Shows the current track and expands the full player;
// the audio engine stays mounted inside it either way.
export function MusicMini({
    spaceName,
    open,
    setOpen
}: {
    spaceName?: string;
    open: boolean;
    setOpen: (v: boolean) => void;
}) {
    // The audio engine lives inside MusicPlayer; it stays mounted (hidden)
    // so collapsing never cuts the music. The big pause/play button expands
    // the full player — real remote control lands with shared playback.
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
        <div className="music-wrap">
            <FloaterStyles />
            <div className="music-full" style={{ display: open ? 'block' : 'none' }}>
                <MusicPlayer spaceName={spaceName} />
            </div>
            <div className="music-bar cg-panel cg-panel-dense">
                <span className={`mb-disc ${open ? 'spin' : ''}`}>
                    <img src="/ui/disc-cover.png" alt="" draggable={false} />
                </span>
                <div className="mb-mid">
                    <span className="mb-title">{track.title}</span>
                    <span className="mb-track">
                        <span className="mb-fill" />
                        <span className="mb-knob" />
                    </span>
                </div>
                <button className="mb-main" title={open ? '收起播放器' : '打开播放器'} onClick={() => setOpen(!open)}>
                    {open ? <IPause size={22} sw={3} /> : <IPlay size={22} sw={3} />}
                </button>
                <span className="mb-vr" />
                <button className="mb-fold" title={open ? '收起' : '展开'} onClick={() => setOpen(!open)}>
                    <span className={`mb-chev ${open ? 'up' : ''}`}>
                        <IChevron size={15} sw={3.5} />
                    </span>
                </button>
            </div>
        </div>
    );
}

// Scoped styles for both floaters. Each one mounts its own copy, so either can
// appear alone.
const FloaterStyles = () => (
    <style>{`
    /* ══ moment card — 233×105 r19 ══ */
    /* material comes from .cg-panel (cinnaglass.css) */
    .moment-card{
        position:absolute;top:41px;right:27px;z-index:35;
        width:233px;height:105px;border-radius:19px;
        display:flex;align-items:center;gap:12px;
        padding:0 12px 0 19px;
        color:var(--cg-icon);
    }
    .mc-icon{font-size:44px;line-height:1;flex:none;
        filter:drop-shadow(0 2px 4px rgba(8,12,30,0.3));}
    .mc-lines{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;}
    .mc-line{display:flex;align-items:baseline;gap:4px;font-size:13px;color:var(--cg-pink);white-space:nowrap;}
    .mc-line b.mc-big{font-size:20px;color:var(--cg-icon);line-height:1;}
    .mc-line.sub{font-size:12px;color:var(--cg-icon-muted);}
    .mc-line.sub b{color:var(--cg-icon);}
    .mc-side{display:flex;flex-direction:column;align-items:center;gap:9px;flex:none;}
    .mc-side-btn{
        appearance:none;border:0;cursor:pointer;display:flex;padding:3px;
        background:transparent;color:var(--cg-icon);border-radius:8px;
        transition:color 160ms ease,transform 120ms ease;
    }
    .mc-side-btn:hover{transform:translateY(-1px);}
    .mc-side-heart{display:flex;color:#AC9AA3;}

    /* ══ music bar — 437×88 r22 ══ */
    .music-wrap{position:absolute;right:27px;bottom:39px;z-index:35;
        display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
    .music-full{filter:drop-shadow(0 16px 40px rgba(8,12,30,0.4));}
    /* material comes from .cg-panel .cg-panel-dense (cinnaglass.css) */
    .music-bar{
        width:437px;height:88px;border-radius:22px;
        display:flex;align-items:center;
        padding:0 10px 0 13px;
    }
    .mb-disc{flex:none;width:66px;height:66px;border-radius:50%;overflow:hidden;
        box-shadow:0 0 0 1px rgba(220,220,235,0.4), 0 3px 10px rgba(8,12,30,0.35);}
    .mb-disc img{display:block;width:100%;height:100%;}
    .mb-disc.spin{animation:mbspin 6s linear infinite;}
    @keyframes mbspin{to{transform:rotate(360deg);}}
    @media (prefers-reduced-motion: reduce){ .mb-disc.spin{animation:none;} }
    .mb-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:14px;
        padding:0 14px 0 12px;}
    .mb-title{font-size:14px;font-weight:600;color:var(--cg-icon);
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    /* comp: one 193×8 r4 track, fill #F5F4F7, 18px knob — nothing else */
    .mb-track{position:relative;width:193px;height:8px;border-radius:4px;background:#555772;}
    .mb-fill{position:absolute;left:0;top:0;bottom:0;width:34%;border-radius:4px;background:#F5F4F7;}
    .mb-knob{position:absolute;left:calc(34% - 9px);top:50%;transform:translateY(-50%);
        width:18px;height:18px;border-radius:50%;background:#F8F8FA;
        box-shadow:0 2px 6px rgba(8,12,30,0.4);}
    .mb-main{
        flex:none;appearance:none;border:0;cursor:pointer;
        width:58px;height:58px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        background:var(--cg-control-strong);color:var(--cg-icon);
        border:1px solid var(--cg-stroke);
        box-shadow:var(--cg-inset);
        transition:filter 160ms ease,transform 120ms ease;
    }
    .mb-main:hover{filter:brightness(1.1);}
    .mb-main:active{transform:scale(0.94);}
    .mb-vr{flex:none;width:2px;height:61px;margin:0 12px;
        background:linear-gradient(90deg,#64667C 50%,#3E3F55 50%);}
    .mb-fold{
        flex:none;appearance:none;border:0;cursor:pointer;
        width:52px;height:52px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        background:rgba(105,106,137,0.35);color:var(--cg-icon);
        transition:filter 160ms ease,transform 120ms ease;
    }
    .mb-fold:hover{filter:brightness(1.1);}
    .mb-chev{display:inline-flex;transform:rotate(-90deg);transition:transform 200ms ease;}
    .mb-chev.up{transform:rotate(90deg);}
    `}</style>
);
