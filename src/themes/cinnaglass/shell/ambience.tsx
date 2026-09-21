// Compact environment controls reuse navigation glass and keep weather state truthful.
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { IClock, ICloud, IDusk, IMapPin, IMoon, IRain, ISun } from '@/themes/cinnaglass/icons';
import type { Mood, WeatherTweak } from '@/themes/cinnaglass/tweaks';
import type { Weather } from '@/themes/cinnaglass/model';
import '@/themes/cinnaglass/shell/navigation-glass.css';
import '@/themes/cinnaglass/shell/ambience.css';

const TIMES = [
    { key: 'golden', label: '黄昏', Icon: ISun },
    { key: 'twilight', label: '暮色', Icon: IDusk },
    { key: 'night', label: '夜晚', Icon: IMoon }
] as const;
const WEATHER = [
    { key: 'auto', label: '实况', Icon: IMapPin },
    { key: 'sun', label: '晴', Icon: ISun },
    { key: 'rain', label: '雨', Icon: IRain }
] as const;
type Choice = { key: string; label: string; Icon: typeof ISun };

// One shared lens moves between choices, including during interrupted/reversed input.
function OrbTrack({
    choices,
    value,
    label,
    onChange
}: {
    choices: readonly Choice[];
    value: string;
    label: string;
    onChange: (value: string) => void;
}) {
    const slot = choices.findIndex((item) => item.key === value);
    const dragStart = useRef<number | null>(null);
    return (
        <div
            className="amb-track"
            role="radiogroup"
            aria-label={label}
            style={{ '--slot': slot } as CSSProperties}
            onKeyDown={(event) => {
                const delta = ['ArrowRight', 'ArrowDown'].includes(event.key)
                    ? 1
                    : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                      ? -1
                      : 0;
                if (!delta) return;
                event.preventDefault();
                const next =
                    slot < 0 ? (delta > 0 ? 0 : choices.length - 1) : (slot + delta + choices.length) % choices.length;
                onChange(choices[next].key);
                event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
            }}
            onPointerDown={(event) => {
                if (event.isPrimary && event.button === 0) dragStart.current = event.clientX;
            }}
            onPointerMove={(event) => {
                if (dragStart.current === null || Math.abs(event.clientX - dragStart.current) < 8) return;
                const track = event.currentTarget;
                track.setPointerCapture(event.pointerId);
                const x = event.clientX - track.getBoundingClientRect().left - 4;
                const next = Math.max(0, Math.min(choices.length - 1, Math.floor(x / 60)));
                if (choices[next].key !== value) onChange(choices[next].key);
            }}
            onPointerUp={() => {
                dragStart.current = null;
            }}
            onPointerLeave={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) dragStart.current = null;
            }}
            onPointerCancel={() => {
                dragStart.current = null;
            }}
        >
            <span className="amb-selection" hidden={slot < 0} aria-hidden="true" />
            {choices.map(({ key, label: name, Icon }, index) => (
                <button
                    type="button"
                    role="radio"
                    aria-checked={value === key}
                    aria-label={name}
                    tabIndex={value === key || (slot < 0 && index === 0) ? 0 : -1}
                    key={key}
                    className="amb-choice rail-btn"
                    onClick={() => onChange(key)}
                >
                    <Icon size={23} />
                    <span className="amb-tip" aria-hidden="true">
                        {name}
                    </span>
                </button>
            ))}
        </div>
    );
}

// The shell only changes controlled preferences; the existing weather hook owns location and requests.
export function Ambience({
    mood,
    setMood,
    wx,
    setWx,
    weather
}: {
    mood: Mood;
    setMood: (value: Mood) => void;
    wx: WeatherTweak;
    setWx: (value: WeatherTweak) => void;
    weather?: Weather;
}) {
    const [panel, setPanel] = useState<'time' | 'weather' | null>(null);
    const host = useRef<HTMLDivElement>(null);
    const origin = useRef<HTMLButtonElement | null>(null);
    const id = useId();
    const time = TIMES.find((item) => item.key === mood)!;
    // Older saved cloud/snow settings remain truthful until the user chooses a supported mode.
    const weatherChoice = WEATHER.find((item) => item.key === wx) ?? {
        key: wx,
        label: weather?.label ?? (wx === 'snow' ? '雪' : '多云'),
        Icon: ICloud
    };
    const weatherStatus =
        wx !== 'auto'
            ? weatherChoice.label
            : weather?.status === 'live'
              ? `${weather.label}${weather.temp == null ? '' : ` ${weather.temp}°`}`
              : weather?.status === 'unavailable'
                ? '实况不可用'
                : '定位中…';
    const weatherDescription =
        wx !== 'auto'
            ? `${weatherChoice.label}，手动天气，不使用当前位置`
            : weather?.status === 'live'
              ? `实况：${weatherStatus}，当前位置`
              : weather?.status === 'unavailable'
                ? '实况暂不可用，可选择晴或雨'
                : '正在获取当前位置的天气';
    useEffect(() => {
        if (!panel) return;
        const outside = (event: PointerEvent) => {
            if (event.target instanceof Node && !host.current?.contains(event.target)) setPanel(null);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || document.querySelector('dialog:modal')) return;
            event.preventDefault();
            event.stopPropagation();
            setPanel(null);
            origin.current?.focus();
        };
        window.addEventListener('pointerdown', outside);
        window.addEventListener('keydown', escape);
        return () => {
            window.removeEventListener('pointerdown', outside);
            window.removeEventListener('keydown', escape);
        };
    }, [panel]);
    return (
        <div
            className="amb-wrap"
            ref={host}
            onBlur={(event) => {
                if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget))
                    setPanel(null);
            }}
        >
            <div className="amb-dock ui-surface">
                {(['time', 'weather'] as const).map((category) => {
                    const Icon = category === 'time' ? IClock : ICloud;
                    const state = category === 'time' ? time : weatherChoice;
                    return (
                        <button
                            type="button"
                            key={category}
                            className={`amb-trigger rail-btn ${panel === category ? 'on' : ''}`}
                            aria-label={`${category === 'time' ? '时辰' : '天气'}：${state.label}`}
                            aria-describedby={category === 'weather' ? `${id}-status` : undefined}
                            aria-expanded={panel === category}
                            aria-controls={id}
                            onClick={(event) => {
                                origin.current = event.currentTarget;
                                setPanel((old) => (old === category ? null : category));
                            }}
                        >
                            <Icon size={26} />
                            <span className="amb-state" aria-hidden="true">
                                <state.Icon size={11} />
                            </span>
                            <span className="amb-tip" aria-hidden="true">
                                {category === 'time' ? `时辰 · ${state.label}` : `天气 · ${weatherStatus}`}
                            </span>
                        </button>
                    );
                })}
            </div>
            <section
                className="amb-panel ui-surface"
                hidden={!panel}
                id={id}
                aria-label={panel === 'time' ? '时辰选项' : '天气选项'}
            >
                <div className="ui-liner">
                    <div className="amb-caption">
                        <span>{panel === 'time' ? '时辰' : '天气'}</span>
                        <span>{panel === 'time' ? time.label : weatherStatus}</span>
                    </div>
                    {panel === 'time' ? (
                        <OrbTrack
                            key="time"
                            choices={TIMES}
                            value={mood}
                            label="时辰"
                            onChange={(v) => setMood(v as Mood)}
                        />
                    ) : (
                        <OrbTrack
                            key="weather"
                            choices={WEATHER}
                            value={wx}
                            label="天气"
                            onChange={(v) => setWx(v as WeatherTweak)}
                        />
                    )}
                </div>
            </section>
            <span className="amb-sr-only" id={`${id}-status`} role="status">
                {weatherDescription}
            </span>
        </div>
    );
}
