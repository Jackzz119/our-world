// Review-only controls: real adopted surfaces over existing art, with isolated demo content.
import { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Rail } from '@/themes/cinnaglass/shell/rail';
import { ClimateOrbits } from './climate-orbits';
import { SunlitLetter } from '@/themes/cinnaglass/shell/sunlit-letter';
import { Ambience } from '@/themes/cinnaglass/shell/ambience';
import { ChatCard } from '@/themes/cinnaglass/shell/chat-card';
import { MusicMini } from '@/themes/cinnaglass/shell/floaters';
import { TaskDialog } from '@/themes/cinnaglass/ui/task-dialog';
import { useCompactUi, useUiEnvironment } from '@/themes/cinnaglass/ui/use-ui-environment';
import { IClock, ICloud, IChevron, IDusk, IMoon, IRain, ISun } from '@/themes/cinnaglass/icons';
import type { Mood, WeatherTweak } from '@/themes/cinnaglass/tweaks';
import type { Channel } from '@/types/chat';
import type { Msg } from '@/themes/cinnaglass/chat/chat-data';
import '@/index.css';
import '@/themes/cinnaglass/cinnaglass.css';
import '@/themes/cinnaglass/ui/ui-system.css';
import '@/themes/cinnaglass/shell/shell-layout.css';
import './climate-controls.css';

const times = [
    { key: 'golden', name: '黄昏', Icon: ISun },
    { key: 'twilight', name: '暮色', Icon: IDusk },
    { key: 'night', name: '夜晚', Icon: IMoon }
] as const;
const weathers = [
    { key: 'auto', name: '实况', Icon: ICloud },
    { key: 'sun', name: '晴', Icon: ISun },
    { key: 'rain', name: '雨', Icon: IRain }
] as const;
const channels: Channel[] = [
    {
        id: 'preview',
        name: '悄悄话',
        type: 'text',
        position: 0,
        world_id: 'demo',
        topic: null,
        scene_id: null,
        dm_user_a: null,
        dm_user_b: null
    }
];
const noop = () => {};

type ClimateProps = {
    mood: Mood;
    setMood: (mood: Mood) => void;
    wx: WeatherTweak;
    setWx: (wx: WeatherTweak) => void;
    combined: boolean;
};
// Category labels remain visible; state glyphs are only used inside labelled option rows.
export function ClimateControls({ mood, setMood, wx, setWx, combined }: ClimateProps) {
    const [panel, setPanel] = useState<'time' | 'weather' | 'both' | null>(null);
    const host = useRef<HTMLDivElement>(null);
    const origin = useRef<HTMLButtonElement | null>(null);
    const id = useId();
    const timeLabel = times.find((t) => t.key === mood)!.name;
    const weatherLabel = weathers.find((w) => w.key === wx)?.name ?? '实况';
    useEffect(() => {
        if (!panel) return;
        const outside = (e: PointerEvent) => {
            if (!host.current?.contains(e.target as Node)) setPanel(null);
        };
        const escape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !document.querySelector('dialog:modal')) {
                e.preventDefault();
                setPanel(null);
                origin.current?.focus();
            }
        };
        window.addEventListener('pointerdown', outside);
        window.addEventListener('keydown', escape);
        return () => {
            window.removeEventListener('pointerdown', outside);
            window.removeEventListener('keydown', escape);
        };
    }, [panel]);
    const toggle = (value: 'time' | 'weather' | 'both', button: HTMLButtonElement) => {
        origin.current = button;
        setPanel((old) => (old === value ? null : value));
    };
    return (
        <div className="climate-control" ref={host}>
            <div className="climate-bar ui-surface">
                {combined ? (
                    <button
                        className={`climate-trigger rail-btn ${panel ? 'on' : ''}`}
                        aria-expanded={!!panel}
                        aria-controls={id}
                        onClick={(e) => toggle('both', e.currentTarget)}
                    >
                        <IClock size={22} />
                        <span>
                            <b>环境</b>
                            <small>
                                {timeLabel} · {weatherLabel}
                            </small>
                        </span>
                        <IChevron size={12} />
                    </button>
                ) : (
                    <>
                        <button
                            className={`climate-trigger rail-btn ${panel === 'time' ? 'on' : ''}`}
                            aria-expanded={panel === 'time'}
                            aria-controls={id}
                            onClick={(e) => toggle('time', e.currentTarget)}
                        >
                            <IClock size={22} />
                            <span>
                                <b>时辰</b>
                                <small>{timeLabel}</small>
                            </span>
                            <IChevron size={12} />
                        </button>
                        <span className="climate-divider" />
                        <button
                            className={`climate-trigger rail-btn ${panel === 'weather' ? 'on' : ''}`}
                            aria-expanded={panel === 'weather'}
                            aria-controls={id}
                            onClick={(e) => toggle('weather', e.currentTarget)}
                        >
                            <ICloud size={22} />
                            <span>
                                <b>天气</b>
                                <small>{weatherLabel}</small>
                            </span>
                            <IChevron size={12} />
                        </button>
                    </>
                )}
            </div>
            {panel && (
                <section className="climate-panel ui-surface" id={id} aria-label="环境选项">
                    <div className="ui-liner">
                        {panel !== 'weather' && (
                            <>
                                <h2>时辰</h2>
                                <p>改变画面的光线与色温</p>
                                <div className="climate-options">
                                    {times.map(({ key, name, Icon }) => (
                                        <button
                                            className="ui-button"
                                            key={key}
                                            aria-pressed={mood === key}
                                            onClick={() => setMood(key)}
                                        >
                                            <Icon size={22} />
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {panel !== 'time' && (
                            <>
                                <h2>天气</h2>
                                <p>选择窗外的天气</p>
                                <div className="climate-options">
                                    {weathers.map(({ key, name, Icon }) => (
                                        <button
                                            className="ui-button"
                                            key={key}
                                            aria-pressed={wx === key}
                                            onClick={() => setWx(key)}
                                        >
                                            <Icon size={22} />
                                            {name}
                                        </button>
                                    ))}
                                </div>
                                <small>演示选择，不请求定位或天气服务</small>
                            </>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}

export function ClimateReview() {
    const [mood, setMood] = useState<Mood>('night');
    const [wx, setWx] = useState<WeatherTweak>('sun');
    const [scene, setScene] = useState('study');
    const [variant, setVariant] = useState('orbits');
    const [chat, setChat] = useState(false);
    const [tools, setTools] = useState(true);
    const [music, setMusic] = useState(false);
    const [settings, setSettings] = useState(false);
    const [task, setTask] = useState<'material' | 'chat'>('material');
    const [letter, setLetter] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([
        {
            id: 'demo',
            from: 'them',
            text: '温室里的花开了，给你留了一封信。',
            time: '18:24',
            ts: '2026-09-20T18:24:00Z',
            authorId: 'demo',
            kind: 'text'
        }
    ]);
    const compact = useCompactUi();
    const ref = useUiEnvironment(mood, true);
    const toggleChat = () => {
        setChat(!chat);
        if (!chat && compact) setMusic(false);
    };
    const toggleMusic = () => {
        setMusic(!music);
        if (!music && compact) setChat(false);
    };
    return (
        <>
            {tools && (
                <header className="review-toolbar">
                    <div>
                        <strong>环境圆钮 · 两版比稿</strong>
                        <p>A 已接正式组件；B 与文字入口保留历史对照。天气为离线演示。</p>
                    </div>
                    <div className="review-options">
                        <label>
                            背景
                            <select value={scene} onChange={(e) => setScene(e.target.value)}>
                                <option value="garden">植物园</option>
                                <option value="study">书房</option>
                            </select>
                        </label>
                        <label>
                            入口方案
                            <select value={variant} onChange={(e) => setVariant(e.target.value)}>
                                <option value="orbits">A · 双圆收纳（已采用）</option>
                                <option value="tracks">B · 双轨直达</option>
                                <option value="split">文字双入口 · 历史</option>
                                <option value="combined">合并入口 · 历史</option>
                            </select>
                        </label>
                        <label>
                            材质时辰
                            <select value={mood} onChange={(e) => setMood(e.target.value as Mood)}>
                                {times.map((t) => (
                                    <option key={t.key} value={t.key}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="letter-switch">
                            <input type="checkbox" checked={letter} onChange={(e) => setLetter(e.target.checked)} />
                            金亮信纸示意
                        </label>
                        <button type="button" className="review-hide" onClick={() => setTools(false)}>
                            只看场景
                        </button>
                    </div>
                </header>
            )}
            {!tools && (
                <button type="button" className="review-reopen" onClick={() => setTools(true)}>
                    比稿选项
                </button>
            )}
            <div
                ref={ref}
                className={`app ui-environment climate-review ${tools ? '' : 'review-immersive'}`}
                data-control={variant}
                data-mood={mood}
                data-chat-open={chat}
                data-music-open={music}
                data-letter-visible={letter}
                style={{
                    backgroundImage: `url(${scene === 'garden' ? '/arts/rooms/thumbs/garden.png' : `/rooms/study/${mood}.png`})`
                }}
            >
                <Rail
                    unread={letter}
                    activeRoom={scene}
                    onRoom={noop}
                    onLeaveWorld={noop}
                    chatOpen={chat}
                    musicOpen={music}
                    widgets={{}}
                    setWidget={noop}
                    onAction={(key) => {
                        if (key === 'chat') toggleChat();
                        else if (key === 'music') toggleMusic();
                        else if (key === 'settings') {
                            setTask('material');
                            setSettings(true);
                        }
                    }}
                />
                {variant === 'tracks' ? (
                    <ClimateOrbits key={variant} mode={variant} mood={mood} setMood={setMood} wx={wx} setWx={setWx} />
                ) : variant === 'orbits' ? (
                    <Ambience
                        mood={mood}
                        setMood={setMood}
                        wx={wx}
                        setWx={setWx}
                        weather={{ kind: 'sun', label: '实况暂不可用', temp: null, place: '', status: 'unavailable' }}
                    />
                ) : (
                    <ClimateControls
                        key={variant}
                        mood={mood}
                        setMood={setMood}
                        wx={wx}
                        setWx={setWx}
                        combined={variant === 'combined'}
                    />
                )}
                <ChatCard
                    open={chat}
                    onClose={() => setChat(false)}
                    onExpand={() => {
                        setTask('chat');
                        setSettings(true);
                    }}
                    inWorld
                    channels={channels}
                    dmConvs={[]}
                    threads={{ preview: messages }}
                    onSend={(_, text) =>
                        setMessages((m) => [
                            ...m,
                            {
                                id: String(Date.now()),
                                from: 'me',
                                text,
                                time: '18:25',
                                kind: 'text',
                                authorId: 'demo-me',
                                ts: new Date().toISOString()
                            }
                        ])
                    }
                    onSeen={noop}
                />
                <MusicMini
                    open={music}
                    setOpen={(value) => {
                        setMusic(value);
                        if (value && compact) setChat(false);
                    }}
                    spaceName="温室听雨"
                />
                <SunlitLetter
                    mood={mood}
                    visible={letter}
                    onOpen={() => {
                        setLetter(false);
                        setChat(true);
                        if (compact) setMusic(false);
                    }}
                />
                {tools && (
                    <aside className="review-caption">
                        {scene === 'garden'
                            ? '植物园原图固定；切换时辰仅检验 UI 配色，不生成植物园光照。'
                            : '书房时辰底图与 UI 配色同步。'}
                        <br />
                        聊天与音乐可反复点击导航开关；设置展示真实公共弹窗材质。
                    </aside>
                )}
                <TaskDialog
                    open={settings}
                    onClose={() => setSettings(false)}
                    title={task === 'material' ? '材质兼容预览' : '聊天 · 演示'}
                    description="真实公共任务壳 · 演示内容"
                >
                    {task === 'chat' ? (
                        <>
                            {messages.map((m) => (
                                <p key={m.id}>{m.text}</p>
                            ))}
                            <small>本页演示消息，正式完整聊天请在项目中体验。</small>
                        </>
                    ) : (
                        <>
                            <h3>暗部里，也能清楚阅读</h3>
                            <p>外壳透出植物园的紫蓝、橙金和深绿；正文保留当前不透明阅读内衬。</p>
                            <label>
                                我的称呼
                                <input className="ui-field" defaultValue="小蓝" />
                            </label>
                            <p>这是配色与操作样板，不修改账号或世界资料。</p>
                        </>
                    )}
                </TaskDialog>
            </div>
        </>
    );
}
createRoot(document.getElementById('root')!).render(<ClimateReview />);
