// M1 review surface. Production room, navigation and ambience are reused unchanged;
// the other views are local interaction prototypes and never call account/data APIs.
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { RoomScene } from '@/themes/cinnaglass/room/room-scene';
import { Rail } from '@/themes/cinnaglass/shell/rail';
import { Ambience } from '@/themes/cinnaglass/shell/ambience';
import { IClose, IChevron, ISend, IPlay, IChat, IVolume } from '@/themes/cinnaglass/icons';
import { RailSettings as ISettings } from '@/themes/cinnaglass/shell/rail-icons';
import type { Mood, WeatherTweak } from '@/themes/cinnaglass/tweaks';
import '@/themes/cinnaglass/cinnaglass.css';
import './standard-board.css';

// Compare only the dialog material; the controls and content stay identical.
type Surface = 'grounded' | 'glass';
const MOODS: { key: Mood; label: string }[] = [
    { key: 'golden', label: '黄昏' },
    { key: 'twilight', label: '暮色' },
    { key: 'night', label: '夜晚' }
];

// Keep short-screen docking tied to the approved navigation breakpoint.
function useCompactScreen() {
    const [compact, setCompact] = useState(() => matchMedia('(max-width: 767px), (max-height: 599px)').matches);
    useEffect(() => {
        const query = matchMedia('(max-width: 767px), (max-height: 599px)');
        const update = () => setCompact(query.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return compact;
}

// A single scene keeps comparisons spatially stable when switching materials.
export function StandardBoard() {
    const [mood, setMood] = useState<Mood>('twilight');
    const [wx, setWx] = useState<WeatherTweak>('sun');
    const [surface, setSurface] = useState<Surface>('grounded');
    const [solid, setSolid] = useState(false);
    const [largeText, setLargeText] = useState(false);
    const compact = useCompactScreen();
    const [chatOpen, setChatOpen] = useState(() => !matchMedia('(max-width: 767px), (max-height: 599px)').matches);
    const [musicOpen, setMusicOpen] = useState(false);
    const [musicVisible, setMusicVisible] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [messages, setMessages] = useState<string[]>([]);
    const [nickname, setNickname] = useState('小蓝');
    const [volume, setVolume] = useState(35);
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle');
    const [notice, setNotice] = useState('M1 提案 · 本页数据与天气仅作预览');
    const boardRef = useRef<HTMLElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogTitleRef = useRef<HTMLHeadingElement>(null);
    const messageListRef = useRef<HTMLDivElement>(null);

    // Read the actual rail palette once per mood, never on every scene frame.
    useEffect(() => {
        const board = boardRef.current;
        const rail = board?.querySelector('.rail-wrap');
        if (!board || !rail) return;
        const palette = getComputedStyle(rail);
        for (const token of ['tint', 'top', 'cold', 'rim', 'glow', 'solid']) {
            board.style.setProperty(`--sb-${token}`, palette.getPropertyValue(`--nav-${token}`));
        }
    }, [mood]);

    // Native modal behavior supplies background inertness, Escape and focus return.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (settingsOpen && !dialog.open) {
            dialog.showModal();
            dialogTitleRef.current?.focus();
        } else if (!settingsOpen && dialog.open) {
            dialog.close();
        }
    }, [settingsOpen]);

    // Preserve the visible message tail without storing any account data.
    useEffect(() => {
        const list = messageListRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [messages, chatOpen]);

    // Opening one expanded floater dismisses the other on compact screens.
    const showChat = () => {
        setChatOpen((open) => !open);
        if (compact) setMusicOpen(false);
    };
    const showMusic = () => {
        setMusicVisible(true);
        setMusicOpen((open) => !open);
        if (compact) setChatOpen(false);
    };
    // The local composer models sending while explicitly avoiding a real recipient.
    const sendPreview = (event: FormEvent) => {
        event.preventDefault();
        if (!draft.trim()) return;
        setMessages((items) => [...items, draft.trim()]);
        setDraft('');
    };

    return (
        <main
            ref={boardRef}
            className="sb-board"
            data-mood={mood}
            data-surface={surface}
            data-solid={solid}
            data-large-text={largeText}
            data-chat-open={chatOpen}
        >
            <header className="sb-workbench">
                <div className="sb-brand">
                    <span className="sb-mark">C</span>
                    <div>
                        <b>Cinnaglass</b>
                        <small>01 / UI 统一标准板 · 待确认</small>
                    </div>
                </div>
                <div className="sb-workbench-controls">
                    <label>
                        环境
                        <select aria-label="预览时辰" value={mood} onChange={(e) => setMood(e.target.value as Mood)}>
                            {MOODS.map(({ key, label }) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        材质
                        <select
                            aria-label="弹窗材质方案"
                            value={surface}
                            onChange={(e) => setSurface(e.target.value as Surface)}
                        >
                            <option value="grounded">B2 · 稳定内容底（推荐）</option>
                            <option value="glass">B1 · 全磨砂</option>
                        </select>
                    </label>
                    <button className="sb-button sb-primary" onClick={() => setSettingsOpen(true)}>
                        <ISettings size={17} />
                        打开设置
                    </button>
                    <a href="material-comparison.html" className="sb-doc-link">
                        并排看区别 ↗
                    </a>
                </div>
            </header>
            <section className="sb-stage" aria-label="真实房间与 UI 样板">
                <RoomScene
                    mood={mood}
                    weatherKind={wx === 'rain' ? 'rain' : 'sun'}
                    onHotspot={() => setNotice('本轮只预览 A/B 界面，物件与日记保持现状。')}
                />
                <Rail
                    unread={false}
                    activeRoom="study"
                    onRoom={() => setNotice('当前预览书房，其他房间尚未开放。')}
                    onAction={(key) => {
                        if (key === 'settings') setSettingsOpen(true);
                        else if (key === 'chat') showChat();
                        else if (key === 'music') showMusic();
                        else setNotice('此入口保留在产品中，本标准板仅展示天气、聊天、音乐和设置。');
                    }}
                    widgets={{ music: musicVisible, anniversary: false, presence: false }}
                    setWidget={(key, value) => {
                        if (key === 'music') setMusicVisible(value);
                        else setNotice('其他浮窗将在后续批次采用本页确定的材质。');
                    }}
                    onLeaveWorld={() => setNotice('这是独立预览，不会退出你的实际房间。')}
                />
                <Ambience mood={mood} setMood={setMood} wx={wx} setWx={setWx} />
                <div className="sb-scene-note" role="status">
                    {notice}
                </div>
                {chatOpen && (
                    <section className="sb-chat sb-surface" aria-label="聊天样板">
                        <header className="sb-widget-heading">
                            <div>
                                <IChat size={17} />
                                <b>慢慢聊</b>
                                <span className="sb-badge">仅本页</span>
                            </div>
                            <button className="sb-icon-button" aria-label="收起聊天" onClick={() => setChatOpen(false)}>
                                <IClose size={17} />
                            </button>
                        </header>
                        <div className="sb-messages" ref={messageListRef}>
                            <p className="sb-time">对话示例</p>
                            <div className="sb-message">
                                <span className="sb-avatar sb-pink">她</span>
                                <p>
                                    今天的晚霞很好看，
                                    <br />
                                    陪我再坐一会儿吧。
                                </p>
                            </div>
                            <div className="sb-message sb-mine">
                                <span className="sb-avatar sb-blue">我</span>
                                <p>好呀，我就在这里。</p>
                            </div>
                            {messages.map((text, index) => (
                                <div className="sb-message sb-mine" key={index}>
                                    <span className="sb-avatar sb-blue">我</span>
                                    <p>{text}</p>
                                </div>
                            ))}
                        </div>
                        <form className="sb-composer" onSubmit={sendPreview}>
                            <label className="sb-sr-only" htmlFor="sb-chat-input">
                                预览消息
                            </label>
                            <input
                                id="sb-chat-input"
                                placeholder="写点什么…"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                            />
                            <button className="sb-icon-button" aria-label="发送到本页预览" disabled={!draft.trim()}>
                                <ISend size={19} />
                            </button>
                        </form>
                    </section>
                )}
                {musicVisible && (
                    <section className="sb-music sb-surface" data-expanded={musicOpen} aria-label="音乐样板">
                        <div className="sb-music-main">
                            <img className="sb-disc" src="/ui/disc-cover.png" alt="唱片封面示例" />
                            <div className="sb-track-text">
                                <b>窗边的一首歌</b>
                                <small>播放器样板 · 未连接音频</small>
                            </div>
                            <button className="sb-icon-button" disabled aria-label="播放（预览未连接音频）">
                                <IPlay size={20} />
                            </button>
                            <button
                                className="sb-icon-button"
                                aria-label={musicOpen ? '收起音乐' : '展开音乐'}
                                aria-expanded={musicOpen}
                                onClick={showMusic}
                            >
                                <IChevron
                                    size={17}
                                    style={{ transform: musicOpen ? 'rotate(90deg)' : 'rotate(-90deg)' }}
                                />
                            </button>
                        </div>
                        {musicOpen && (
                            <div className="sb-music-details">
                                <label htmlFor="sb-volume">
                                    <IVolume size={17} />
                                    音量示例<span>{volume}%</span>
                                </label>
                                <input
                                    id="sb-volume"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={(e) => setVolume(Number(e.target.value))}
                                />
                                <p>只演示布局与控件状态；不会播放或写入音乐偏好。</p>
                                <button className="sb-button" onClick={() => setMusicVisible(false)}>
                                    隐藏播放器
                                </button>
                            </div>
                        )}
                    </section>
                )}
                <button
                    className="sb-chat-launch sb-surface"
                    aria-label="切换聊天预览"
                    aria-expanded={chatOpen}
                    onClick={showChat}
                >
                    <IChat size={19} />
                    聊天
                </button>
            </section>
            <dialog
                ref={dialogRef}
                className="sb-dialog sb-surface"
                aria-labelledby="sb-settings-title"
                aria-describedby="sb-settings-note"
                onClose={() => setSettingsOpen(false)}
            >
                <header className="sb-dialog-header">
                    <div>
                        <p className="sb-eyebrow">留一点安静给自己</p>
                        <h1 id="sb-settings-title" ref={dialogTitleRef} tabIndex={-1}>
                            设置
                        </h1>
                    </div>
                    <button className="sb-icon-button" aria-label="关闭设置" onClick={() => setSettingsOpen(false)}>
                        <IClose size={20} />
                    </button>
                </header>
                <div className="sb-comparison-controls">
                    <label>
                        对比材质
                        <select
                            aria-label="设置内材质方案"
                            value={surface}
                            onChange={(e) => setSurface(e.target.value as Surface)}
                        >
                            <option value="grounded">B2 稳定内容底</option>
                            <option value="glass">B1 全磨砂</option>
                        </select>
                    </label>
                    <label>
                        时辰
                        <select aria-label="设置内时辰" value={mood} onChange={(e) => setMood(e.target.value as Mood)}>
                            {MOODS.map(({ key, label }) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="sb-dialog-content">
                    <section className="sb-settings-group">
                        <h2>个人资料</h2>
                        <label className="sb-field-label" htmlFor="sb-nickname">
                            我的称呼
                        </label>
                        <input
                            id="sb-nickname"
                            className="sb-field"
                            value={nickname}
                            onChange={(e) => {
                                setNickname(e.target.value);
                                setSaveState('idle');
                            }}
                            maxLength={30}
                        />
                        <p className="sb-help">只在这份样板中保留，不修改真实昵称。</p>
                    </section>
                    <section className="sb-settings-group">
                        <h2>外观与阅读</h2>
                        <label className="sb-setting-row">
                            <span>
                                <b>减少透明效果</b>
                                <small>用稳定底色降低场景干扰</small>
                            </span>
                            <input
                                className="sb-switch"
                                type="checkbox"
                                checked={solid}
                                onChange={(e) => setSolid(e.target.checked)}
                            />
                        </label>
                        <label className="sb-setting-row">
                            <span>
                                <b>宽松文字</b>
                                <small>增加字号与行距，保持操作可达</small>
                            </span>
                            <input
                                className="sb-switch"
                                type="checkbox"
                                checked={largeText}
                                onChange={(e) => setLargeText(e.target.checked)}
                            />
                        </label>
                    </section>
                    <p id="sb-settings-note" className="sb-help">
                        交互样板：Esc 或关闭按钮收起，输入仍保留；关闭后焦点回到入口。
                    </p>
                    <p className="sb-save-message" role="status" data-state={saveState}>
                        {saveState === 'failed'
                            ? '未能应用，输入已保留。可以重试。'
                            : saveState === 'saved'
                              ? '已应用到本页预览。'
                              : '此页不会请求服务器或修改你的账户。'}
                    </p>
                </div>
                <footer className="sb-dialog-footer">
                    <button className="sb-button" onClick={() => setSaveState('failed')}>
                        模拟失败
                    </button>
                    <button
                        className="sb-button sb-primary"
                        onClick={() => setSaveState(nickname.trim() ? 'saved' : 'failed')}
                    >
                        应用预览
                    </button>
                </footer>
            </dialog>
        </main>
    );
}

createRoot(document.getElementById('root')!).render(<StandardBoard />);
