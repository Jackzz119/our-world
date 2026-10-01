// Scene floaters share the approved glass material and keep their real state visible.
import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { IChevron, IEye, IHeart, IPause, IPlay } from '@/themes/cinnaglass/icons';
import { MusicPlayer, PosterArt, type MusicTab } from '@/themes/cinnaglass/music';
import { daysSince, daysUntilAnniversary, parseAnniv } from '@/themes/cinnaglass/profile';
import { musicTime, useMusicPlayback, type MusicPlayback } from '@/themes/cinnaglass/use-music-playback';
import { Sheet, type SheetDetent } from '@/themes/cinnaglass/ui/sheet';
import { usePresence } from '@/themes/cinnaglass/ui/use-presence';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import '@/themes/cinnaglass/shell/floaters.css';

type MomentCardProps = { anniv: string | null; onHide: () => void };

// Covers the longest digit's delay plus its roll (floaters.css .odo).
const ROLL_MS = 2200;

// Digits roll up into place once, when the card first appears; showing it again after a
// panel closed (display: none → block) must not replay a count from zero.
function RollingNumber({ value }: { value: number }) {
    const [rolling, setRolling] = useState(true);
    useEffect(() => {
        const id = window.setTimeout(() => setRolling(false), ROLL_MS);
        return () => window.clearTimeout(id);
    }, []);
    return (
        <>
            <span className="ow-sr">{value}</span>
            <span className="odo" data-roll={rolling || undefined} aria-hidden="true">
                {String(value)
                    .split('')
                    .map((digit, i) => (
                        <span key={i} className="odo-d" style={{ '--d': Number(digit), '--i': i } as CSSProperties}>
                            <span>
                                {'0123456789'.split('').map((n) => (
                                    <span key={n}>{n}</span>
                                ))}
                            </span>
                        </span>
                    ))}
            </span>
        </>
    );
}

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
                    在一起{' '}
                    <b className="mc-big num">
                        <RollingNumber value={days} />
                    </b>{' '}
                    天
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

// How long the dock takes to leave (the bar is back at once).
const DOCK_EXIT_MS = 200;

type MusicMiniProps = {
    spaceName?: string;
    open: boolean;
    setOpen: (value: boolean) => void;
    visible?: boolean;
    /** the navigation shows a small equaliser while sound is playing */
    onPlayingChange?: (playing: boolean) => void;
};

// One audio transport, three presentations: phones get the sheet (no floating bar, the
// navigation is the way in), desktops get the mini bar that opens into the right-side dock.
// Stays mounted while hidden so audio continues; disclosure is never a playback action.
export function MusicMini({ spaceName, open, setOpen, visible = true, onPlayingChange }: MusicMiniProps) {
    const player = useMusicPlayback();
    const compact = useCompactUi();
    const panelId = useId();
    const foldRef = useRef<HTMLButtonElement>(null);
    const dockRef = useRef<HTMLDivElement>(null);
    const [tab, setTab] = useState<MusicTab>('lyrics');
    const [detent, setDetent] = useState<SheetDetent>('half');
    const [immersive, setImmersive] = useState(false);
    // opening again starts at half height on the main page (render-time adjustment, react.dev "previous renders")
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setDetent('half');
            setImmersive(false);
        }
    }
    const dock = usePresence(open && visible && !compact, DOCK_EXIT_MS);

    useEffect(() => {
        onPlayingChange?.(player.playing);
    }, [player.playing, onPlayingChange]);

    // Keyboard and mouse users land on play in the dock; touch users keep their place.
    useEffect(() => {
        if (open && visible && !compact && matchMedia('(pointer: fine)').matches)
            dockRef.current?.querySelector<HTMLButtonElement>('.mp-play')?.focus({ preventScroll: true });
    }, [open, visible, compact]);

    const closeDock = () => {
        setOpen(false);
        requestAnimationFrame(() => foldRef.current?.focus());
    };

    return (
        <div
            className="music-wrap"
            hidden={!visible}
            data-mode={compact ? 'sheet' : 'dock'}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && open && !compact) {
                    event.stopPropagation();
                    closeDock();
                }
            }}
        >
            {compact ? (
                <Sheet
                    open={open && visible}
                    onClose={() => setOpen(false)}
                    label="一起听"
                    expandable
                    detent={detent}
                    onDetentChange={(next) => {
                        setDetent(next);
                        // the immersion needs the whole sheet; lowering it goes back to the main page
                        if (next === 'half') setImmersive(false);
                    }}
                    className="music-sheet"
                >
                    <MusicPlayer
                        player={player}
                        spaceName={spaceName}
                        variant="sheet"
                        tab={tab}
                        onTab={setTab}
                        onNeedRoom={() => setDetent('full')}
                        onClose={() => setOpen(false)}
                        immersive={immersive}
                        onImmersive={setImmersive}
                    />
                </Sheet>
            ) : (
                <>
                    {dock.mounted && (
                        <div
                            ref={dockRef}
                            id={panelId}
                            className="music-dock ui-surface"
                            data-state={dock.closing ? 'closing' : 'open'}
                        >
                            <MusicPlayer
                                player={player}
                                spaceName={spaceName}
                                variant="dock"
                                tab={tab}
                                onTab={setTab}
                                onClose={closeDock}
                                immersive={immersive}
                                onImmersive={setImmersive}
                            />
                        </div>
                    )}
                    {!open && (
                        <MusicBar player={player} onExpand={() => setOpen(true)} foldRef={foldRef} panelId={panelId} />
                    )}
                    {!open && player.error && (
                        <p className="music-error ui-liner" role="alert">
                            {player.error}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

// The desktop mini bar: what is playing, play/pause, and the way into the dock.
function MusicBar({
    player,
    onExpand,
    foldRef,
    panelId
}: {
    player: MusicPlayback;
    onExpand: () => void;
    foldRef: RefObject<HTMLButtonElement | null>;
    panelId: string;
}) {
    return (
        <div className="music-bar ui-surface">
            {/* the sleeve is a large tap target for the same action as the chevron */}
            <span className="mb-art" aria-hidden="true" onClick={onExpand}>
                <PosterArt player={player} />
            </span>
            <div className="mb-mid">
                <span key={player.track.title} className="mb-title">
                    {player.track.title}
                </span>
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
                <span key={player.playing ? 'pause' : 'play'} className="mb-glyph">
                    {player.playing ? <IPause size={21} /> : <IPlay size={21} />}
                </span>
            </button>
            <button
                ref={foldRef}
                type="button"
                className="ui-icon-button mb-fold"
                onClick={onExpand}
                aria-expanded={false}
                aria-controls={panelId}
                aria-label="展开播放器"
            >
                <span className="mb-chevron">
                    <IChevron size={18} />
                </span>
            </button>
        </div>
    );
}
