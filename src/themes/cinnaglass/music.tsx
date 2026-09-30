// The player's main page: now playing (the poster on its record, a lyrics
// preview, transport), then 歌词 / 歌单 / 声音. The desktop dock and the phone
// sheet render this same page; everything is the local generative playlist,
// nothing here implies shared listening (ai/design_system/uiux/interaction.md §4).
// Tapping the lyrics preview (or 沉浸 on the lyrics tab) swaps the page for the
// immersive lyrics (concept B3): the poster blurred into the whole panel, the
// words large, the current line lit; Esc or 退出沉浸 comes back.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
    IClose,
    IExpand,
    IHeart,
    IList,
    IMute,
    IPause,
    IPlay,
    IRepeat,
    IRepeatOne,
    IShrink,
    IShuffle,
    ISkipB,
    ISkipF,
    IVolume
} from '@/themes/cinnaglass/icons';
import { lyricAt } from '@/themes/cinnaglass/music-tracks';
import { musicTime, type MusicPlayback } from '@/themes/cinnaglass/use-music-playback';
import { burst } from '@/themes/cinnaglass/ui/feedback';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import '@/themes/cinnaglass/music.css';

export type MusicTab = 'lyrics' | 'list' | 'sound';

const MODES = [
    { k: 'list', label: '列表循环', Icon: IRepeat },
    { k: 'repeat', label: '单曲循环', Icon: IRepeatOne },
    { k: 'shuffle', label: '随机播放', Icon: IShuffle }
] as const;
const TABS: { k: MusicTab; label: string }[] = [
    { k: 'lyrics', label: '歌词' },
    { k: 'list', label: '歌单' },
    { k: 'sound', label: '声音' }
];

type PlayerProps = {
    player: MusicPlayback;
    spaceName?: string;
    variant: 'dock' | 'sheet';
    tab: MusicTab;
    onTab: (tab: MusicTab) => void;
    /** the phone sheet grows to full height when a tab needs the room */
    onNeedRoom?: () => void;
    onClose?: () => void;
    /** the immersive lyrics page (B3) is showing instead of the main page */
    immersive?: boolean;
    onImmersive?: (open: boolean) => void;
};

// Playback controls stay independent of disclosure: closing the page never pauses.
export function MusicPlayer({
    player,
    spaceName,
    variant,
    tab,
    onTab,
    onNeedRoom,
    onClose,
    immersive = false,
    onImmersive
}: PlayerProps) {
    const openTab = (next: MusicTab) => {
        onTab(next);
        onNeedRoom?.();
    };
    const immerse = onImmersive
        ? () => {
              onImmersive(true);
              onNeedRoom?.();
          }
        : undefined;
    if (immersive && onImmersive)
        return (
            <section className="mp" data-variant={variant} data-immersive aria-label="音乐播放器 · 沉浸歌词">
                <ImmersiveLyrics player={player} onExit={() => onImmersive(false)} onClose={onClose} />
            </section>
        );
    return (
        <section className="mp" data-variant={variant} aria-label="音乐播放器">
            {variant === 'dock' && (
                <header className="mp-head">
                    <h2>一起听</h2>
                    <span className="mp-place">{spaceName || '我们的房间'} · 本机音景</span>
                    {onClose && (
                        <button
                            type="button"
                            className="ui-icon-button mp-close"
                            aria-label="收起播放器"
                            onClick={onClose}
                        >
                            <IClose size={18} />
                        </button>
                    )}
                </header>
            )}
            <NowPlaying player={player} onList={() => openTab('list')} onLyrics={immerse} />
            <MusicTabs tab={tab} onTab={openTab} />
            <div className="mp-panel" role="tabpanel" aria-label={TABS.find((t) => t.k === tab)?.label}>
                {tab === 'lyrics' ? (
                    <LyricsView player={player} onImmersive={immerse} />
                ) : tab === 'list' ? (
                    <Playlist player={player} />
                ) : (
                    <SoundView player={player} />
                )}
            </div>
        </section>
    );
}

// The record sleeve: the poster in front, the record sliding out and turning while it plays.
export function PosterArt({ player, className = '' }: { player: MusicPlayback; className?: string }) {
    const { track } = player;
    return (
        <div className={`mp-art ${className}`} data-playing={player.playing || undefined}>
            <span className="mp-disc" aria-hidden="true">
                <img src="/rooms/study/vinyl.webp" alt="" draggable={false} />
                <span className="mp-label" style={{ backgroundImage: `url(${track.poster})` }} />
            </span>
            <img
                key={track.title}
                className="mp-poster"
                src={track.poster}
                alt=""
                draggable={false}
                style={{ background: track.tint }}
            />
        </div>
    );
}

function NowPlaying({
    player,
    onList,
    onLyrics
}: {
    player: MusicPlayback;
    onList: () => void;
    /** the preview opens the immersive lyrics */
    onLyrics?: () => void;
}) {
    const { track } = player;
    const line = lyricAt(track, player.pos);
    const current = track.lyrics[line];
    const next = track.lyrics[line + 1];
    const liked = player.liked.includes(track.title);
    const likeRef = useRef<HTMLButtonElement>(null);
    const pct = track.dur ? Math.min(100, (player.pos / track.dur) * 100) : 0;
    const mode = MODES.find((m) => m.k === player.mode) ?? MODES[0];
    const nextMode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    return (
        <div className="mp-now">
            {/* the top strip is the sheet's drag handle; its button stays a button */}
            <div className="mp-top" data-sheet-grab>
                <PosterArt player={player} />
                <div className="mp-info">
                    <h3 key={track.title} className="mp-title">
                        {track.title}
                    </h3>
                    <p className="mp-note">{track.artist} · 本机音景</p>
                </div>
                <button
                    ref={likeRef}
                    type="button"
                    className="ui-icon-button mp-like"
                    aria-pressed={liked}
                    aria-label={liked ? `取消收藏 ${track.title}` : `收藏 ${track.title}（只存在这台设备）`}
                    onClick={(event) => {
                        player.toggleLike(track.title);
                        if (!liked)
                            burst(event.currentTarget, {
                                glyphs: ['♥', '✦', '♥'],
                                color: '#f5b6c1',
                                count: 7,
                                size: 13
                            });
                    }}
                >
                    <IHeart size={20} fill={liked ? 'currentColor' : 'none'} />
                </button>
            </div>
            <button
                type="button"
                className="mp-lyric"
                onClick={onLyrics}
                disabled={!onLyrics}
                aria-label={`沉浸看歌词${current ? `：${current.text}` : ''}`}
            >
                <span key={`${track.title}-${line}`} className="mp-line on">
                    {current ? current.text : '♪'}
                </span>
                {next && (
                    <span key={`${track.title}-${line}-next`} className="mp-line">
                        {next.text}
                    </span>
                )}
            </button>
            <label className="mp-progress">
                <span className="ow-sr">音景进度</span>
                <input
                    type="range"
                    min={0}
                    max={track.dur}
                    step={1}
                    value={Math.floor(player.pos)}
                    style={{ '--p': `${pct}%` } as CSSProperties}
                    onChange={(event) => player.seek(Number(event.target.value))}
                    aria-valuetext={`${musicTime(player.pos)}，总时长 ${musicTime(track.dur)}`}
                />
            </label>
            <div className="mp-times" aria-hidden="true">
                <span>{musicTime(player.pos)}</span>
                <span>{musicTime(track.dur)}</span>
            </div>
            <div className="mp-transport">
                <button
                    type="button"
                    className="ui-icon-button mp-ghost"
                    onClick={() => player.setMode(nextMode.k)}
                    aria-label={`播放方式：${mode.label}，点按换成${nextMode.label}`}
                    title={mode.label}
                >
                    <span key={mode.k} className="mp-swap">
                        <mode.Icon size={20} />
                    </span>
                </button>
                <button
                    type="button"
                    className="ui-icon-button mp-ghost mp-skip"
                    onClick={player.prev}
                    aria-label="上一首"
                >
                    <ISkipB size={24} />
                </button>
                <button
                    type="button"
                    className="ui-icon-button ui-button-primary mp-play"
                    data-playing={player.playing || undefined}
                    onClick={() => void player.toggle()}
                    disabled={player.starting}
                    aria-label={player.starting ? '正在打开声音' : player.playing ? '暂停' : '播放'}
                >
                    <span className="mp-glyph play" aria-hidden="true">
                        <IPlay size={26} />
                    </span>
                    <span className="mp-glyph pause" aria-hidden="true">
                        <IPause size={26} />
                    </span>
                </button>
                <button
                    type="button"
                    className="ui-icon-button mp-ghost mp-skip"
                    onClick={player.next}
                    aria-label="下一首"
                >
                    <ISkipF size={24} />
                </button>
                <button type="button" className="ui-icon-button mp-ghost" onClick={onList} aria-label="打开歌单">
                    <IList size={20} />
                </button>
            </div>
            {player.error && (
                <p className="mp-error" role="alert">
                    {player.error}
                </p>
            )}
        </div>
    );
}

// One pill slides under the chosen tab; arrow keys move between tabs.
function MusicTabs({ tab, onTab }: { tab: MusicTab; onTab: (tab: MusicTab) => void }) {
    const index = Math.max(
        0,
        TABS.findIndex((t) => t.k === tab)
    );
    return (
        <div
            className="mp-tabs"
            role="tablist"
            aria-label="播放器页面"
            style={{ '--i': index, '--n': TABS.length } as CSSProperties}
            onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                event.preventDefault();
                const list = event.currentTarget;
                const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
                onTab(next.k);
                requestAnimationFrame(() => list.querySelector<HTMLElement>(`[data-tab="${next.k}"]`)?.focus());
            }}
        >
            <span className="mp-tab-pill" aria-hidden="true" />
            {TABS.map((t) => (
                <button
                    key={t.k}
                    type="button"
                    role="tab"
                    data-tab={t.k}
                    aria-selected={tab === t.k}
                    tabIndex={tab === t.k ? 0 : -1}
                    onClick={() => onTab(t.k)}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}

// Every line of the current track; the sung one is lit and kept in the middle, a tap jumps there.
// Keep the current line in the middle of a scrolling lyrics list.
function useCenteredLine(line: number, title: string) {
    const listRef = useRef<HTMLOListElement>(null);
    useEffect(() => {
        const list = listRef.current;
        const el = list?.querySelector<HTMLElement>('[aria-current="true"]');
        if (!list || !el) return;
        list.scrollTo({
            top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2,
            behavior: motionReduced() ? 'auto' : 'smooth'
        });
    }, [line, title]);
    return listRef;
}

// Every line; tap one to jump there.
function LyricLines({ player, line }: { player: MusicPlayback; line: number }) {
    const { track } = player;
    return track.lyrics.map((l, i) => (
        <li key={`${track.title}-${l.t}`}>
            <button
                type="button"
                aria-current={i === line || undefined}
                data-past={i < line || undefined}
                onClick={() => player.seek(l.t)}
                title={`跳到 ${musicTime(l.t)}`}
            >
                {l.text}
            </button>
        </li>
    ));
}

function LyricsView({ player, onImmersive }: { player: MusicPlayback; onImmersive?: () => void }) {
    const { track } = player;
    const line = lyricAt(track, player.pos);
    const listRef = useCenteredLine(line, track.title);
    return (
        <div className="mp-lyrics-wrap">
            <ol ref={listRef} className="mp-lyrics" aria-label={`${track.title} 的歌词`}>
                <LyricLines player={player} line={line} />
            </ol>
            {onImmersive && (
                <button
                    type="button"
                    className="ui-icon-button mp-immerse"
                    aria-label="沉浸看歌词"
                    onClick={onImmersive}
                >
                    <IExpand size={18} />
                </button>
            )}
        </div>
    );
}

// B3: the poster blurred into the whole panel, the words large and the current line lit,
// a compact now-playing strip underneath. Escape leaves the immersion before the player.
function ImmersiveLyrics({
    player,
    onExit,
    onClose
}: {
    player: MusicPlayback;
    onExit: () => void;
    onClose?: () => void;
}) {
    const { track } = player;
    const line = lyricAt(track, player.pos);
    const listRef = useCenteredLine(line, track.title);
    const pct = track.dur ? Math.min(100, (player.pos / track.dur) * 100) : 0;
    return (
        <div
            className="mp-immersive"
            data-esc-own
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    onExit();
                }
            }}
        >
            <img
                key={track.title}
                className="mp-imm-bg"
                src={track.poster}
                alt=""
                aria-hidden="true"
                draggable={false}
            />
            <header className="mp-imm-hd" data-sheet-grab>
                <img className="mp-imm-art" src={track.poster} alt="" draggable={false} />
                <div className="mp-info">
                    <h3 key={track.title} className="mp-title">
                        {track.title}
                    </h3>
                    <p className="mp-note">{track.artist} · 本机音景</p>
                </div>
                <button type="button" className="ui-icon-button mp-ghost" aria-label="退出沉浸" onClick={onExit}>
                    <IShrink size={19} />
                </button>
                {onClose && (
                    <button type="button" className="ui-icon-button mp-ghost" aria-label="收起播放器" onClick={onClose}>
                        <IClose size={18} />
                    </button>
                )}
            </header>
            <ol ref={listRef} className="mp-lyrics mp-imm-lines" aria-label={`${track.title} 的歌词`}>
                <LyricLines player={player} line={line} />
            </ol>
            <footer className="mp-imm-ft">
                <label className="mp-progress">
                    <span className="ow-sr">音景进度</span>
                    <input
                        type="range"
                        min={0}
                        max={track.dur}
                        step={1}
                        value={Math.floor(player.pos)}
                        style={{ '--p': `${pct}%` } as CSSProperties}
                        onChange={(event) => player.seek(Number(event.target.value))}
                        aria-valuetext={`${musicTime(player.pos)}，总时长 ${musicTime(track.dur)}`}
                    />
                </label>
                <div className="mp-imm-row">
                    <span className="mp-imm-time" aria-hidden="true">
                        {musicTime(player.pos)}
                    </span>
                    <button
                        type="button"
                        className="ui-icon-button mp-ghost mp-skip"
                        onClick={player.prev}
                        aria-label="上一首"
                    >
                        <ISkipB size={22} />
                    </button>
                    <button
                        type="button"
                        className="ui-icon-button ui-button-primary mp-play"
                        data-playing={player.playing || undefined}
                        onClick={() => void player.toggle()}
                        disabled={player.starting}
                        aria-label={player.starting ? '正在打开声音' : player.playing ? '暂停' : '播放'}
                    >
                        <span className="mp-glyph play" aria-hidden="true">
                            <IPlay size={24} />
                        </span>
                        <span className="mp-glyph pause" aria-hidden="true">
                            <IPause size={24} />
                        </span>
                    </button>
                    <button
                        type="button"
                        className="ui-icon-button mp-ghost mp-skip"
                        onClick={player.next}
                        aria-label="下一首"
                    >
                        <ISkipF size={22} />
                    </button>
                    <span className="mp-imm-time" aria-hidden="true">
                        {musicTime(track.dur)}
                    </span>
                </div>
            </footer>
        </div>
    );
}

// The playlist: tap a row to play it (the current row pauses/resumes), filter to favourites.
function Playlist({ player }: { player: MusicPlayback }) {
    const [only, setOnly] = useState<'all' | 'liked'>('all');
    const rows = player.tracks
        .map((track, index) => ({ track, index }))
        .filter(({ track }) => only === 'all' || player.liked.includes(track.title));
    return (
        <div className="mp-list">
            <div className="mp-chips" role="group" aria-label="筛选歌单">
                <button type="button" className="mp-chip" aria-pressed={only === 'all'} onClick={() => setOnly('all')}>
                    全部 {player.tracks.length}
                </button>
                <button
                    type="button"
                    className="mp-chip"
                    aria-pressed={only === 'liked'}
                    onClick={() => setOnly('liked')}
                >
                    收藏 {player.liked.length}
                </button>
            </div>
            {rows.length === 0 ? (
                <p className="mp-empty">还没有收藏。点正在播放旁边的 ♡，把喜欢的那首留下来（只存在这台设备）。</p>
            ) : (
                <ul>
                    {rows.map(({ track, index }, k) => {
                        const current = index === player.i;
                        return (
                            <li key={track.title} style={{ '--k': k } as CSSProperties}>
                                <button
                                    type="button"
                                    className="mp-row"
                                    aria-current={current || undefined}
                                    onClick={() => (current ? void player.toggle() : player.select(index))}
                                    aria-label={`${track.title}，${track.artist}${current ? (player.playing ? '，正在播放，点按暂停' : '，已暂停，点按继续') : ''}`}
                                >
                                    <img
                                        src={track.poster}
                                        alt=""
                                        draggable={false}
                                        style={{ background: track.tint }}
                                    />
                                    <span className="mp-row-text">
                                        <b>{track.title}</b>
                                        <span>{track.artist}</span>
                                    </span>
                                    {player.liked.includes(track.title) && (
                                        <span className="mp-row-like" aria-hidden="true">
                                            <IHeart size={12} fill="currentColor" sw={0} />
                                        </span>
                                    )}
                                    {current && player.playing ? (
                                        <span className="mp-eq" aria-hidden="true">
                                            <i />
                                            <i />
                                            <i />
                                        </span>
                                    ) : (
                                        <span className="mp-dur">{musicTime(track.dur)}</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

// Volume, mute and play order; the honest note about where the sound plays.
function SoundView({ player }: { player: MusicPlayback }) {
    return (
        <div className="mp-sound">
            <div className="mp-volume">
                <button
                    type="button"
                    className="ui-icon-button"
                    onClick={player.setMuted}
                    aria-label={player.muted ? '取消静音' : '静音'}
                    aria-pressed={player.muted}
                >
                    {player.muted ? <IMute size={19} /> : <IVolume size={19} />}
                </button>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={player.volume}
                    style={{ '--p': `${player.muted ? 0 : player.volume}%` } as CSSProperties}
                    onChange={(event) => player.setVolume(Number(event.target.value))}
                    aria-label="音量"
                    aria-valuetext={`${player.volume}%${player.muted ? '，当前静音' : ''}`}
                />
                <span>{player.volume}%</span>
            </div>
            <div className="mp-modes" role="radiogroup" aria-label="播放方式">
                {MODES.map((m) => (
                    <button
                        key={m.k}
                        type="button"
                        role="radio"
                        aria-checked={player.mode === m.k}
                        onClick={() => player.setMode(m.k)}
                    >
                        <m.Icon size={16} />
                        {m.label}
                    </button>
                ))}
            </div>
            <p className="mp-note">在这台设备播放，不与对方同步。</p>
        </div>
    );
}
