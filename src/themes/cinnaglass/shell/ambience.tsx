// Compact scene controls share navigation glass, with explicit weather source/status.
import { useEffect, useId, useRef, useState } from 'react';
import { IChevron, IClock, ICloud, IDusk, IMoon, IRain, ISun } from '@/themes/cinnaglass/icons';
import type { Mood, WeatherTweak } from '@/themes/cinnaglass/tweaks';
import type { Weather } from '@/themes/cinnaglass/model';
import '@/themes/cinnaglass/shell/navigation-glass.css';
import '@/themes/cinnaglass/shell/ambience.css';

type AmbienceProps = {
    mood: Mood;
    setMood: (value: Mood) => void;
    wx: WeatherTweak;
    setWx: (value: WeatherTweak) => void;
    weather?: Weather;
};
// Only the weather modes the room supports are offered as manual choices.
const MOODS = [
    { k: 'golden', label: '黄昏', Icon: ISun },
    { k: 'twilight', label: '暮色', Icon: IDusk },
    { k: 'night', label: '夜晚', Icon: IMoon }
] as const;
const WXS = [
    { k: 'auto', label: '实况', Icon: ICloud },
    { k: 'sun', label: '晴', Icon: ISun },
    { k: 'rain', label: '雨', Icon: IRain }
] as const;

// The trigger stays mounted so keyboard dismissal can restore focus without remounting it.
export function Ambience({ mood, setMood, wx, setWx, weather }: AmbienceProps) {
    const [panel, setPanel] = useState<'time' | 'weather' | null>(null);
    const host = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const panelId = useId();
    const timeLabel = MOODS.find((item) => item.k === mood)?.label;
    const weatherLabel = WXS.find((item) => item.k === wx)?.label ?? weather?.label ?? '实况';
    useEffect(() => {
        if (!panel) return;
        const pointer = (event: PointerEvent) => {
            if (event.target instanceof Node && !host.current?.contains(event.target)) setPanel(null);
        };
        const key = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || document.querySelector('dialog:modal')) return;
            event.preventDefault();
            event.stopPropagation();
            setPanel(null);
            trigger.current?.focus();
        };
        window.addEventListener('pointerdown', pointer);
        window.addEventListener('keydown', key);
        return () => {
            window.removeEventListener('pointerdown', pointer);
            window.removeEventListener('keydown', key);
        };
    }, [panel]);
    const status =
        wx !== 'auto'
            ? '手动天气 · 不使用当前位置'
            : weather?.status === 'live'
              ? `${weather.label} ${weather.temp ?? '—'}° · 当前位置`
              : weather?.status === 'unavailable'
                ? '实况暂不可用，可选择晴或雨'
                : '正在获取当前位置的天气…';
    return (
        <div className="amb-wrap" ref={host}>
            <div className="amb-pill ui-surface">
                {(['time', 'weather'] as const).map((category, index) => {
                    const Icon = category === 'time' ? IClock : ICloud;
                    return (
                        <div className="amb-entry" key={category}>
                            {index > 0 && <span className="amb-div" aria-hidden="true" />}
                            <button
                                type="button"
                                className={`amb-trigger rail-btn ${panel === category ? 'on' : ''}`}
                                aria-expanded={panel === category}
                                aria-controls={panelId}
                                onClick={(event) => {
                                    trigger.current = event.currentTarget;
                                    setPanel((current) => (current === category ? null : category));
                                }}
                            >
                                <Icon size={22} />
                                <span>
                                    <b>{category === 'time' ? '时辰' : '天气'}</b>
                                    <small>{category === 'time' ? timeLabel : weatherLabel}</small>
                                </span>
                                <IChevron size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>
            {panel && (
                <section
                    id={panelId}
                    className="amb-panel ui-surface"
                    aria-label={panel === 'time' ? '时辰选项' : '天气选项'}
                >
                    <div className="amb-options ui-liner">
                        <h2>{panel === 'time' ? '时辰' : '天气'}</h2>
                        <p>{panel === 'time' ? '改变画面的光线与色温' : '选择窗外的天气'}</p>
                        <div className="amb-row">
                            {panel === 'time'
                                ? MOODS.map(({ k, label, Icon }) => (
                                      <button
                                          type="button"
                                          className="ui-button"
                                          key={k}
                                          aria-pressed={mood === k}
                                          onClick={() => setMood(k)}
                                      >
                                          <Icon size={22} />
                                          {label}
                                      </button>
                                  ))
                                : WXS.map(({ k, label, Icon }) => (
                                      <button
                                          type="button"
                                          className="ui-button"
                                          key={k}
                                          aria-pressed={wx === k}
                                          onClick={() => setWx(k)}
                                      >
                                          <Icon size={22} />
                                          {label}
                                      </button>
                                  ))}
                        </div>
                        {panel === 'weather' && (
                            <p className="amb-status" role="status">
                                {status}
                            </p>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
