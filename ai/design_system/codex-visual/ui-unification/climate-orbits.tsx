// Candidate controls only. Shared room/material assets remain production sources.
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { IClock, ICloud, IDusk, IMapPin, IMoon, IRain, ISun } from '@/themes/cinnaglass/icons';
import type { Mood, WeatherTweak } from '@/themes/cinnaglass/tweaks';
import './climate-orbits.css';

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
    const slot = Math.max(
        0,
        choices.findIndex((item) => item.key === value)
    );
    const dragStart = useRef<number | null>(null);
    return (
        <div
            className="orb-track"
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
                const next = (slot + delta + choices.length) % choices.length;
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
                onChange(choices[next].key);
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
            <span className="orb-selection" aria-hidden="true" />
            {choices.map(({ key, label: name, Icon }) => (
                <button
                    type="button"
                    role="radio"
                    aria-checked={value === key}
                    aria-label={name}
                    tabIndex={value === key ? 0 : -1}
                    key={key}
                    className="orb-choice rail-btn"
                    onClick={() => onChange(key)}
                >
                    <Icon size={23} />
                    <span className="orb-tip" aria-hidden="true">
                        {name}
                    </span>
                </button>
            ))}
        </div>
    );
}

export function ClimateOrbits({
    mode,
    mood,
    setMood,
    wx,
    setWx
}: {
    mode: 'orbits' | 'tracks';
    mood: Mood;
    setMood: (value: Mood) => void;
    wx: WeatherTweak;
    setWx: (value: WeatherTweak) => void;
}) {
    const [panel, setPanel] = useState<'time' | 'weather' | null>(null);
    const host = useRef<HTMLDivElement>(null);
    const origin = useRef<HTMLButtonElement | null>(null);
    const id = useId();
    const time = TIMES.find((item) => item.key === mood)!;
    const weather = WEATHER.find((item) => item.key === wx) ?? WEATHER[0];
    useEffect(() => {
        if (!panel) return;
        const outside = (event: PointerEvent) => {
            if (event.target instanceof Node && !host.current?.contains(event.target)) setPanel(null);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || document.querySelector('dialog:modal')) return;
            event.preventDefault();
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
    const timeTrack = (
        <OrbTrack key="time" choices={TIMES} value={mood} label="时辰" onChange={(v) => setMood(v as Mood)} />
    );
    const weatherTrack = (
        <OrbTrack key="weather" choices={WEATHER} value={wx} label="天气" onChange={(v) => setWx(v as WeatherTweak)} />
    );
    return (
        <div className={`climate-orbits ${mode}`} ref={host}>
            {mode === 'orbits' ? (
                <>
                    <div className="orb-dock ui-surface">
                        {(['time', 'weather'] as const).map((category) => {
                            const Icon = category === 'time' ? IClock : ICloud;
                            const state = category === 'time' ? time : weather;
                            return (
                                <button
                                    type="button"
                                    key={category}
                                    className={`orb-trigger rail-btn ${panel === category ? 'on' : ''}`}
                                    aria-label={`${category === 'time' ? '时辰' : '天气'}：${state.label}`}
                                    aria-expanded={panel === category}
                                    aria-controls={id}
                                    onClick={(event) => {
                                        origin.current = event.currentTarget;
                                        setPanel((old) => (old === category ? null : category));
                                    }}
                                >
                                    <Icon size={26} />
                                    <span className="orb-state" aria-hidden="true">
                                        <state.Icon size={11} />
                                    </span>
                                    <span className="orb-tip" aria-hidden="true">
                                        {category === 'time' ? '时辰' : '天气'} · {state.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <section className="orb-panel ui-surface" hidden={!panel} id={id} aria-label="环境选择">
                        <div className="ui-liner">
                            <div className="orb-caption">
                                <span>{panel === 'time' ? '时辰' : '天气'}</span>
                                <span>{panel === 'time' ? time.label : weather.label}</span>
                            </div>
                            {panel === 'time' ? timeTrack : weatherTrack}
                        </div>
                    </section>
                </>
            ) : (
                <section className="orb-direct ui-surface" aria-label="环境直达">
                    <div className="ui-liner">
                        <div className="orb-row">
                            <span className="orb-category" aria-hidden="true">
                                <IClock size={18} />
                                <small>时辰</small>
                            </span>
                            {timeTrack}
                        </div>
                        <div className="orb-row">
                            <span className="orb-category" aria-hidden="true">
                                <ICloud size={18} />
                                <small>天气</small>
                            </span>
                            {weatherTrack}
                        </div>
                    </div>
                </section>
            )}
            <span className="sr-only" role="status">
                {time.label}，{weather.label}；天气为离线演示
            </span>
        </div>
    );
}
