// The expanded player is a view of the mini player's local audio transport.
import { IMute, IPause, IPlay, ISkipB, ISkipF, IVolume } from '@/themes/cinnaglass/icons';
import { musicTime, type MusicPlayback } from '@/themes/cinnaglass/use-music-playback';
import '@/themes/cinnaglass/music.css';

// Keep playback controls independent of disclosure, with real state and keyboard seeking.
export function MusicPlayer({ player, spaceName }: { player: MusicPlayback; spaceName?: string }) {
    return (
        <section className="mp ui-surface" aria-label="音乐播放器">
            <header className="mp-top">
                <img className="mp-cover" src="/ui/disc-cover.png" alt="" draggable={false} />
                <div className="mp-info">
                    <h2 className="mp-title">{player.track.title}</h2>
                    <p className="mp-note">{spaceName || '我们的房间'} · 本机合成音景</p>
                </div>
            </header>
            <div className="mp-body ui-liner">
                <label className="mp-progress">
                    <span className="mp-label">音景进度</span>
                    <input
                        type="range"
                        min={0}
                        max={player.track.dur}
                        step={1}
                        value={Math.floor(player.pos)}
                        onChange={(event) => player.seek(Number(event.target.value))}
                        aria-valuetext={`${musicTime(player.pos)}，总时长 ${musicTime(player.track.dur)}`}
                    />
                </label>
                <div className="mp-times" aria-hidden="true">
                    <span>{musicTime(player.pos)}</span>
                    <span>{musicTime(player.track.dur)}</span>
                </div>
                <div className="mp-transport">
                    <button type="button" className="ui-icon-button" onClick={player.prev} aria-label="上一首">
                        <ISkipB size={22} />
                    </button>
                    <button
                        type="button"
                        className="ui-icon-button ui-button-primary mp-play"
                        onClick={() => void player.toggle()}
                        disabled={player.starting}
                        aria-label={player.playing ? '暂停' : '播放'}
                    >
                        {player.playing ? <IPause size={21} /> : <IPlay size={21} />}
                    </button>
                    <button type="button" className="ui-icon-button" onClick={player.next} aria-label="下一首">
                        <ISkipF size={22} />
                    </button>
                </div>
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
                        onChange={(event) => player.setVolume(Number(event.target.value))}
                        aria-label="音量"
                        aria-valuetext={`${player.volume}%${player.muted ? '，当前静音' : ''}`}
                    />
                    <span>{player.volume}%</span>
                </div>
                <label className="mp-mode">
                    <span>播放方式</span>
                    <select
                        className="ui-field"
                        value={player.mode}
                        onChange={(event) => player.setMode(event.target.value as MusicPlayback['mode'])}
                    >
                        <option value="list">列表循环</option>
                        <option value="repeat">单曲循环</option>
                        <option value="shuffle">随机播放</option>
                    </select>
                </label>
                <p className="mp-note">在这台设备播放，不与对方同步。</p>
            </div>
        </section>
    );
}
