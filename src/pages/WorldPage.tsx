// WorldPage.tsx — root orchestration for the cinnaglass "Our World" UI.
// Ported from the design prototype's app.jsx: live clock, real weather,
// tweaks, navigation, and all shared state (profile, rooms, current room,
// events, alarms, widgets) + localStorage persistence.
import { useEffect, useState } from 'react';
import { RoomScene } from '@/themes/cinnaglass/scene';
import { LobbyScene, type LobbyStatus } from '@/themes/cinnaglass/lobby';
import { HUD } from '@/themes/cinnaglass/hud';
import { SubScreen, type TabKey } from '@/themes/cinnaglass/screens';
import { CalendarScreen, ClockScreen } from '@/themes/cinnaglass/calendar';
import { SettingsScreen } from '@/themes/cinnaglass/settings';
import { PROFILE_DEFAULT, gload } from '@/themes/cinnaglass/profile';
import { Sidebar } from '@/themes/cinnaglass/sidebar';
import { SpaceScreen } from '@/themes/cinnaglass/space';
import { ChatDock } from '@/themes/cinnaglass/chat-dock';
import { ChannelScreen } from '@/themes/cinnaglass/channel-screen';
import { useChatThreads } from '@/themes/cinnaglass/chat-data';
import { ROOMS_DEFAULT, owLoad } from '@/themes/cinnaglass/rooms';
import { useTweaks, type Mood } from '@/themes/cinnaglass/tweaks';
import type { Alarm, CalEvent, Room, Weather, Widgets } from '@/themes/cinnaglass/model';
import { getMyWorld, createWorld } from '@/lib/worlds.ts';
import type { World } from '@/types/feed.ts';
import { getEnvFlag } from '@/utils';

// Entry switch (see .env.example). AUTO_ENTER skips the lobby on mount when
// a world already exists (dev convenience — players always land in the lobby
// and enter through the portal). Defaults to false when unset.
// VITE_DEV (dev auto-login with a real session) lives in ProtectedRoute —
// by the time this page renders, a session always exists.
const AUTO_ENTER = getEnvFlag('VITE_AUTO_ENTER');

// addon widgets are removable; required stay on always
const REQUIRED = ['days', 'minimap'];
const ADDON = ['memory', 'anniv', 'ambient', 'music', 'lighting'];
const loadWidgets = (): Widgets => {
    const base: Widgets = {};
    REQUIRED.forEach((k) => (base[k] = true));
    ADDON.forEach((k) => (base[k] = true));
    try {
        return { ...base, ...JSON.parse(localStorage.getItem('ow-widgets-v1') || '{}') };
    } catch {
        return base;
    }
};

// WMO weather code → kind + label
const mapWmo = (code: number): { kind: string; label: string } => {
    if (code === 0) return { kind: 'sun', label: '晴' };
    if (code <= 3) return { kind: 'cloud', label: '多云' };
    if (code <= 48) return { kind: 'cloud', label: '雾' };
    if (code <= 67) return { kind: 'rain', label: '小雨' };
    if (code <= 77) return { kind: 'snow', label: '雪' };
    if (code <= 82) return { kind: 'rain', label: '阵雨' };
    if (code <= 86) return { kind: 'snow', label: '阵雪' };
    return { kind: 'rain', label: '雷雨' };
};
const MANUAL_WX: Record<string, { kind: string; label: string; temp: number }> = {
    sun: { kind: 'sun', label: '晴', temp: 26 },
    cloud: { kind: 'cloud', label: '多云', temp: 22 },
    rain: { kind: 'rain', label: '小雨', temp: 18 },
    snow: { kind: 'snow', label: '雪', temp: 1 }
};

const futureDate = (addDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const SEED_EVENTS: CalEvent[] = [
    { id: 'ev-seed1', date: futureDate(3), title: '看那部期待很久的电影 🎬' },
    { id: 'ev-seed2', date: futureDate(9), title: '去新开的那家面包店 🥐' }
];
const SEED_ALARMS: Alarm[] = [
    { id: 'al1', time: '07:30', label: '早安，一起醒来', on: true },
    { id: 'al2', time: '22:30', label: '晚安，说句悄悄话', on: true }
];

const MODAL_TABS: TabKey[] = ['timeline', 'photos', 'notes', 'wishlist'];

const WorldPage = () => {
    const [t, setTweak] = useTweaks();
    const [tbOpen, setTbOpen] = useState(false);
    // sidebar panel expanded state — persisted (the rail itself is always on)
    const [sbOpen, setSbOpen] = useState<boolean>(() => owLoad('ow-sbopen-v1', true));
    // chat (see ai/Features/chat.md): one thread store, two surfaces, two
    // owners — the sidebar only opens the covering conversation window
    // (channels + DMs); the dock is stage-owned (chat button / Enter only).
    const { threads, typingId, send } = useChatThreads();
    const [dockSolid, setDockSolid] = useState(false);
    const [dockActive, setDockActive] = useState('ch-chat');
    const [convOpen, setConvOpen] = useState<string | null>(null);
    const [screen, setScreen] = useState<string | null>(null);
    const [profile, setProfile] = useState(() => gload('ow-profile-v1', PROFILE_DEFAULT));
    // rooms (living/bedroom …) — scene-bound voice channels inside the world
    // (channel.md); listed in the sidebar and the map module, both switching
    // the scene via enterSpace. Config editing returns with the map feature.
    const [rooms] = useState<Room[]>(() => owLoad('ow-rooms-v1', ROOMS_DEFAULT));
    const [meRoom, setMeRoom] = useState<string>(() => owLoad('ow-meroom-v1', 'living'));
    const [widgets, setWidgets] = useState<Widgets>(loadWidgets);
    const [nowTs, setNowTs] = useState(() => Date.now());
    const [weather, setWeather] = useState<Weather>({ kind: 'cloud', label: '多云', temp: 22, place: '' });
    const [events, setEvents] = useState<CalEvent[]>(() => owLoad('ow-dates-v1', SEED_EVENTS));
    const [alarms, setAlarms] = useState<Alarm[]>(() => owLoad('ow-alarms-v1', SEED_ALARMS));

    // World state (DB `worlds` row — the couple's shared space, see
    // channel.md). NOT the in-world scene rooms mock above (living/bedroom
    // lighting + navigation, local).
    const [world, setWorld] = useState<World | null>(null);
    const [lobbyStatus, setLobbyStatus] = useState<LobbyStatus>('loading');
    const [lobbyError, setLobbyError] = useState<string | null>(null);
    const [lobbyBusy, setLobbyBusy] = useState(false);
    // Entering the world is explicit (portal click) unless AUTO_ENTER is on.
    const [entered, setEntered] = useState(false);
    const [lobbyTick, setLobbyTick] = useState(0);

    useEffect(() => {
        let cancelled = false;
        getMyWorld()
            .then(({ world }) => {
                if (cancelled) return;
                setWorld(world);
                setLobbyStatus('ready');
                if (AUTO_ENTER && world) setEntered(true);
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setLobbyError(e instanceof Error ? e.message : String(e));
                setLobbyStatus('error');
            });
        return () => {
            cancelled = true;
        };
    }, [lobbyTick]);

    // live clock
    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    // WoW-style: bare Enter (no input focused) solidifies the chat dock.
    // Layer gate (chat.md): while any UI-layer surface is open (conversation
    // window, modal screens) ALL scene shortcuts are disabled — Enter today,
    // movement/interaction keys later.
    useEffect(() => {
        if (convOpen || screen) return; // UI layer open — scene shortcuts off
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            const el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
            setDockSolid(true);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [convOpen, screen]);
    useEffect(() => {
        try {
            localStorage.setItem('ow-dates-v1', JSON.stringify(events));
        } catch {
            /* ignore */
        }
    }, [events]);
    useEffect(() => {
        try {
            localStorage.setItem('ow-alarms-v1', JSON.stringify(alarms));
        } catch {
            /* ignore */
        }
    }, [alarms]);
    useEffect(() => {
        try {
            localStorage.setItem('ow-profile-v1', JSON.stringify(profile));
        } catch {
            /* ignore */
        }
    }, [profile]);
    useEffect(() => {
        try {
            localStorage.setItem('ow-rooms-v1', JSON.stringify(rooms));
        } catch {
            /* ignore */
        }
    }, [rooms]);
    useEffect(() => {
        try {
            localStorage.setItem('ow-meroom-v1', JSON.stringify(meRoom));
        } catch {
            /* ignore */
        }
    }, [meRoom]);
    useEffect(() => {
        try {
            localStorage.setItem('ow-sbopen-v1', JSON.stringify(sbOpen));
        } catch {
            /* ignore */
        }
    }, [sbOpen]);

    // weather: manual override OR real-time (geolocation → open-meteo)
    useEffect(() => {
        if (t.weather !== 'auto') {
            // Manual tweak forces a fixed kind; auto path resolves async below.
            setWeather({ ...MANUAL_WX[t.weather], place: '' });
            return;
        }
        let cancel = false;
        const fallback = () => !cancel && setWeather({ kind: 'cloud', label: '多云', temp: 22, place: '' });
        if (!navigator.geolocation) {
            fallback();
            return;
        }
        const to = setTimeout(fallback, 7000);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: la, longitude: lo } = pos.coords;
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code`)
                    .then((r) => r.json())
                    .then((d) => {
                        if (cancel) return;
                        clearTimeout(to);
                        const c = d.current;
                        setWeather({ ...mapWmo(c.weather_code), temp: Math.round(c.temperature_2m), place: '当前位置' });
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
    }, [t.weather]);

    const setWidget = (k: string, v: boolean) => {
        if (REQUIRED.includes(k)) return; // required widgets can't be removed
        setWidgets((w) => {
            const next = { ...w, [k]: v };
            try {
                localStorage.setItem('ow-widgets-v1', JSON.stringify(next));
            } catch {
                /* ignore */
            }
            return next;
        });
    };
    const navigate = (k: string) => {
        setScreen(k);
        setTbOpen(false);
    };
    const enterSpace = (r: Room) => {
        setMeRoom(r.id);
        if (r.mood) setTweak('mood', r.mood as Mood);
    };
    const curRoom = rooms.find((r) => r.id === meRoom) || rooms[0];

    // Lobby → world flow. retryLobby resets in the event handler (not the
    // effect body) and bumps the tick so the effect refetches.
    const retryLobby = () => {
        setLobbyStatus('loading');
        setLobbyError(null);
        setLobbyTick((t) => t + 1);
    };
    const enterWorld = () => {
        if (world) setEntered(true);
        else retryLobby(); // a world may have appeared elsewhere — re-check
    };
    const createAndEnter = async () => {
        setLobbyBusy(true);
        setLobbyError(null);
        try {
            const created = await createWorld();
            setWorld(created);
            setEntered(true);
        } catch (e) {
            setLobbyError(e instanceof Error ? e.message : String(e));
        } finally {
            setLobbyBusy(false);
        }
    };
    const inWorld = entered && world !== null;

    // any pointer-down on the stage outside the chat surfaces ghosts the dock
    const onStageDown = (e: React.PointerEvent) => {
        if (!dockSolid) return;
        const el = e.target as HTMLElement;
        if (el.closest('.cdk') || el.closest('.chsc')) return;
        setDockSolid(false);
    };

    return (
        <div className="app" data-glass={t.glassStyle} data-mood={t.mood} style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {/* sidebar shares the layout layer with the stage: opening it
                squeezes the scene right instead of floating over it */}
            <Sidebar
                open={sbOpen}
                setOpen={setSbOpen}
                profile={profile}
                setProfile={setProfile}
                onOpenSettings={() => navigate('settings')}
                world={world}
                lobbyStatus={lobbyStatus}
                lobbyError={lobbyError}
                busy={lobbyBusy}
                inWorld={inWorld}
                onEnterWorld={enterWorld}
                onCreateWorld={createAndEnter}
                onOpenConv={(id) => setConvOpen(id)}
                rooms={rooms}
                meRoom={meRoom}
                onEnterSpace={enterSpace}
            />
            <div className="stage" onPointerDownCapture={onStageDown}>
                {inWorld ? (
                    <RoomScene weather={weather.kind} />
                ) : (
                    <LobbyScene
                        status={lobbyStatus}
                        hasWorld={world !== null}
                        error={lobbyError}
                        busy={lobbyBusy}
                        onEnter={enterWorld}
                        onCreate={createAndEnter}
                    />
                )}
                {inWorld && (
                    <HUD
                        layout={t.hudLayout}
                        mood={t.mood}
                        density={t.density}
                        weather={weather}
                        nowTs={nowTs}
                        widgets={widgets}
                        setWidget={setWidget}
                        tbOpen={tbOpen}
                        setTbOpen={setTbOpen}
                        setMood={(k) => setTweak('mood', k)}
                        onNavigate={navigate}
                        spaceName={curRoom ? curRoom.name : ''}
                    />
                )}
                <SpaceScreen open={screen === 'space'} onClose={() => setScreen(null)} rooms={rooms} meRoom={meRoom} enterSpace={enterSpace} profile={profile} />
                <SubScreen screen={MODAL_TABS.includes(screen as TabKey) ? (screen as TabKey) : null} onClose={() => setScreen(null)} />
                <CalendarScreen open={screen === 'calendar'} onClose={() => setScreen(null)} events={events} setEvents={setEvents} />
                <ClockScreen open={screen === 'clock'} onClose={() => setScreen(null)} nowTs={nowTs} weather={weather} alarms={alarms} setAlarms={setAlarms} />
                <SettingsScreen open={screen === 'settings'} onClose={() => setScreen(null)} t={t} setTweak={setTweak} profile={profile} setP={setProfile} />
                {/* in-scene ambient chat (WoW-style) — follows the stage when squeezed */}
                <ChatDock
                    solid={dockSolid}
                    setSolid={setDockSolid}
                    active={dockActive}
                    setActive={setDockActive}
                    threads={threads}
                    typingId={typingId}
                    onSend={send}
                />
                {/* covering conversation window — the sidebar's only chat
                    trigger (text channels AND DMs) */}
                <ChannelScreen convId={convOpen} onClose={() => setConvOpen(null)} threads={threads} typingId={typingId} onSend={send} />
            </div>
        </div>
    );
};

export default WorldPage;