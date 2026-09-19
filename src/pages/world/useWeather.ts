// useWeather.ts — the weather reading the shell shows: either the fixed values
// behind a manual tweak, or the live forecast for the browser's location
// (geolocation → open-meteo). Split out of WorldPage (shell-structure-review.md
// §2.2 S1); WorldPage stays its only consumer and feeds the result to the room
// scene and the clock surface.
import { useEffect, useMemo, useState } from 'react';
import type { Weather, WeatherKind } from '@/themes/cinnaglass/model';
import type { WeatherTweak } from '@/themes/cinnaglass/tweaks';

// WMO weather code → kind + label
const mapWmo = (code: number): { kind: WeatherKind; label: string } => {
    if (code === 0) return { kind: 'sun', label: '晴' };
    if (code <= 3) return { kind: 'cloud', label: '多云' };
    if (code <= 48) return { kind: 'cloud', label: '雾' };
    if (code <= 67) return { kind: 'rain', label: '小雨' };
    if (code <= 77) return { kind: 'snow', label: '雪' };
    if (code <= 82) return { kind: 'rain', label: '阵雨' };
    if (code <= 86) return { kind: 'snow', label: '阵雪' };
    return { kind: 'rain', label: '雷雨' };
};
// Fixed readings for the manual weather tweak — no network, no geolocation.
const MANUAL_WX: Record<Exclude<WeatherTweak, 'auto'>, { kind: WeatherKind; label: string; temp: number }> = {
    sun: { kind: 'sun', label: '晴', temp: 26 },
    cloud: { kind: 'cloud', label: '多云', temp: 22 },
    rain: { kind: 'rain', label: '小雨', temp: 18 },
    snow: { kind: 'snow', label: '雪', temp: 1 }
};

// What 'auto' shows before (and instead of) a successful reading: geolocation
// missing, denied, slower than 7s, or a failed forecast request all land here.
const OVERCAST: Weather = { kind: 'cloud', label: '多云', temp: 22, place: '' };

// Current weather for `tweak`. A manual tweak is a pure lookup — no state, no
// network. 'auto' is the only case that needs an effect: it asks the browser
// for a position, then open-meteo for that position's current conditions.
export function useWeather(tweak: WeatherTweak): Weather {
    const [live, setLive] = useState<Weather>(OVERCAST);

    useEffect(() => {
        if (tweak !== 'auto') return; // manual tweaks resolve during render, below
        let cancel = false;
        const fallback = () => !cancel && setLive({ ...OVERCAST });
        if (!navigator.geolocation) {
            fallback();
            return;
        }
        const to = setTimeout(fallback, 7000);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: la, longitude: lo } = pos.coords;
                fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code`
                )
                    .then((r) => r.json())
                    .then((d) => {
                        if (cancel) return;
                        clearTimeout(to);
                        const c = d.current;
                        setLive({
                            ...mapWmo(c.weather_code),
                            temp: Math.round(c.temperature_2m),
                            place: '当前位置'
                        });
                    })
                    .catch(() => {
                        clearTimeout(to);
                        fallback();
                    });
            },
            () => {
                clearTimeout(to);
                fallback();
            },
            { timeout: 6500, maximumAge: 6e5 }
        );
        return () => {
            cancel = true;
            clearTimeout(to);
        };
    }, [tweak]);

    // memoised so the manual branch hands out one stable object per tweak
    return useMemo(() => (tweak === 'auto' ? live : { ...MANUAL_WX[tweak], place: '' }), [tweak, live]);
}
