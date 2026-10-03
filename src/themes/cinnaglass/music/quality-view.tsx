// The quality page of the song that plays: which version plays (自动 / 原件 / 省流, chosen per song
// on this device — useful on mobile data), the signal path told honestly (source → decode →
// processing → output), and keeping either version on this device for offline listening.
// Feature doc: ai/features/music/music.md §二 音质原则 (如实标注) and §界面.
import { useEffect, useState } from 'react';
import { formatBytes, formatLabel } from '@/lib/music/quality';
import type { VersionChoice } from '@/lib/music/sources';
import { ICheck, IChevron, IClose, IDownload } from '@/themes/cinnaglass/icons';
import { badgeText } from '@/themes/cinnaglass/music/music-model';
import type { MusicPlayback } from '@/themes/cinnaglass/music/use-music';
import type { MusicRendition } from '@/types/music';

// The rate the system mixes at (every web player is resampled to it), read once.
const useOutputRate = (): number | null => {
    const [rate] = useState<number | null>(() => {
        const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        try {
            const ctx = new Ctor();
            const value = ctx.sampleRate;
            void ctx.close().catch(() => {});
            return value;
        } catch {
            return null;
        }
    });
    return rate;
};

const describe = (r: MusicRendition): string =>
    `${formatLabel(r)}${r.channels && r.channels !== 2 ? ` · ${r.channels} 声道` : ''} · ${formatBytes(r.sizeBytes)}`;

export function QualityView({
    player,
    onBack,
    onClose
}: {
    player: MusicPlayback;
    onBack: () => void;
    onClose?: () => void;
}) {
    const { item, state } = player;
    const rate = useOutputRate();
    const v = player.versions(item);
    const choice = player.choiceOf(item);
    const playing =
        v &&
        (state.version === 'compact' ? v.compact : v.original && v.playable.has('original') ? v.original : v.lossless);
    const iphone = /iPhone|iPad/.test(navigator.userAgent);
    useEffect(() => {
        if (!item.library) onBack();
    }, [item.library, onBack]);

    const choices: { k: VersionChoice; label: string; note: string; disabled: boolean }[] = v
        ? [
              {
                  k: 'auto',
                  label: '自动',
                  note: player.metered
                      ? '现在在用流量 → 省流版'
                      : iphone
                        ? 'iPhone 网页看不出在不在用流量，默认放原件'
                        : 'Wi-Fi 放原件，流量放省流版',
                  disabled: false
              },
              {
                  k: 'original',
                  label: '原件',
                  note: v.original ? describe(v.original) : '没有原件',
                  disabled: !(v.playable.has('original') || v.playable.has('lossless'))
              },
              {
                  k: 'compact',
                  label: '省流',
                  note: v.compact ? describe(v.compact) : '还没有省流版',
                  disabled: !v.compact || !v.playable.has('lossy')
              }
          ]
        : [];

    const lossless = playing?.lossless ?? false;
    const processing = state.loudness && item.library?.gain?.track_gain != null && !state.volumeLocked;
    const verdict = !playing
        ? '这首歌在这台设备上放不了。'
        : playing.kind === 'lossy'
          ? '省流播放：有损压缩，省流量，听感接近原件。'
          : lossless
            ? processing
                ? '无损来源；为了响度平衡把音量调小了一点（只调音量，不改声音）。'
                : '无损播放：全程没有有损环节。'
            : '原件本身是有损格式，按原样播放，没有再压缩。';

    return (
        <div className="mp-quality">
            <header className="mp-subhead" data-sheet-grab>
                <button
                    type="button"
                    className="ui-icon-button mp-ghost mp-back"
                    aria-label="回到播放器"
                    onClick={onBack}
                >
                    <IChevron size={18} />
                </button>
                <h3>这首歌的音质</h3>
                {onClose && (
                    <button type="button" className="ui-icon-button mp-ghost" aria-label="收起播放器" onClick={onClose}>
                        <IClose size={18} />
                    </button>
                )}
            </header>
            <p className="mp-note mp-quality-title">
                {item.title} · {item.artist}
                {badgeText(item.badge) ? ` · ${badgeText(item.badge)}` : ''}
            </p>
            {v && (
                <div className="mp-versions" role="radiogroup" aria-label="这首歌放哪个版本">
                    {choices.map((c) => (
                        <button
                            key={c.k}
                            type="button"
                            role="radio"
                            aria-checked={choice === c.k}
                            disabled={c.disabled}
                            onClick={() => player.setChoice(item, c.k)}
                        >
                            <b>{c.label}</b>
                            <small>{c.note}</small>
                        </button>
                    ))}
                </div>
            )}
            <dl className="mp-path">
                <div>
                    <dt>来源</dt>
                    <dd>
                        {playing ? describe(playing) : '—'}
                        {playing ? (playing.kind === 'lossy' ? ' · 省流版' : ' · 原件') : ''}
                        {state.local ? ' · 从这台设备' : ' · 在线播放'}
                    </dd>
                </div>
                <div>
                    <dt>解码</dt>
                    <dd>{lossless ? '浏览器解码，无损' : '浏览器解码（有损格式）'}</dd>
                </div>
                <div>
                    <dt>处理</dt>
                    <dd>
                        {processing
                            ? `响度平衡：音量调小 ${Math.abs(item.library?.gain?.track_gain ?? 0).toFixed(1)} dB`
                            : '无 · 原样输出'}
                        {item.slice ? ` · 整轨中的第 ${item.slice} 段，和前后无缝相接` : ''}
                    </dd>
                </div>
                <div>
                    <dt>输出</dt>
                    <dd>
                        系统混音器{rate ? ` ${rate.toLocaleString()} Hz` : ''}
                        {rate && playing?.sampleRate && rate !== playing.sampleRate ? '（由系统重采样）' : ''}
                    </dd>
                </div>
            </dl>
            <p className="mp-verdict">{verdict}</p>
            <p className="mp-note">网页受系统混音器限制，做不到比特完美；以后的桌面版可以独占输出。</p>
            {v && (
                <div className="mp-offline">
                    <h4 className="mp-section">离线听</h4>
                    {[v.original ?? v.lossless, v.compact].map((r) => {
                        if (!r) return null;
                        const local = v.local.has(r.path);
                        const job = player.downloads[r.path];
                        const label = r.kind === 'lossy' ? '省流版' : '原件';
                        return (
                            <button
                                key={r.path}
                                type="button"
                                className="mp-act"
                                disabled={!!job && !job.error}
                                onClick={() =>
                                    local
                                        ? void player.forget(r.path)
                                        : void player.download(item, r.kind === 'lossy' ? 'compact' : 'original')
                                }
                            >
                                {local ? <ICheck size={16} /> : <IDownload size={16} />}
                                <span>
                                    {local
                                        ? `${label}已存在这台设备 · 点按删除`
                                        : job && !job.error
                                          ? `正在下载${label} ${Math.round(job.fraction * 100)}%`
                                          : `把${label}存到这台设备`}
                                    <small>
                                        {describe(r)}
                                        {job?.error ? ` · ${job.error}` : ''}
                                    </small>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
