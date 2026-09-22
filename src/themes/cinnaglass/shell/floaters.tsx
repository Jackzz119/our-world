// Scene floaters share the approved glass material and keep their real state visible.
import { useEffect, useId, useRef } from 'react';
import { IChevron, IEye, IHeart, IPause, IPlay } from '@/themes/cinnaglass/icons';
import { MusicPlayer } from '@/themes/cinnaglass/music';
import { daysSince, daysUntilAnniversary, parseAnniv } from '@/themes/cinnaglass/profile';
import { musicTime, useMusicPlayback } from '@/themes/cinnaglass/use-music-playback';
import '@/themes/cinnaglass/shell/floaters.css';

type MomentCardProps = { anniv: string | null; onHide: () => void };

// Display only a valid shared anniversary; absent data never turns into a made-up date.
export function MomentCard({ anniv, onHide }: MomentCardProps) {
    if (!parseAnniv(anniv)) return null;
    const days = daysSince(anniv);
    const toNext = daysUntilAnniversary(anniv);
    return (
        <aside className="moment-card ui-surface" aria-label="我们的纪念日">
            <span className="mc-icon" aria-hidden="true">
                <IHeart size={30} />
            </span>
            <div className="mc-lines">
                <span className="mc-line">
                    在一起 <b className="mc-big num">{days}</b> 天
                </span>
                <span className="mc-line sub">
                    距纪念日还有 <b className="num">{toNext}</b> 天
                </span>
            </div>
            <button
                type="button"
                className="ui-icon-button mc-hide"
                title="隐藏（可在悬浮组件里找回）"
                aria-label="隐藏纪念卡"
                onClick={onHide}
            >
                <IEye size={19} />
            </button>
        </aside>
    );
}

// Stay mounted while hidden so audio continues; disclosure is never a playback action.
export function MusicMini({
    spaceName,
    open,
    setOpen,
    visible = true
}: {
    spaceName?: string;
    open: boolean;
    setOpen: (value: boolean) => void;
    visible?: boolean;
}) {
    const player = useMusicPlayback();
    const panelId = useId();
    const foldRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (open && visible && matchMedia('(pointer: fine)').matches)
            panelRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    }, [open, visible]);

    return (
        <div
            className="music-wrap"
            hidden={!visible}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && open) {
                    event.stopPropagation();
                    setOpen(false);
                    requestAnimationFrame(() => foldRef.current?.focus());
                }
            }}
        >
            <div id={panelId} ref={panelRef} className="music-full" hidden={!open}>
                <MusicPlayer spaceName={spaceName} player={player} />
            </div>
            <div className="music-bar ui-surface">
                <img className="mb-disc" src="/ui/disc-cover.png" alt="" draggable={false} />
                <div className="mb-mid">
                    <span className="mb-title">{player.track.title}</span>
                    <span className="mb-status">
                        {player.starting
                            ? '正在打开声音…'
                            : player.playing
                              ? player.muted || player.volume === 0
                                  ? '播放中 · 静音'
                                  : '播放中'
                              : '已暂停'}{' '}
                        · 本机音景
                    </span>
                    <progress
                        className="mb-progress"
                        value={player.pos}
                        max={player.track.dur}
                        aria-label="当前音景进度"
                        aria-valuetext={`${musicTime(player.pos)} / ${musicTime(player.track.dur)}`}
                    />
                </div>
                <button
                    type="button"
                    className="ui-icon-button ui-button-primary mb-main"
                    onClick={() => void player.toggle()}
                    disabled={player.starting}
                    aria-label={player.playing ? '暂停音乐' : '播放音乐'}
                >
                    {player.playing ? <IPause size={21} /> : <IPlay size={21} />}
                </button>
                <button
                    ref={foldRef}
                    type="button"
                    className="ui-icon-button mb-fold"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={open ? '收起播放器' : '展开播放器'}
                >
                    <span className={`mb-chevron ${open ? 'up' : ''}`}>
                        <IChevron size={18} />
                    </span>
                </button>
            </div>
            {player.error && (
                <p className="music-error ui-liner" role="alert">
                    {player.error}
                </p>
            )}
        </div>
    );
}
