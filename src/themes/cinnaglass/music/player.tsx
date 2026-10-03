// The player's main page: now playing (the poster on its record, a lyrics preview, transport), then
// 歌词 / 曲库 / 声音. The desktop dock and the phone sheet render this same page. Songs come from
// the world's shared library (uploaded originals, streamed as they are) and the built-in
// soundscapes; nothing here implies listening together (ai/design_system/uiux/interaction.md §4).
// Four pages swap in place: the main page, the immersive lyrics (concept B3: the poster blurred
// into the whole panel, the words large, the current line lit), the upload page and the
// quality page of the song that plays (versions, signal path, downloads).
// Feature doc: ai/features/music/music.md §界面.
import { useEffect, useRef, type CSSProperties } from 'react';
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
import { lyricLineAt, type LyricDoc, type LyricLine } from '@/lib/music/lyrics';
import { formatBytes } from '@/lib/music/quality';
import { Cover } from '@/themes/cinnaglass/music/cover';
import { LibraryView } from '@/themes/cinnaglass/music/library-view';
import { badgeText, musicTime, spokenTime } from '@/themes/cinnaglass/music/music-model';
import { QualityView } from '@/themes/cinnaglass/music/quality-view';
import { UploadView } from '@/themes/cinnaglass/music/upload-view';
import type { MusicPlayback } from '@/themes/cinnaglass/music/use-music';
import type { MusicUpload } from '@/themes/cinnaglass/music/use-music-upload';
import { burst } from '@/themes/cinnaglass/ui/feedback';
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';
import '@/themes/cinnaglass/music/music.css';
import '@/themes/cinnaglass/music/library.css';

export type MusicTab = 'lyrics' | 'library' | 'sound';
export type MusicPage = 'main' | 'immersive' | 'upload' | 'quality';

const MODES = [
    { k: 'list', label: '列表循环', Icon: IRepeat },
    { k: 'repeat', label: '单曲循环', Icon: IRepeatOne },
    { k: 'shuffle', label: '随机播放', Icon: IShuffle }
] as const;
const TABS: { k: MusicTab; label: string }[] = [
    { k: 'lyrics', label: '歌词' },
    { k: 'library', label: '曲库' },
    { k: 'sound', label: '声音' }
];

type PlayerProps = {
    player: MusicPlayback;
    upload: MusicUpload;
    spaceName?: string;
    variant: 'dock' | 'sheet';
    tab: MusicTab;
    onTab: (tab: MusicTab) => void;
    /** the phone sheet grows to full height when a tab or a page needs the room */
    onNeedRoom?: () => void;
    onClose?: () => void;
    page: MusicPage;
    onPage: (page: MusicPage) => void;
};

// Playback controls stay independent of disclosure: closing the page never pauses.
export function MusicPlayer({
    player,
    upload,
    spaceName,
    variant,
    tab,
    onTab,
    onNeedRoom,
    onClose,
    page,
    onPage
}: PlayerProps) {
    const openTab = (next: MusicTab) => {
        onTab(next);
        onNeedRoom?.();
    };
    const open = (next: MusicPage) => {
        onPage(next);
        if (next !== 'main') onNeedRoom?.();
    };
    if (page === 'immersive')
        return (
            <section className="mp" data-variant={variant} data-immersive aria-label="音乐播放器 · 沉浸歌词">
                <ImmersiveLyrics player={player} onExit={() => onPage('main')} onClose={onClose} />
            </section>
        );
    if (page === 'upload')
        return (
            <section className="mp" data-variant={variant} data-page="upload" aria-label="上传音乐">
                <UploadView upload={upload} onBack={() => onPage('main')} onClose={onClose} />
            </section>
        );
    if (page === 'quality')
        return (
            <section className="mp" data-variant={variant} data-page="quality" aria-label="这首歌的音质">
                <QualityView player={player} onBack={() => onPage('main')} onClose={onClose} />
            </section>
        );
    return (
        <section className="mp" data-variant={variant} aria-label="音乐播放器">
            {variant === 'dock' && (
                <header className="mp-head">
                    <h2>一起听</h2>
                    <span className="mp-place">
                        {spaceName || '我们的房间'} ·{' '}
                        {player.library.length ? `曲库 ${player.library.length} 首` : '本机音景'}
                    </span>
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
            <NowPlaying
                player={player}
                onList={() => openTab('library')}
                onLyrics={() => open('immersive')}
                onQuality={() => open('quality')}
                onClose={variant === 'sheet' ? onClose : undefined}
            />
            <MusicTabs tab={tab} onTab={openTab} />
            <div className="mp-panel" role="tabpanel" aria-label={TABS.find((t) => t.k === tab)?.label}>
                {tab === 'lyrics' ? (
                    <LyricsView player={player} onImmersive={() => open('immersive')} />
                ) : tab === 'library' ? (
                    <LibraryView player={player} onUpload={() => open('upload')} uploading={upload.running} />
                ) : (
                    <SoundView player={player} />
                )}
            </div>
        </section>
    );
}

// The record sleeve: the poster in front, the record sliding out and turning while it plays.
export function PosterArt({ player, className = '' }: { player: MusicPlayback; className?: string }) {
    const { item } = player;
    return (
        <div className={`mp-art ${className}`} data-playing={player.playing || undefined}>
            <span className="mp-disc" aria-hidden="true">
                <img src="/rooms/study/vinyl.webp" alt="" draggable={false} />
                <span
                    className="mp-label"
                    style={{ background: item.poster ? `center / cover no-repeat url(${item.poster})` : item.tint }}
                />
            </span>
            <Cover key={item.key} item={item} className="mp-poster" />
        </div>
    );
}

// The quality word under the title: a badge for lossless songs, the format otherwise; it opens the
// quality page. Soundscapes just say what they are.
function QualityChip({ player, onQuality }: { player: MusicPlayback; onQuality: () => void }) {
    const { item, state } = player;
    if (!item.library) return <span>本机音景</span>;
    const badge = badgeText(item.badge);
    const compact = state.version === 'compact';
    return (
        <button
            type="button"
            className="mp-badge"
            data-badge={compact ? 'compact' : (item.badge ?? undefined)}
            onClick={onQuality}
            aria-label={`音质：${compact ? '省流版' : `${badge ?? ''} ${item.formatLabel}`}，点开看详情`}
        >
            {compact ? '省流' : (badge ?? item.formatLabel)}
            {state.local && <span className="mp-badge-dot" aria-hidden="true" />}
        </button>
    );
}

function NowPlaying({
    player,
    onList,
    onLyrics,
    onQuality,
    onClose
}: {
    player: MusicPlayback;
    onList: () => void;
    /** the preview opens the immersive lyrics */
    onLyrics: () => void;
    onQuality: () => void;
    /** the phone sheet has no header of its own: its close button sits beside the heart */
    onClose?: () => void;
}) {
    const { item, lyrics, state } = player;
    const line = lyrics ? lyricLineAt(lyrics, player.pos) : -1;
    const current = lyrics?.lines[line];
    const next = lyrics?.lines[line + 1];
    const liked = player.isLiked(item);
    const likeRef = useRef<HTMLButtonElement>(null);
    const dur = state.durationMs || item.durationMs;
    const pct = dur ? Math.min(100, (player.pos / dur) * 100) : 0;
    const mode = MODES.find((m) => m.k === player.mode) ?? MODES[0];
    const nextMode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    const preview = current?.text || (lyrics && !lyrics.synced ? lyrics.lines.find((l) => l.text)?.text : null);
    return (
        <div className="mp-now">
            {/* the top strip is the sheet's drag handle; its button stays a button */}
            <div className="mp-top" data-sheet-grab>
                <PosterArt player={player} />
                <div className="mp-info">
                    <h3 key={item.key} className="mp-title">
                        {item.title}
                    </h3>
                    <p className="mp-note">
                        {item.artist} · <QualityChip player={player} onQuality={onQuality} />
                    </p>
                </div>
                <button
                    ref={likeRef}
                    type="button"
                    className="ui-icon-button mp-like"
                    aria-pressed={liked}
                    aria-label={
                        liked
                            ? `取消收藏 ${item.title}`
                            : `收藏 ${item.title}${item.library ? '' : '（只存在这台设备）'}`
                    }
                    onClick={(event) => {
                        player.toggleLike(item);
                        if (!liked)
                            burst(event.currentTarget, {
                                glyphs: ['♥', '✦', '♥'],
                                // a look can tint the hearts (porcelain's pink reads on light glass)
                                color:
                                    getComputedStyle(event.currentTarget).getPropertyValue('--mp-heart').trim() ||
                                    '#f5b6c1',
                                count: 7,
                                size: 13
                            });
                    }}
                >
                    <IHeart size={20} fill={liked ? 'currentColor' : 'none'} />
                </button>
                {onClose && (
                    <button
                        type="button"
                        className="ui-icon-button mp-ghost mp-close"
                        aria-label="收起一起听"
                        onClick={onClose}
                    >
                        <IClose size={18} />
                    </button>
                )}
            </div>
            {state.preparing !== null ? (
                <div className="mp-lyric mp-preparing" role="status">
                    <span className="mp-line on">整轨第一次播放，先取到这台设备</span>
                    <span
                        className="mp-prep-bar"
                        style={{ '--p': `${Math.round(state.preparing * 100)}%` } as CSSProperties}
                    >
                        <span />
                    </span>
                </div>
            ) : (
                <button
                    type="button"
                    className="mp-lyric"
                    onClick={onLyrics}
                    aria-label={`沉浸看歌词${preview ? `：${preview}` : ''}`}
                >
                    <span key={`${item.key}-${line}`} className="mp-line on">
                        {preview || (player.lyricsLoading ? '…' : '♪')}
                    </span>
                    {next && lyrics?.synced && (
                        <span key={`${item.key}-${line}-next`} className="mp-line">
                            {next.text}
                        </span>
                    )}
                </button>
            )}
            <label className="mp-progress">
                <span className="ow-sr">播放进度</span>
                <input
                    type="range"
                    min={0}
                    max={Math.max(1, Math.floor(dur / 1000))}
                    step={1}
                    value={Math.floor(player.pos / 1000)}
                    style={{ '--p': `${pct}%` } as CSSProperties}
                    onChange={(event) => player.seek(Number(event.target.value) * 1000)}
                    aria-valuetext={`${spokenTime(player.pos)}，共 ${spokenTime(dur)}`}
                />
            </label>
            <div className="mp-times" aria-hidden="true">
                <span>{musicTime(player.pos)}</span>
                <span>{musicTime(dur)}</span>
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
                <PlayButton player={player} size={26} />
                <button
                    type="button"
                    className="ui-icon-button mp-ghost mp-skip"
                    onClick={player.next}
                    aria-label="下一首"
                >
                    <ISkipF size={24} />
                </button>
                <button type="button" className="ui-icon-button mp-ghost" onClick={onList} aria-label="打开曲库">
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

// Play / pause. Stays pressable while a song loads, so a second tap can still pause it.
function PlayButton({ player, size }: { player: MusicPlayback; size: number }) {
    const busy = player.starting;
    return (
        <button
            type="button"
            className="ui-icon-button ui-button-primary mp-play"
            data-playing={player.playing || undefined}
            data-busy={busy || undefined}
            onClick={() => player.toggle()}
            aria-label={busy ? '正在打开，点按取消' : player.playing ? '暂停' : '播放'}
        >
            <span className="mp-glyph play" aria-hidden="true">
                <IPlay size={size} />
            </span>
            <span className="mp-glyph pause" aria-hidden="true">
                <IPause size={size} />
            </span>
        </button>
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

// Keep the current line in the middle of a scrolling lyrics list.
function useCenteredLine(line: number, key: string) {
    const listRef = useRef<HTMLOListElement>(null);
    useEffect(() => {
        const list = listRef.current;
        const el = list?.querySelector<HTMLElement>('[aria-current="true"]');
        if (!list || !el) return;
        list.scrollTo({
            top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2,
            behavior: motionReduced() ? 'auto' : 'smooth'
        });
    }, [line, key]);
    return listRef;
}

// The words of the sung line light up one by one when the lyrics carry word timing.
function LineText({
    line,
    current,
    posMs,
    offset
}: {
    line: LyricLine;
    current: boolean;
    posMs: number;
    offset: number;
}) {
    if (!current || !line.words?.length) return <>{line.text || '♪'}</>;
    const at = posMs + offset;
    return (
        <>
            {line.words.map((w, i) => (
                <span key={i} className="mp-word" data-on={w.start <= at || undefined}>
                    {w.text}
                </span>
            ))}
        </>
    );
}

// Every line; tap a timed one to jump there. Plain-text lyrics simply list their lines.
function LyricLines({ player, doc, line }: { player: MusicPlayback; doc: LyricDoc; line: number }) {
    return doc.lines.map((l, i) => (
        <li key={`${player.item.key}-${i}`}>
            <button
                type="button"
                aria-current={i === line || undefined}
                data-past={i < line || undefined}
                disabled={l.start === null}
                onClick={() => l.start !== null && player.seek(Math.max(0, l.start - doc.offset))}
                title={l.start !== null ? `跳到 ${musicTime(l.start)}` : undefined}
            >
                <LineText line={l} current={i === line} posMs={player.pos} offset={doc.offset} />
                {l.translation && <span className="mp-trans">{l.translation}</span>}
            </button>
        </li>
    ));
}

// What the lyrics tab and the immersion say when a song has no lyrics.
function NoLyrics({ player }: { player: MusicPlayback }) {
    return (
        <p className="mp-empty mp-no-lyrics">
            {player.lyricsLoading ? '正在取歌词…' : '这首歌还没有歌词。上传时带上同名的 .lrc，或以后在这里粘贴。'}
        </p>
    );
}

function LyricsView({ player, onImmersive }: { player: MusicPlayback; onImmersive: () => void }) {
    const { lyrics, item } = player;
    const line = lyrics ? lyricLineAt(lyrics, player.pos) : -1;
    const listRef = useCenteredLine(line, item.key);
    return (
        <div className="mp-lyrics-wrap">
            {lyrics ? (
                <ol
                    ref={listRef}
                    className="mp-lyrics"
                    data-plain={!lyrics.synced || undefined}
                    aria-label={`${item.title} 的歌词`}
                >
                    <LyricLines player={player} doc={lyrics} line={line} />
                </ol>
            ) : (
                <NoLyrics player={player} />
            )}
            <button type="button" className="ui-icon-button mp-immerse" aria-label="沉浸看歌词" onClick={onImmersive}>
                <IExpand size={18} />
            </button>
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
    const { item, lyrics, state } = player;
    const line = lyrics ? lyricLineAt(lyrics, player.pos) : -1;
    const listRef = useCenteredLine(line, item.key);
    const dur = state.durationMs || item.durationMs;
    const pct = dur ? Math.min(100, (player.pos / dur) * 100) : 0;
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
            {item.poster ? (
                <img
                    key={item.key}
                    className="mp-imm-bg"
                    src={item.poster}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                />
            ) : (
                <span key={item.key} className="mp-imm-bg" style={{ background: item.tint }} aria-hidden="true" />
            )}
            <header className="mp-imm-hd" data-sheet-grab>
                <Cover item={item} className="mp-imm-art" small />
                <div className="mp-info">
                    <h3 key={item.key} className="mp-title">
                        {item.title}
                    </h3>
                    <p className="mp-note">{item.artist}</p>
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
            {lyrics ? (
                <ol
                    ref={listRef}
                    className="mp-lyrics mp-imm-lines"
                    data-plain={!lyrics.synced || undefined}
                    aria-label={`${item.title} 的歌词`}
                >
                    <LyricLines player={player} doc={lyrics} line={line} />
                </ol>
            ) : (
                <div className="mp-imm-lines mp-lyrics">
                    <NoLyrics player={player} />
                </div>
            )}
            <footer className="mp-imm-ft">
                <label className="mp-progress">
                    <span className="ow-sr">播放进度</span>
                    <input
                        type="range"
                        min={0}
                        max={Math.max(1, Math.floor(dur / 1000))}
                        step={1}
                        value={Math.floor(player.pos / 1000)}
                        style={{ '--p': `${pct}%` } as CSSProperties}
                        onChange={(event) => player.seek(Number(event.target.value) * 1000)}
                        aria-valuetext={`${spokenTime(player.pos)}，共 ${spokenTime(dur)}`}
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
                    <PlayButton player={player} size={24} />
                    <button
                        type="button"
                        className="ui-icon-button mp-ghost mp-skip"
                        onClick={player.next}
                        aria-label="下一首"
                    >
                        <ISkipF size={22} />
                    </button>
                    <span className="mp-imm-time" aria-hidden="true">
                        {musicTime(dur)}
                    </span>
                </div>
            </footer>
        </div>
    );
}

// Volume, mute, play order, loudness, and the honest notes about where the sound plays and where
// the files live.
function SoundView({ player }: { player: MusicPlayback }) {
    const { state } = player;
    const music = player.usage?.find((u) => u.bucket === 'music');
    const cloud = player.usage?.reduce((sum, u) => sum + u.bytes, 0) ?? null;
    useEffect(() => {
        player.refreshUsage();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once when the tab opens
    }, []);
    return (
        <div className="mp-sound">
            {state.volumeLocked ? (
                <p className="mp-note">iPhone 上用侧边的音量键调音量。</p>
            ) : (
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
            )}
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
            <label className="mp-switch">
                <input
                    type="checkbox"
                    checked={state.loudness}
                    disabled={state.volumeLocked}
                    onChange={(event) => player.setLoudness(event.target.checked)}
                />
                <span>
                    <b>响度平衡</b>
                    <small>
                        {state.volumeLocked
                            ? 'iPhone 上网页改不了音量，这一项不起作用'
                            : '比参考响度大的歌调小一点，从不调大（按歌曲里的 ReplayGain 标签）'}
                    </small>
                </span>
            </label>
            <div className="mp-meters">
                {cloud !== null && (
                    <p>
                        云端已用 <b>{formatBytes(cloud)}</b> / 1 GB（Free 计划，含照片）
                        {music ? ` · 音乐 ${formatBytes(music.bytes)}` : ''}
                    </p>
                )}
                {player.device && <p>这台设备为本站存了 {formatBytes(player.device.usage)}（离线下载与整轨缓存）</p>}
            </div>
            <p className="mp-note">在这台设备播放，不与对方同步。原件按原样播放，不经过任何转码。</p>
        </div>
    );
}
