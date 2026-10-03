// The 曲库 tab (concept V3, the quiet list): search and filter on top, one row per song with its
// format, then the built-in soundscapes. Ownership is a filter, not another tree (我传的 / TA 传的).
// A row's ⋯ opens its actions in place: keep it on this device, its compact copy, who can see it,
// delete. Feature doc: ai/features/music/music.md §界面.
import { useMemo, useState, type CSSProperties } from 'react';
import { formatBytes } from '@/lib/music/quality';
import { ICheck, IDownload, IHeart, ILock, IMore, ISearch, ITrash, IUpload, IUsers } from '@/themes/cinnaglass/icons';
import { Cover } from '@/themes/cinnaglass/music/cover';
import { musicTime, type MusicItem } from '@/themes/cinnaglass/music/music-model';
import type { MusicPlayback } from '@/themes/cinnaglass/music/use-music';

type Filter = 'all' | 'mine' | 'theirs' | 'liked' | 'offline' | 'builtin';

// Lower-case, no spaces: 雨天 matches "雨 天", "Lo-fi" matches "lofi".
const fold = (text: string) => text.toLowerCase().replace(/[\s\-_·.]/g, '');

export function LibraryView({
    player,
    onUpload,
    uploading
}: {
    player: MusicPlayback;
    onUpload: () => void;
    uploading: boolean;
}) {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [open, setOpen] = useState<string | null>(null);
    const { library, builtins, me } = player;
    const offlineKeys = useMemo(() => {
        const keys = new Set<string>();
        for (const item of library) {
            const v = player.versions(item);
            if (v?.local.size) keys.add(item.key);
        }
        return keys;
    }, [library, player]);
    const q = fold(query);
    const match = (item: MusicItem) => !q || fold(`${item.title}${item.artist}${item.album ?? ''}`).includes(q);
    const songs = library.filter((item) => {
        if (!match(item)) return false;
        if (filter === 'mine') return item.library?.ownerId === me;
        if (filter === 'theirs') return item.library?.ownerId !== me;
        if (filter === 'liked') return player.isLiked(item);
        if (filter === 'offline') return offlineKeys.has(item.key);
        return filter !== 'builtin';
    });
    const soundscapes =
        filter === 'all' || filter === 'builtin' || (filter === 'liked' && !library.length)
            ? builtins.filter((b) => match(b) && (filter !== 'liked' || player.isLiked(b)))
            : [];
    const chips: { k: Filter; label: string; n?: number }[] = [
        { k: 'all', label: '全部', n: library.length },
        { k: 'mine', label: '我传的' },
        { k: 'theirs', label: 'TA 传的' },
        { k: 'liked', label: '收藏' },
        { k: 'offline', label: '已下载', n: offlineKeys.size || undefined },
        { k: 'builtin', label: '本机音景', n: builtins.length }
    ];

    return (
        <div className="mp-list mp-library">
            <div className="mp-libbar">
                <label className="mp-search">
                    <ISearch size={16} />
                    <input
                        type="search"
                        value={query}
                        placeholder="搜歌名、歌手或专辑"
                        aria-label="搜索曲库"
                        enterKeyHint="search"
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </label>
                <button
                    type="button"
                    className="ui-button mp-upload-btn"
                    onClick={onUpload}
                    data-busy={uploading || undefined}
                >
                    <IUpload size={17} />
                    {uploading ? '上传中' : '上传'}
                </button>
            </div>
            <div className="mp-chips mp-chips-scroll" role="group" aria-label="筛选曲库">
                {chips.map((c) => (
                    <button
                        key={c.k}
                        type="button"
                        className="mp-chip"
                        aria-pressed={filter === c.k}
                        onClick={() => setFilter(c.k)}
                    >
                        {c.label}
                        {c.n !== undefined ? ` ${c.n}` : ''}
                    </button>
                ))}
            </div>
            {player.libraryState === 'loading' && !library.length && <p className="mp-empty">正在载入曲库…</p>}
            {player.libraryState === 'error' && (
                <p className="mp-empty" role="alert">
                    {player.libraryError ?? '曲库没能载入。'}{' '}
                    <button type="button" className="mp-link" onClick={() => void player.reload()}>
                        再试一次
                    </button>
                </p>
            )}
            {player.libraryState === 'ready' && !library.length && filter !== 'builtin' && (
                <div className="mp-hero">
                    <b>还没有上传的歌</b>
                    <p>把电脑或手机里的歌传上来，原件原样保存，你们两个都能听。歌词和封面会一起带上。</p>
                    <button type="button" className="ui-button ui-button-primary" onClick={onUpload}>
                        <IUpload size={17} />
                        上传第一首
                    </button>
                </div>
            )}
            {songs.length > 0 && (
                <ul aria-label="曲库">
                    {songs.map((item, k) => (
                        <SongRow
                            key={item.key}
                            item={item}
                            k={k}
                            player={player}
                            open={open === item.key}
                            onMenu={() => setOpen(open === item.key ? null : item.key)}
                            offline={offlineKeys.has(item.key)}
                        />
                    ))}
                </ul>
            )}
            {library.length > 0 && !songs.length && filter !== 'builtin' && (
                <p className="mp-empty">{q ? '没有找到这首。' : '这里还是空的。'}</p>
            )}
            {soundscapes.length > 0 && (
                <>
                    {filter === 'all' && <h4 className="mp-section">本机音景 · 不占流量，随时能放</h4>}
                    <ul aria-label="本机音景">
                        {soundscapes.map((item, k) => (
                            <SongRow
                                key={item.key}
                                item={item}
                                k={k + songs.length}
                                player={player}
                                open={false}
                                offline={false}
                            />
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

function SongRow({
    item,
    k,
    player,
    open,
    onMenu,
    offline
}: {
    item: MusicItem;
    k: number;
    player: MusicPlayback;
    open: boolean;
    onMenu?: () => void;
    offline: boolean;
}) {
    const current = player.item.key === item.key;
    const liked = player.isLiked(item);
    const mine = item.library?.ownerId === player.me;
    return (
        <li style={{ '--k': Math.min(k, 12) } as CSSProperties} data-open={open || undefined}>
            <div className="mp-lrow">
                <button
                    type="button"
                    className="mp-row"
                    aria-current={current || undefined}
                    onClick={() => (current ? player.toggle() : player.play(item))}
                    aria-label={`${item.title}，${item.artist}${current ? (player.playing ? '，正在播放，点按暂停' : '，已暂停，点按继续') : ''}`}
                >
                    <Cover item={item} className="mp-row-cover" small />
                    <span className="mp-row-text">
                        <b>{item.title}</b>
                        <span>
                            {item.artist}
                            {item.library && (
                                <>
                                    {' · '}
                                    <i className="mp-fmt" data-badge={item.badge ?? undefined}>
                                        {item.badge === 'hires' ? 'Hi-Res · ' : ''}
                                        {item.formatLabel}
                                    </i>
                                </>
                            )}
                            {item.slice ? ` · 整轨第 ${item.slice} 段` : ''}
                        </span>
                    </span>
                    <span className="mp-row-marks" aria-hidden="true">
                        {item.library?.visibility === 'private' && <ILock size={13} />}
                        {offline && <IDownload size={13} />}
                        {liked && <IHeart size={12} fill="currentColor" sw={0} />}
                    </span>
                    {current && player.playing ? (
                        <span className="mp-eq" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                        </span>
                    ) : (
                        <span className="mp-dur">{musicTime(item.durationMs)}</span>
                    )}
                </button>
                {onMenu && item.library && (
                    <button
                        type="button"
                        className="ui-icon-button mp-ghost mp-more"
                        aria-label={`${item.title} 的更多操作`}
                        aria-expanded={open}
                        onClick={onMenu}
                    >
                        <IMore size={18} />
                    </button>
                )}
            </div>
            {open && item.library && <RowActions item={item} player={player} mine={mine} />}
        </li>
    );
}

// What can be done with one song, right under its row.
function RowActions({ item, player, mine }: { item: MusicItem; player: MusicPlayback; mine: boolean }) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const v = player.versions(item);
    if (!v || !item.library) return null;
    const full = v.original ?? v.lossless;
    const run = async (name: string, act: () => Promise<void>) => {
        setBusy(name);
        try {
            await act();
        } finally {
            setBusy(null);
        }
    };
    const job = (path: string | undefined) => (path ? player.downloads[path] : undefined);
    const offlineButton = (label: string, kind: 'original' | 'compact', r: typeof full) => {
        if (!r) return null;
        const local = v.local.has(r.path);
        const progress = job(r.path);
        return (
            <button
                type="button"
                className="mp-act"
                disabled={!!progress && !progress.error}
                onClick={() => (local ? void player.forget(r.path) : void player.download(item, kind))}
            >
                {local ? <ICheck size={16} /> : <IDownload size={16} />}
                <span>
                    {local
                        ? `已存在这台设备 · 删除${label}`
                        : progress && !progress.error
                          ? `正在下载${label} ${Math.round(progress.fraction * 100)}%`
                          : `下载${label}到这台设备`}
                    <small>
                        {r.kind === 'lossy'
                            ? `${r.codec.toUpperCase()} ${Math.round((r.bitrate ?? 0) / 1000)}`
                            : item.formatLabel}{' '}
                        · {formatBytes(r.sizeBytes)}
                        {r.partCount ? ' · 整轨' : ''}
                        {progress?.error ? ` · ${progress.error}` : ''}
                    </small>
                </span>
            </button>
        );
    };
    return (
        <div className="mp-actions" role="group" aria-label={`${item.title} 的操作`}>
            {offlineButton('原件', 'original', full)}
            {v.compact ? offlineButton('省流版', 'compact', v.compact) : <p className="mp-act-note">还没有省流版</p>}
            {mine && (
                <button
                    type="button"
                    className="mp-act"
                    disabled={busy === 'vis'}
                    onClick={() =>
                        void run('vis', () =>
                            player.setVisibility(item, item.library?.visibility === 'world' ? 'private' : 'world')
                        )
                    }
                >
                    {item.library.visibility === 'world' ? <ILock size={16} /> : <IUsers size={16} />}
                    <span>
                        {item.library.visibility === 'world' ? '改成仅自己可见' : '改成两个人都能听'}
                        <small>
                            {item.library.visibility === 'world' ? 'TA 的曲库里会看不到这首' : '现在只有你能看到'}
                        </small>
                    </span>
                </button>
            )}
            {mine && (
                <button
                    type="button"
                    className="mp-act mp-act-danger"
                    disabled={busy === 'del'}
                    onClick={() => (confirmDelete ? void run('del', () => player.trash(item)) : setConfirmDelete(true))}
                >
                    <ITrash size={16} />
                    <span>
                        {confirmDelete ? '再点一次，从曲库删除' : '从曲库删除'}
                        <small>只从曲库里拿掉，原件暂时还留在云端</small>
                    </span>
                </button>
            )}
        </div>
    );
}
