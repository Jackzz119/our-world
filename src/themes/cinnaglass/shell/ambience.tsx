// Compact scene controls share navigation glass, with explicit weather source/status.
import { useEffect, useId, useRef, useState } from 'react';
import { IChevron, ICloud, IDusk, IMoon, IRain, ISun } from '@/themes/cinnaglass/icons';
import type { Mood, WeatherTweak } from '@/themes/cinnaglass/tweaks';
import type { Weather } from '@/themes/cinnaglass/model';
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
    const [open, setOpen] = useState(false);
    const host = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const panelId = useId();
    const MoodIcon = MOODS.find((item) => item.k === mood)?.Icon ?? IDusk;
    const WxIcon = WXS.find((item) => item.k === wx)?.Icon ?? ICloud;
    useEffect(() => {
        if (!open) return;
        const pointer = (event: PointerEvent) => {
            if (event.target instanceof Node && !host.current?.contains(event.target)) setOpen(false);
        };
        const key = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || document.querySelector('dialog:modal')) return;
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
        };
        window.addEventListener('pointerdown', pointer);
        window.addEventListener('keydown', key);
        return () => {
            window.removeEventListener('pointerdown', pointer);
            window.removeEventListener('keydown', key);
        };
    }, [open]);
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
            <button
                ref={trigger}
                type="button"
                className="amb-pill ui-surface"
                aria-label="灯光与天气"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((value) => !value)}
            >
                <MoodIcon size={18} />
                <span className="amb-div" />
                <WxIcon size={18} />
                <IChevron size={12} />
            </button>
            {open && (
                <section id={panelId} className="amb-panel ui-surface" aria-label="灯光与天气选项">
                    <div className="amb-options ui-liner">
                        <p>光线时段</p>
                        <div className="amb-row">
                            {MOODS.map(({ k, label, Icon }) => (
                                <button type="button" key={k} aria-pressed={mood === k} onClick={() => setMood(k)}>
                                    <Icon size={20} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                        <p>窗外天气</p>
                        <div className="amb-row">
                            {WXS.map(({ k, label, Icon }) => (
                                <button type="button" key={k} aria-pressed={wx === k} onClick={() => setWx(k)}>
                                    <Icon size={20} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                        <p className="amb-status" role="status">
                            {status}
                        </p>
                    </div>
                </section>
            )}
        </div>
    );
}
